// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @notice ReineiraOS ConfidentialEscrow interface
interface IConfidentialEscrow {
    function create(
        InEaddress calldata encryptedOwner,
        InEuint64 calldata encryptedAmount,
        address resolver,
        bytes calldata resolverData
    ) external returns (uint256 escrowId);

    function fund(uint256 escrowId, InEuint64 calldata encryptedPayment) external;
    function redeem(uint256 escrowId) external;
    function redeemAndUnwrap(uint256 escrowId, address recipient) external;
}

interface IKuraCircleAdapter {
    function getPoolBalanceHandle(uint256 circleId) external view returns (euint64);
    function transferPool(uint256 circleId, address winner, euint64 amount) external;
    function isMember(uint256 circleId, address member) external view returns (bool);
}

interface IFHERC20Adapter {
    function confidentialTransfer(address to, euint64 value) external returns (euint64);
    function setOperator(address operator, uint48 until) external;
    function confidentialBalanceOf(address account) external view returns (euint64);
    function wrap(address to, uint256 amount) external;
    function unwrap(address to, uint64 value) external;
    function claimUnwrapped(uint256 ctHash) external;
}

interface IInEaddress {
    // placeholder — InEaddress is a struct from FHE.sol
}

/// @title KuraEscrowAdapter
/// @notice Bridges KURA savings circles to ReineiraOS ConfidentialEscrow.
/// When auction settles: creates a ConfidentialEscrow with winner as owner,
/// amount = pool minus discount bid, resolver = KuraConditionResolver.
/// This means the winner must maintain their credit score to claim the pool.
contract KuraEscrowAdapter {
    struct PendingEscrow {
        uint256 circleId;
        uint256 round;
        address winner;
        uint256 discountAmount; // winning bid = amount winner gives back to pool
        uint256 escrowId;
        bool created;
        bool claimed;
    }

    mapping(uint256 => mapping(uint256 => PendingEscrow)) public pendingEscrows; // circleId => round => escrow
    mapping(uint256 => uint256) public escrowToCircle; // escrowId => circleId
    mapping(uint256 => uint256) public escrowToRound;  // escrowId => round

    IConfidentialEscrow public confidentialEscrow;
    IKuraCircleAdapter public kuraCircle;
    IFHERC20Adapter public paymentToken;
    address public conditionResolver;
    address public admin;

    event EscrowCreated(uint256 indexed circleId, uint256 round, address winner, uint256 escrowId);
    event EscrowClaimed(uint256 indexed circleId, uint256 round, address winner);

    constructor(
        address _confidentialEscrow,
        address _kuraCircle,
        address _paymentToken,
        address _conditionResolver
    ) {
        admin = msg.sender;
        confidentialEscrow = IConfidentialEscrow(_confidentialEscrow);
        kuraCircle = IKuraCircleAdapter(_kuraCircle);
        paymentToken = IFHERC20Adapter(_paymentToken);
        conditionResolver = _conditionResolver;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    /// @notice Create a ConfidentialEscrow for the winning bidder after auction settlement.
    /// The winner's pool payout is locked in escrow gated by their KURA credit score.
    /// resolverData = abi.encode(winner, minCreditScore)
    function createWinnerEscrow(
        uint256 _circleId,
        uint256 _round,
        address _winner,
        uint64 _minCreditScore,
        InEaddress calldata _encWinner,
        InEuint64 calldata _encPoolAmount
    ) external onlyAdmin returns (uint256 escrowId) {
        require(!pendingEscrows[_circleId][_round].created, "Escrow already created");
        require(kuraCircle.isMember(_circleId, _winner), "Winner not a member");

        bytes memory resolverData = abi.encode(_winner, _minCreditScore);

        // Create the escrow — ConfidentialEscrow pulls cUSDC from us
        escrowId = confidentialEscrow.create(
            _encWinner,
            _encPoolAmount,
            conditionResolver,
            resolverData
        );

        pendingEscrows[_circleId][_round] = PendingEscrow({
            circleId: _circleId,
            round: _round,
            winner: _winner,
            discountAmount: 0,
            escrowId: escrowId,
            created: true,
            claimed: false
        });

        escrowToCircle[escrowId] = _circleId;
        escrowToRound[escrowId] = _round;

        emit EscrowCreated(_circleId, _round, _winner, escrowId);
        return escrowId;
    }

    /// @notice Fund an existing escrow with encrypted cUSDC from the circle pool.
    function fundEscrow(
        uint256 _circleId,
        uint256 _round,
        InEuint64 calldata _encAmount
    ) external onlyAdmin {
        PendingEscrow storage pe = pendingEscrows[_circleId][_round];
        require(pe.created, "Escrow not created");
        confidentialEscrow.fund(pe.escrowId, _encAmount);
    }

    /// @notice Winner redeems their escrow (if credit condition met) as cUSDC.
    function claimEscrow(uint256 _circleId, uint256 _round) external {
        PendingEscrow storage pe = pendingEscrows[_circleId][_round];
        require(pe.created, "Escrow not created");
        require(!pe.claimed, "Already claimed");
        require(msg.sender == pe.winner, "Only winner can claim");

        pe.claimed = true;
        confidentialEscrow.redeem(pe.escrowId);

        emit EscrowClaimed(_circleId, _round, msg.sender);
    }

    /// @notice Winner redeems and converts to plaintext USDC in one step.
    function claimAndUnwrap(uint256 _circleId, uint256 _round, address _recipient) external {
        PendingEscrow storage pe = pendingEscrows[_circleId][_round];
        require(pe.created, "Escrow not created");
        require(!pe.claimed, "Already claimed");
        require(msg.sender == pe.winner, "Only winner can claim");

        pe.claimed = true;
        confidentialEscrow.redeemAndUnwrap(pe.escrowId, _recipient);

        emit EscrowClaimed(_circleId, _round, msg.sender);
    }

    /// @notice Get escrow ID for a given circle round.
    function getEscrowId(uint256 _circleId, uint256 _round) external view returns (uint256) {
        return pendingEscrows[_circleId][_round].escrowId;
    }

    /// @notice Check if winner has claimed their escrow.
    function isClaimed(uint256 _circleId, uint256 _round) external view returns (bool) {
        return pendingEscrows[_circleId][_round].claimed;
    }

    /// @notice Update condition resolver (for upgrades).
    function setConditionResolver(address _resolver) external onlyAdmin {
        conditionResolver = _resolver;
    }
}
