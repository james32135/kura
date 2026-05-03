// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @notice Minimal interface for ConfidentialUSDC (cUSDC) interaction.
/// NOTE: cUSDC compiles euint64 as uint256, while our FHE.sol uses bytes32.
/// We use uint256 in the interface to match cUSDC's actual ABI selectors.
interface IFHERC20 {
    function confidentialTransferFrom(address from, address to, uint256 value) external returns (uint256);
    function confidentialTransfer(address to, uint256 value) external returns (uint256);
    function confidentialBalanceOf(address account) external view returns (uint256);
    function setOperator(address operator, uint48 until) external;
    function isOperator(address holder, address spender) external view returns (bool);
}

interface IKuraCredit {
    function recordContribution(address _member) external;
    function recordCircleCompletion(address _member) external;
    /// @notice Returns the current tier for a member (0=None,1=Bronze,2=Silver,3=Gold,4=Diamond).
    function getMemberTier(address _member) external view returns (uint8);
}

/// @notice Interface to KuraRoundOrder for encrypted fair payout ordering.
interface IKuraRoundOrder {
    function registerMember(uint256 circleId, address member) external;
    function assignOrder(uint256 circleId) external;
    function orderAssigned(uint256 circleId) external view returns (bool);
}

contract KuraCircle {
    struct Circle {
        address admin;
        uint256 memberCount;
        uint256 maxMembers;
        uint256 roundDuration;
        uint256 currentRound;
        uint256 roundDeadline;
        uint256 totalRounds;
        euint64 encMinContribution;
        euint64 encPoolBalance;
        bool active;
        bool completed;
        /// @dev Minimum credit tier required to join (0 = open, 1 = Bronze+, etc.)
        uint8 minCreditTier;
    }

    uint256 public circleCount;
    mapping(uint256 => Circle) private circles;
    mapping(uint256 => address[]) public circleMembers;
    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasContributed;
    mapping(uint256 => mapping(address => euint64)) private contributions;
    mapping(uint256 => mapping(address => euint64)) private totalContributed;
    // Track round winners — members who already received the pool
    mapping(uint256 => mapping(address => bool)) public hasReceivedPool;

    IKuraCredit public kuraCredit;
    IFHERC20 public paymentToken; // ConfidentialUSDC (cUSDC)
    IKuraRoundOrder public roundOrder; // Encrypted fair payout ordering
    address public owner;

    // Reusable encrypted zero constant — gas optimization
    euint64 private encZero;

    event CircleCreated(uint256 indexed circleId, address admin, uint256 maxMembers, uint256 totalRounds);
    event ReputationGated(uint256 indexed circleId, uint8 minTier);
    event MemberJoined(uint256 indexed circleId, address member);
    event ContributionMade(uint256 indexed circleId, address member, uint256 round);
    event RoundStarted(uint256 indexed circleId, uint256 round, uint256 deadline);
    event PoolPayout(uint256 indexed circleId, uint256 round, address winner);
    event CircleCompleted(uint256 indexed circleId);

    constructor(address _kuraCredit, address _paymentToken, address _roundOrder) {
        kuraCredit = IKuraCredit(_kuraCredit);
        paymentToken = IFHERC20(_paymentToken);
        roundOrder = IKuraRoundOrder(_roundOrder);
        encZero = FHE.asEuint64(uint64(0));
        FHE.allowThis(encZero);
        owner = msg.sender;
    }

    /// @notice Admin can update the roundOrder contract address (used during initial deploy sequencing).
    function setRoundOrder(address _roundOrder) external {
        require(msg.sender == owner, "Only owner");
        require(address(roundOrder) == address(0) || !anyCircleCreated(), "Cannot change after circles created");
        roundOrder = IKuraRoundOrder(_roundOrder);
    }

    function anyCircleCreated() internal view returns (bool) {
        return circleCount > 0;
    }

    /// @notice Create a new savings circle.
    /// @param _minCreditTier  Minimum reputation tier required to join (0 = open access).
    ///                        1=Bronze, 2=Silver, 3=Gold, 4=Diamond.
    ///                        Tier check is done plaintext for now (FHE comparison in v4).
    function createCircle(
        uint256 _maxMembers,
        uint256 _roundDuration,
        uint256 _totalRounds,
        InEuint64 calldata _encMinContribution,
        uint8 _minCreditTier
    ) external returns (uint256) {
        uint256 id = circleCount++;
        Circle storage c = circles[id];
        c.admin = msg.sender;
        c.maxMembers = _maxMembers;
        c.roundDuration = _roundDuration;
        c.totalRounds = _totalRounds;
        c.encMinContribution = FHE.asEuint64(_encMinContribution);
        FHE.allowThis(c.encMinContribution);
        FHE.allow(c.encMinContribution, msg.sender);
        c.active = true;

        // Initialize pool to encrypted zero
        c.encPoolBalance = encZero;
        FHE.allowThis(c.encPoolBalance);
        FHE.allow(c.encPoolBalance, msg.sender);

        // Store reputation gate tier
        require(_minCreditTier <= 4, "Invalid tier");
        c.minCreditTier = _minCreditTier;

        // Admin auto-joins (admin is exempt from tier gate)
        circleMembers[id].push(msg.sender);
        isMember[id][msg.sender] = true;
        c.memberCount = 1;

        // Register admin in round ordering system
        roundOrder.registerMember(id, msg.sender);

        emit CircleCreated(id, msg.sender, _maxMembers, _totalRounds);
        if (_minCreditTier > 0) emit ReputationGated(id, _minCreditTier);
        return id;
    }

    function joinCircle(uint256 _circleId) external {
        Circle storage c = circles[_circleId];
        require(c.active, "Circle not active");
        require(!isMember[_circleId][msg.sender], "Already member");
        require(c.memberCount < c.maxMembers, "Circle full");

        // Reputation gate: check member's tier is at least minCreditTier
        if (c.minCreditTier > 0) {
            uint8 memberTier = kuraCredit.getMemberTier(msg.sender);
            require(memberTier >= c.minCreditTier, "Reputation tier too low");
        }

        circleMembers[_circleId].push(msg.sender);
        isMember[_circleId][msg.sender] = true;
        c.memberCount++;

        // Register member in fair ordering system
        roundOrder.registerMember(_circleId, msg.sender);

        emit MemberJoined(_circleId, msg.sender);
    }

    /// @notice Expose circle's minimum credit tier requirement.
    function getMinCreditTier(uint256 _circleId) external view returns (uint8) {
        return circles[_circleId].minCreditTier;
    }

    function startRound(uint256 _circleId) external {
        Circle storage c = circles[_circleId];
        require(msg.sender == c.admin, "Only admin");
        require(c.active, "Circle not active");
        require(!c.completed, "Circle completed");
        require(c.currentRound < c.totalRounds, "All rounds done");

        c.currentRound++;
        c.roundDeadline = block.timestamp + c.roundDuration;

        // Reset pool for new round
        c.encPoolBalance = encZero;
        FHE.allowThis(c.encPoolBalance);
        FHE.allow(c.encPoolBalance, c.admin);

        emit RoundStarted(_circleId, c.currentRound, c.roundDeadline);
    }

    /// @notice Contribute encrypted cUSDC to the circle pool.
    /// Members must call paymentToken.setOperator(KuraCircle, until) before contributing.
    /// Uses silent failure pattern: if contribution < minimum, amount is zeroed (no revert, no info leak).
    function contribute(uint256 _circleId, InEuint64 calldata _encAmount) external {
        Circle storage c = circles[_circleId];
        require(isMember[_circleId][msg.sender], "Not a member");
        require(c.currentRound > 0, "No active round");
        require(!hasContributed[_circleId][c.currentRound][msg.sender], "Already contributed this round");

        euint64 amount = FHE.asEuint64(_encAmount);
        FHE.allowThis(amount);

        // Silent failure: if below minimum, validAmount becomes 0
        ebool meetsMin = FHE.gte(amount, c.encMinContribution);
        euint64 validAmount = FHE.select(meetsMin, amount, encZero);
        FHE.allowThis(validAmount);

        // Transfer cUSDC from member to this contract
        // Note: cUSDC uses uint256 handles (not bytes32). We unwrap euint64→bytes32→uint256
        // for cross-contract calls, then re-wrap on return if needed.
        FHE.allowTransient(validAmount, address(paymentToken));
        paymentToken.confidentialTransferFrom(msg.sender, address(this), uint256(euint64.unwrap(validAmount)));

        // Accumulate pool
        c.encPoolBalance = FHE.add(c.encPoolBalance, validAmount);
        FHE.allowThis(c.encPoolBalance);
        FHE.allow(c.encPoolBalance, c.admin);

        // Track individual contribution
        if (FHE.isInitialized(totalContributed[_circleId][msg.sender])) {
            totalContributed[_circleId][msg.sender] = FHE.add(
                totalContributed[_circleId][msg.sender], validAmount
            );
        } else {
            totalContributed[_circleId][msg.sender] = validAmount;
        }
        FHE.allowThis(totalContributed[_circleId][msg.sender]);
        FHE.allow(totalContributed[_circleId][msg.sender], msg.sender);

        contributions[_circleId][msg.sender] = validAmount;
        FHE.allowThis(contributions[_circleId][msg.sender]);
        FHE.allow(contributions[_circleId][msg.sender], msg.sender);

        hasContributed[_circleId][c.currentRound][msg.sender] = true;

        // Record contribution in credit system
        kuraCredit.recordContribution(msg.sender);

        // Event emits NO amounts — privacy preserved
        emit ContributionMade(_circleId, msg.sender, c.currentRound);
    }

    /// @notice Transfer the pool to the round winner (called by KuraBid after settlement).
    /// Only admin can trigger. Transfers encrypted cUSDC from this contract to winner.
    function transferPool(uint256 _circleId, address _winner, euint64 _amount) external {
        Circle storage c = circles[_circleId];
        require(msg.sender == c.admin, "Only admin");
        require(isMember[_circleId][_winner], "Winner not a member");
        require(!hasReceivedPool[_circleId][_winner], "Already received pool");

        hasReceivedPool[_circleId][_winner] = true;
        FHE.allowTransient(_amount, address(paymentToken));
        paymentToken.confidentialTransfer(_winner, uint256(euint64.unwrap(_amount)));

        emit PoolPayout(_circleId, c.currentRound, _winner);

        // Check if all rounds complete
        if (c.currentRound >= c.totalRounds) {
            c.completed = true;
            c.active = false;
            // Record circle completion for all members
            address[] memory members = circleMembers[_circleId];
            for (uint256 i = 0; i < members.length; i++) {
                kuraCredit.recordCircleCompletion(members[i]);
            }
            emit CircleCompleted(_circleId);
        }
    }

    function getPoolBalanceHandle(uint256 _circleId) external view returns (euint64) {
        return circles[_circleId].encPoolBalance;
    }

    function getMyContribution(uint256 _circleId) external view returns (euint64) {
        require(isMember[_circleId][msg.sender], "Not a member");
        return contributions[_circleId][msg.sender];
    }

    function getMyTotal(uint256 _circleId) external view returns (euint64) {
        require(isMember[_circleId][msg.sender], "Not a member");
        return totalContributed[_circleId][msg.sender];
    }

    function getPoolBalance(uint256 _circleId) external view returns (euint64) {
        require(msg.sender == circles[_circleId].admin, "Only admin");
        return circles[_circleId].encPoolBalance;
    }

    function getCircleInfo(uint256 _circleId) external view returns (
        address admin,
        uint256 memberCount,
        uint256 maxMembers,
        uint256 currentRound,
        uint256 roundDeadline,
        bool active,
        uint256 totalRounds,
        bool completed
    ) {
        Circle storage c = circles[_circleId];
        return (c.admin, c.memberCount, c.maxMembers, c.currentRound, c.roundDeadline, c.active, c.totalRounds, c.completed);
    }

    function getMembers(uint256 _circleId) external view returns (address[] memory) {
        return circleMembers[_circleId];
    }

    function getContributionCount(uint256 _circleId, uint256 _round) external view returns (uint256) {
        uint256 count = 0;
        address[] memory members = circleMembers[_circleId];
        for (uint256 i = 0; i < members.length; i++) {
            if (hasContributed[_circleId][_round][members[i]]) count++;
        }
        return count;
    }

    function getMemberCount(uint256 _circleId) external view returns (uint256) {
        return circles[_circleId].memberCount;
    }
}
