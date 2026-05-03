// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract KuraCredit {
    mapping(address => euint64) private creditScores;
    mapping(address => uint256) public contributionCount;
    mapping(address => uint256) public circlesCompleted;
    mapping(address => uint256) public onTimePayments;
    mapping(address => uint256) public latePayments;

    // Credit tier thresholds (plaintext for UI display)
    uint256 public constant TIER_BRONZE = 5;
    uint256 public constant TIER_SILVER = 15;
    uint256 public constant TIER_GOLD = 30;
    uint256 public constant TIER_DIAMOND = 50;

    // Scoring weights (encrypted, applied in FHE)
    euint64 private encContributionWeight; // 1 point per contribution
    euint64 private encCompletionWeight; // 5 points per circle completion
    euint64 private encOne;

    // Access control: only authorized contracts can record
    mapping(address => bool) public authorized;
    address public owner;

    event CreditIncremented(address indexed member);
    event CreditVerified(address indexed member, address indexed requester);
    event AuthorizedUpdated(address indexed addr, bool status);
    event CircleCompletionRecorded(address indexed member, uint256 totalCompleted);
    event OnTimePaymentRecorded(address indexed member);

    constructor() {
        owner = msg.sender;
        encOne = FHE.asEuint64(uint64(1));
        FHE.allowThis(encOne);
        encContributionWeight = FHE.asEuint64(uint64(1));
        FHE.allowThis(encContributionWeight);
        encCompletionWeight = FHE.asEuint64(uint64(5));
        FHE.allowThis(encCompletionWeight);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorized[msg.sender], "Not authorized");
        _;
    }

    function setAuthorized(address _addr, bool _status) external onlyOwner {
        authorized[_addr] = _status;
        emit AuthorizedUpdated(_addr, _status);
    }

    /// @notice Called by KuraCircle on valid contributions. Adds contribution weight to score.
    function recordContribution(address _member) external onlyAuthorized {
        if (FHE.isInitialized(creditScores[_member])) {
            creditScores[_member] = FHE.add(creditScores[_member], encContributionWeight);
        } else {
            creditScores[_member] = encContributionWeight;
        }
        FHE.allowThis(creditScores[_member]);
        FHE.allow(creditScores[_member], _member);

        contributionCount[_member]++;
        onTimePayments[_member]++;

        emit CreditIncremented(_member);
        emit OnTimePaymentRecorded(_member);
    }

    /// @notice Record circle completion — adds completion bonus to score.
    function recordCircleCompletion(address _member) external onlyAuthorized {
        if (FHE.isInitialized(creditScores[_member])) {
            creditScores[_member] = FHE.add(creditScores[_member], encCompletionWeight);
        } else {
            creditScores[_member] = encCompletionWeight;
        }
        FHE.allowThis(creditScores[_member]);
        FHE.allow(creditScores[_member], _member);

        circlesCompleted[_member]++;
        emit CircleCompletionRecorded(_member, circlesCompleted[_member]);
    }

    /// @notice Record a late payment (reduces trust but score stays encrypted).
    function recordLatePayment(address _member) external onlyAuthorized {
        latePayments[_member]++;
    }

    /// @notice Double-blind verification: requester sends encrypted threshold,
    /// gets ebool result only they can read. Neither party sees the other's value.
    function verifyCreditworthiness(
        address _member,
        InEuint64 calldata _encThreshold
    ) external returns (ebool) {
        require(FHE.isInitialized(creditScores[_member]), "No credit history");

        euint64 threshold = FHE.asEuint64(_encThreshold);
        FHE.allowThis(threshold);

        ebool result = FHE.gte(creditScores[_member], threshold);
        FHE.allow(result, msg.sender);

        emit CreditVerified(_member, msg.sender);
        return result;
    }

    /// @notice Verify creditworthiness with plaintext threshold (for contract-to-contract calls).
    function verifyCreditworthinessPlain(
        address _member,
        uint64 _threshold
    ) external returns (ebool) {
        require(FHE.isInitialized(creditScores[_member]), "No credit history");

        euint64 threshold = FHE.asEuint64(_threshold);
        FHE.allowThis(threshold);

        ebool result = FHE.gte(creditScores[_member], threshold);
        FHE.allow(result, msg.sender);
        FHE.allowPublic(result);

        emit CreditVerified(_member, msg.sender);
        return result;
    }

    /// @notice Member views their own encrypted score.
    function getMyScore() external view returns (euint64) {
        require(FHE.isInitialized(creditScores[msg.sender]), "No credit history");
        return creditScores[msg.sender];
    }

    /// @notice Get plaintext credit stats for a member (public info for tier display).
    function getCreditStats(address _member) external view returns (
        uint256 contributions,
        uint256 completions,
        uint256 onTime,
        uint256 late,
        uint256 tier
    ) {
        uint256 t = 0;
        uint256 score = contributionCount[_member] + (circlesCompleted[_member] * 5);
        if (score >= TIER_DIAMOND) t = 4;
        else if (score >= TIER_GOLD) t = 3;
        else if (score >= TIER_SILVER) t = 2;
        else if (score >= TIER_BRONZE) t = 1;
        return (contributionCount[_member], circlesCompleted[_member], onTimePayments[_member], latePayments[_member], t);
    }

    function getContributionCount(address _member) external view returns (uint256) {
        return contributionCount[_member];
    }

    /// @notice Return the plaintext tier index for a member (used by KuraCircle reputation gate).
    /// 0=None, 1=Bronze, 2=Silver, 3=Gold, 4=Diamond
    function getMemberTier(address _member) external view returns (uint8) {
        uint256 score = contributionCount[_member] + (circlesCompleted[_member] * 5);
        if (score >= TIER_DIAMOND) return 4;
        if (score >= TIER_GOLD) return 3;
        if (score >= TIER_SILVER) return 2;
        if (score >= TIER_BRONZE) return 1;
        return 0;
    }
}
