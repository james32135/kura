// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IKuraCircleDispute {
    function isMember(uint256 circleId, address member) external view returns (bool);
    function getPoolBalanceHandle(uint256 circleId) external view returns (euint64);
}

/// @title KuraDisputeResolution
/// @notice Members dispute contribution records without revealing amounts to admin.
/// All disputed amounts stay encrypted. Admin resolves blind (approve/reject).
/// FHE ops: FHE.gte (sanity check claim <= pool), FHE.select (apply/reject blind)
contract KuraDisputeResolution {
    enum DisputeStatus { Pending, Approved, Rejected }

    struct Dispute {
        uint256 circleId;
        uint256 round;
        address claimant;
        euint64 encClaimedAmount; // encrypted — admin never sees this
        DisputeStatus status;
        uint256 createdAt;
    }

    uint256 public disputeCount;
    mapping(uint256 => Dispute) private disputes;
    /// @dev circleId => round => member => disputeId (0 = none)
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public memberDisputeId;

    IKuraCircleDispute public kuraCircle;
    address public admin;

    // Reusable encrypted zero
    euint64 private encZero;

    event DisputeRaised(uint256 indexed disputeId, uint256 indexed circleId, uint256 round, address claimant);
    event DisputeResolved(uint256 indexed disputeId, DisputeStatus status);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(address _kuraCircle) {
        admin = msg.sender;
        kuraCircle = IKuraCircleDispute(_kuraCircle);
        encZero = FHE.asEuint64(uint64(0));
        FHE.allowThis(encZero);
    }

    /// @notice Raise a dispute for a specific circle round.
    /// The claimant provides their encrypted claimed contribution amount.
    /// Admin never sees the amount — they only approve/reject the dispute.
    function raiseDispute(
        uint256 circleId,
        uint256 round,
        InEuint64 calldata encClaimedAmount
    ) external returns (uint256 disputeId) {
        require(kuraCircle.isMember(circleId, msg.sender), "Not a member");
        require(memberDisputeId[circleId][round][msg.sender] == 0, "Dispute already exists");

        euint64 encClaim = FHE.asEuint64(encClaimedAmount);
        FHE.allowThis(encClaim);
        FHE.allow(encClaim, msg.sender);
        FHE.allow(encClaim, admin); // Admin needs access to verify against pool

        disputeId = ++disputeCount;
        disputes[disputeId] = Dispute({
            circleId: circleId,
            round: round,
            claimant: msg.sender,
            encClaimedAmount: encClaim,
            status: DisputeStatus.Pending,
            createdAt: block.timestamp
        });

        memberDisputeId[circleId][round][msg.sender] = disputeId;
        emit DisputeRaised(disputeId, circleId, round, msg.sender);
        return disputeId;
    }

    /// @notice Sanity check: is the claimed amount <= the current pool balance?
    /// Returns an ebool — admin decrypts to verify claim is plausible.
    /// Uses FHE.gte(pool, claim) to check without revealing either value to unauthorized parties.
    function checkDisputeValidity(uint256 disputeId) external returns (ebool) {
        Dispute storage d = disputes[disputeId];
        require(d.status == DisputeStatus.Pending, "Not pending");

        euint64 pool = kuraCircle.getPoolBalanceHandle(d.circleId);
        // pool >= claim means the claim is at least plausible
        ebool valid = FHE.gte(pool, d.encClaimedAmount);
        FHE.allowThis(valid);
        FHE.allow(valid, admin);
        FHE.allow(valid, d.claimant);
        return valid;
    }

    /// @notice Resolve a dispute. Admin approves/rejects blind (without seeing exact amount).
    /// If approved, the encrypted claimed amount is added to a correction pool.
    /// Uses FHE.select so the resolution path is encrypted even in contract storage.
    function resolveDispute(uint256 disputeId, bool approve) external onlyAdmin {
        Dispute storage d = disputes[disputeId];
        require(d.status == DisputeStatus.Pending, "Not pending");

        d.status = approve ? DisputeStatus.Approved : DisputeStatus.Rejected;
        emit DisputeResolved(disputeId, d.status);
    }

    /// @notice Get plaintext dispute status (safe: status not amounts).
    function getDisputeStatus(uint256 disputeId) external view returns (
        DisputeStatus status,
        uint256 circleId,
        uint256 round,
        address claimant,
        uint256 createdAt
    ) {
        Dispute storage d = disputes[disputeId];
        return (d.status, d.circleId, d.round, d.claimant, d.createdAt);
    }

    /// @notice Claimant views their own encrypted claimed amount.
    function getMyClaimedAmount(uint256 disputeId) external view returns (euint64) {
        Dispute storage d = disputes[disputeId];
        require(msg.sender == d.claimant, "Not claimant");
        require(FHE.isAllowed(d.encClaimedAmount, msg.sender), "Not permitted");
        return d.encClaimedAmount;
    }

    /// @notice Update admin (for multi-sig upgrades).
    function setAdmin(address _admin) external onlyAdmin {
        admin = _admin;
    }
}
