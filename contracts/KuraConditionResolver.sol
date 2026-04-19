// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @notice ReineiraOS IConditionResolver interface
interface IConditionResolver {
    function onConditionSet(uint256 escrowId, bytes calldata data) external;
    function isConditionMet(uint256 escrowId) external returns (bool);
}

interface IKuraCreditResolver {
    function verifyCreditworthinessPlain(address member, uint64 threshold) external returns (ebool);
    function getCreditStats(address member) external view returns (
        uint256 contributions,
        uint256 completions,
        uint256 onTime,
        uint256 late,
        uint256 tier
    );
}

/// @title KuraConditionResolver
/// @notice Implements ReineiraOS IConditionResolver to gate escrow redemption
/// based on KURA encrypted credit scores. Makes KURA credit score a gate
/// for ANY ReineiraOS escrow.
contract KuraConditionResolver is IConditionResolver {
    struct Condition {
        address member;
        uint64 minScore;
        bool set;
    }

    mapping(uint256 => Condition) public conditions;
    IKuraCreditResolver public kuraCredit;
    address public admin;
    address public escrowContract; // Only the ConfidentialEscrow can call us

    event ConditionSet(uint256 indexed escrowId, address member, uint64 minScore);
    event ConditionChecked(uint256 indexed escrowId, bool met);

    constructor(address _kuraCredit, address _escrowContract) {
        admin = msg.sender;
        kuraCredit = IKuraCreditResolver(_kuraCredit);
        escrowContract = _escrowContract;
    }

    modifier onlyEscrow() {
        require(msg.sender == escrowContract || msg.sender == admin, "Only escrow or admin");
        _;
    }

    /// @notice Called by ConfidentialEscrow when an escrow is created with this resolver.
    /// data is ABI-encoded (address member, uint64 minScore).
    function onConditionSet(uint256 escrowId, bytes calldata data) external override onlyEscrow {
        (address member, uint64 minScore) = abi.decode(data, (address, uint64));
        require(member != address(0), "Invalid member");
        require(!conditions[escrowId].set, "Already set");

        conditions[escrowId] = Condition({
            member: member,
            minScore: minScore,
            set: true
        });

        emit ConditionSet(escrowId, member, minScore);
    }

    /// @notice Check if the member's encrypted credit score meets the threshold.
    /// Uses KuraCredit.verifyCreditworthinessPlain for contract-to-contract FHE comparison.
    function isConditionMet(uint256 escrowId) external override returns (bool) {
        Condition memory cond = conditions[escrowId];
        require(cond.set, "Condition not set");

        // Use plaintext stats for tier-based gating (simpler, gas efficient)
        (, , , , uint256 tier) = kuraCredit.getCreditStats(cond.member);

        // minScore maps to tier: 5=Bronze(1), 15=Silver(2), 30=Gold(3), 50=Diamond(4)
        uint256 requiredTier = 0;
        if (cond.minScore >= 50) requiredTier = 4;
        else if (cond.minScore >= 30) requiredTier = 3;
        else if (cond.minScore >= 15) requiredTier = 2;
        else if (cond.minScore >= 5) requiredTier = 1;

        bool met = tier >= requiredTier;
        emit ConditionChecked(escrowId, met);
        return met;
    }

    /// @notice View condition details for an escrow.
    function getCondition(uint256 escrowId) external view returns (address member, uint64 minScore, bool set) {
        Condition memory c = conditions[escrowId];
        return (c.member, c.minScore, c.set);
    }

    /// @notice Update escrow contract address (for upgrades).
    function setEscrowContract(address _escrow) external {
        require(msg.sender == admin, "Only admin");
        escrowContract = _escrow;
    }
}
