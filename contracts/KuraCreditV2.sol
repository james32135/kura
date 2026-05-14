// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IKuraCreditBase {
    function contributionCount(address member) external view returns (uint256);
    function circlesCompleted(address member) external view returns (uint256);
}

/// @title KuraCreditV2
/// @notice Enhanced encrypted credit scoring with:
///   - Weighted contributions (per-circle multiplier via FHE.mul)
///   - Quadratic scoring weight via FHE.square
///   - Encrypted tier output via FHE.select chain (tier bucket never leaked)
///   - Range verification via FHE.and (e.g., Silver–Gold for mid-tier circles)
contract KuraCreditV2 {
    mapping(address => euint64) private weightedScores;
    mapping(address => uint256) public contributionCount;

    // Per-circle contribution weight (in basis points, 100 = 1x, 150 = 1.5x)
    mapping(uint256 => euint64) private circleWeights;

    mapping(address => bool) public authorized;
    mapping(address => bool) public authorizedVerifiers;
    address public owner;

    uint64 public constant TIER_BRONZE  = 5;
    uint64 public constant TIER_SILVER  = 15;
    uint64 public constant TIER_GOLD    = 30;
    uint64 public constant TIER_DIAMOND = 50;
    uint64 public constant WEIGHT_BASIS = 100; // 1x multiplier base

    event ContributionWeighted(address indexed member, uint256 indexed circleId);
    event AuthorizedUpdated(address indexed addr, bool status);
    event VerifierUpdated(address indexed addr, bool status);
    event CircleWeightSet(uint256 indexed circleId, uint64 weightBps);

    constructor() {
        owner = msg.sender;
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

    function setVerifier(address _addr, bool _status) external onlyOwner {
        authorizedVerifiers[_addr] = _status;
        emit VerifierUpdated(_addr, _status);
    }

    /// @notice Set a per-circle contribution weight multiplier (100 = 1x, 200 = 2x).
    /// Higher-stakes circles can have higher weight to reward members more.
    function setCircleWeight(uint256 circleId, uint64 weightBps) external onlyOwner {
        require(weightBps >= 50 && weightBps <= 500, "Weight out of range");
        circleWeights[circleId] = FHE.asEuint64(weightBps);
        FHE.allowThis(circleWeights[circleId]);
        emit CircleWeightSet(circleId, weightBps);
    }

    /// @notice Record a contribution with per-circle multiplier: score += 1 * weight / 100
    /// Uses FHE.mul for the weighted increment, FHE.div for basis-point normalization.
    function recordContributionWeighted(address _member, uint256 circleId) external onlyAuthorized {
        euint64 baseIncrement = FHE.asEuint64(uint64(1));
        FHE.allowThis(baseIncrement);

        euint64 increment;
        if (FHE.isInitialized(circleWeights[circleId])) {
            // Weighted: score += (1 * weightBps) / 100
            euint64 weighted = FHE.mul(baseIncrement, circleWeights[circleId]);
            FHE.allowThis(weighted);
            euint64 basisDiv = FHE.asEuint64(WEIGHT_BASIS);
            FHE.allowThis(basisDiv);
            increment = FHE.div(weighted, basisDiv);
            FHE.allowThis(increment);
        } else {
            increment = baseIncrement;
        }

        if (FHE.isInitialized(weightedScores[_member])) {
            weightedScores[_member] = FHE.add(weightedScores[_member], increment);
        } else {
            weightedScores[_member] = increment;
        }
        FHE.allowThis(weightedScores[_member]);
        FHE.allow(weightedScores[_member], _member);

        contributionCount[_member]++;
        emit ContributionWeighted(_member, circleId);
    }

    /// @notice Returns the member's squared score — for quadratic weighting in governance.
    /// Uses FHE.square: result = score^2
    function getSquaredScore(address _member) external returns (euint64) {
        require(
            msg.sender == _member || authorizedVerifiers[msg.sender],
            "Not authorized"
        );
        require(FHE.isInitialized(weightedScores[_member]), "No score");
        euint64 squared = FHE.square(weightedScores[_member]);
        FHE.allowThis(squared);
        FHE.allow(squared, _member);
        if (msg.sender != _member) FHE.allow(squared, msg.sender);
        return squared;
    }

    /// @notice Returns encrypted tier as euint8 via FHE.select chain.
    /// Score thresholds never revealed — only the tier bucket is output.
    function getEncryptedTier(address _member) external returns (euint8) {
        require(
            msg.sender == _member || authorizedVerifiers[msg.sender],
            "Not authorized"
        );
        require(FHE.isInitialized(weightedScores[_member]), "No score");

        euint64 score = weightedScores[_member];
        euint64 enc5  = FHE.asEuint64(TIER_BRONZE);
        euint64 enc15 = FHE.asEuint64(TIER_SILVER);
        euint64 enc30 = FHE.asEuint64(TIER_GOLD);
        euint64 enc50 = FHE.asEuint64(TIER_DIAMOND);
        FHE.allowThis(enc5); FHE.allowThis(enc15); FHE.allowThis(enc30); FHE.allowThis(enc50);

        euint8 tier = FHE.select(
            FHE.gte(score, enc50), FHE.asEuint8(4),
            FHE.select(
                FHE.gte(score, enc30), FHE.asEuint8(3),
                FHE.select(
                    FHE.gte(score, enc15), FHE.asEuint8(2),
                    FHE.select(
                        FHE.gte(score, enc5), FHE.asEuint8(1), FHE.asEuint8(0)
                    )
                )
            )
        );

        FHE.allowThis(tier);
        FHE.allowSender(tier);
        if (msg.sender != _member) FHE.allow(tier, _member);
        return tier;
    }

    /// @notice Encrypted range check: is member's tier between minTier and maxTier (inclusive)?
    /// Uses FHE.and(gte, lte) — never reveals the actual tier value.
    function verifyTierInRange(
        address _member,
        uint8 minTier,
        uint8 maxTier
    ) external returns (ebool) {
        require(
            msg.sender == _member || authorizedVerifiers[msg.sender],
            "Not authorized"
        );
        require(FHE.isInitialized(weightedScores[_member]), "No score");
        require(minTier <= maxTier && maxTier <= 4, "Invalid range");

        euint64 score = weightedScores[_member];

        // Compute plaintext thresholds for the range edges
        uint64 minThreshold = _tierThreshold(minTier);
        uint64 maxThreshold = minTier == 4 ? type(uint64).max : _tierThreshold(maxTier + 1) - 1;

        euint64 encMin = FHE.asEuint64(minThreshold);
        euint64 encMax = FHE.asEuint64(maxThreshold);
        FHE.allowThis(encMin); FHE.allowThis(encMax);

        ebool inRange = FHE.and(FHE.gte(score, encMin), FHE.lte(score, encMax));
        FHE.allowThis(inRange);
        FHE.allow(inRange, msg.sender);
        return inRange;
    }

    function _tierThreshold(uint8 tier) internal pure returns (uint64) {
        if (tier == 1) return TIER_BRONZE;
        if (tier == 2) return TIER_SILVER;
        if (tier == 3) return TIER_GOLD;
        if (tier == 4) return TIER_DIAMOND;
        return 0;
    }

    function getMyScore() external view returns (euint64) {
        require(FHE.isInitialized(weightedScores[msg.sender]), "No score");
        require(FHE.isAllowed(weightedScores[msg.sender], msg.sender), "Not permitted");
        return weightedScores[msg.sender];
    }
}
