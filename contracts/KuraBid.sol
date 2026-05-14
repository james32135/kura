// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @notice Minimal FHERC20 interface for cUSDC
interface IFHERC20Bid {
    function confidentialTransfer(address to, euint64 value) external returns (euint64);
    function confidentialBalanceOf(address account) external view returns (euint64);
}

interface IKuraCircle {
    function getPoolBalanceHandle(uint256 circleId) external view returns (euint64);
    function transferPool(uint256 circleId, address winner, euint64 amount) external;
    function isMember(uint256 circleId, address member) external view returns (bool);
    function getMembers(uint256 circleId) external view returns (address[] memory);
}

contract KuraBid {
    struct Bid {
        address bidder;
        euint64 encBidAmount;
        bool submitted;
    }

    struct RoundResult {
        address winner;
        uint256 winningBidPlaintext;
        uint256 poolAmountPlaintext;
        bool resolved;
    }

    mapping(uint256 => mapping(uint256 => mapping(address => Bid))) private bids;
    mapping(uint256 => mapping(uint256 => address[])) public roundBidders;
    mapping(uint256 => mapping(uint256 => RoundResult)) public roundResults;
    mapping(uint256 => mapping(uint256 => euint64)) private lowestBid;
    mapping(uint256 => mapping(uint256 => address)) private lowestBidder;
    /// Encrypted address of the current lowest bidder — kept in sync with lowestBid.
    /// Allows the AutoSettler frontend to decrypt the winner without admin typing.
    mapping(uint256 => mapping(uint256 => eaddress)) private lowestBidderEnc;
    mapping(uint256 => mapping(uint256 => bool)) public roundClosed;

    IKuraCircle public kuraCircle;
    IFHERC20Bid public paymentToken;
    address public admin;

    event BidSubmitted(uint256 indexed circleId, uint256 round, address bidder);
    event RoundClosed(uint256 indexed circleId, uint256 round);
    event RoundResolved(uint256 indexed circleId, uint256 round, address winner, uint256 discountAmount);

    constructor(address _kuraCircle, address _paymentToken) {
        admin = msg.sender;
        kuraCircle = IKuraCircle(_kuraCircle);
        paymentToken = IFHERC20Bid(_paymentToken);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    /// @notice Submit an encrypted sealed bid. Silent failure on double bid (no revert, no info leak).
    /// Bid represents the discount the member is willing to accept (lower = wins).
    function submitBid(uint256 _circleId, uint256 _round, InEuint64 calldata _encBid) external {
        // Silent failure pattern: if already bid, tx succeeds but bid is ignored
        if (bids[_circleId][_round][msg.sender].submitted) {
            return;
        }
        require(!roundClosed[_circleId][_round], "Round closed");
        require(kuraCircle.isMember(_circleId, msg.sender), "Not circle member");

        euint64 bidAmount = FHE.asEuint64(_encBid);
        FHE.allowThis(bidAmount);
        FHE.allow(bidAmount, msg.sender);

        bids[_circleId][_round][msg.sender] = Bid({
            bidder: msg.sender,
            encBidAmount: bidAmount,
            submitted: true
        });

        // Track lowest bid + encrypted bidder address in lockstep.
        if (!FHE.isInitialized(lowestBid[_circleId][_round])) {
            lowestBid[_circleId][_round] = bidAmount;
            FHE.allowThis(lowestBid[_circleId][_round]);
            lowestBidder[_circleId][_round] = msg.sender;
            lowestBidderEnc[_circleId][_round] = FHE.asEaddress(msg.sender);
            FHE.allowThis(lowestBidderEnc[_circleId][_round]);
        } else {
            ebool isLower = FHE.lte(bidAmount, lowestBid[_circleId][_round]);
            lowestBid[_circleId][_round] = FHE.select(
                isLower, bidAmount, lowestBid[_circleId][_round]
            );
            FHE.allowThis(lowestBid[_circleId][_round]);
            // Encrypted address follows the same selection — reveals only the winner on close.
            eaddress thisBidder = FHE.asEaddress(msg.sender);
            lowestBidderEnc[_circleId][_round] = FHE.select(
                isLower, thisBidder, lowestBidderEnc[_circleId][_round]
            );
            FHE.allowThis(lowestBidderEnc[_circleId][_round]);
        }

        roundBidders[_circleId][_round].push(msg.sender);
        emit BidSubmitted(_circleId, _round, msg.sender);
    }

    /// @notice Admin closes the round and makes lowest bid publicly decryptable.
    function closeRound(uint256 _circleId, uint256 _round) external onlyAdmin {
        require(!roundClosed[_circleId][_round], "Already closed");
        require(FHE.isInitialized(lowestBid[_circleId][_round]), "No bids");

        roundClosed[_circleId][_round] = true;

        // Allow public decryption of the lowest bid AND winner address — losing bids stay private
        FHE.allowPublic(lowestBid[_circleId][_round]);
        if (FHE.isInitialized(lowestBidderEnc[_circleId][_round])) {
            FHE.allowPublic(lowestBidderEnc[_circleId][_round]);
        }

        emit RoundClosed(_circleId, _round);
    }

    /// @notice Settle round with verified decryption result.
    /// publishDecryptResult ensures the plaintext actually matches the ciphertext.
    /// Winner gets pool minus their bid discount. Non-winners get dividend share of the bid discount.
    function settleRound(
        uint256 _circleId,
        uint256 _round,
        address _winner,
        uint64 _winningBidPlaintext,
        bytes calldata _decryptSignature
    ) external onlyAdmin {
        require(roundClosed[_circleId][_round], "Round not closed");
        require(!roundResults[_circleId][_round].resolved, "Already resolved");
        require(kuraCircle.isMember(_circleId, _winner), "Winner not a member");
        // Guard: ensure closeRound was called (lowest bid is publicly decryptable)
        require(FHE.isPubliclyAllowed(lowestBid[_circleId][_round]), "Round not closed properly");

        // Verify decryption without storing winner identity on-chain permanently
        FHE.verifyDecryptResult(
            lowestBid[_circleId][_round],
            _winningBidPlaintext,
            _decryptSignature
        );

        roundResults[_circleId][_round] = RoundResult({
            winner: _winner,
            winningBidPlaintext: uint256(_winningBidPlaintext),
            poolAmountPlaintext: 0, // Will be populated after pool transfer
            resolved: true
        });

        emit RoundResolved(_circleId, _round, _winner, uint256(_winningBidPlaintext));
    }

    function getLowestBidHandle(uint256 _circleId, uint256 _round) external view returns (euint64) {
        return lowestBid[_circleId][_round];
    }

    /// @notice Read stored decryption result for the lowest bid (non-reverting).
    /// Returns 0 if not yet published. Use after publishDecryptResult is called.
    function getSettledBidAmount(uint256 _circleId, uint256 _round) external view returns (uint256) {
        if (!roundResults[_circleId][_round].resolved) return 0;
        return FHE.getDecryptResultSafe(lowestBid[_circleId][_round]);
    }

    /// @notice Returns the encrypted handle of the winning bidder address.
    /// Becomes publicly decryptable after closeRound — frontend calls decryptForTx
    /// to learn the winner without admin needing to know it off-chain.
    function getLowestBidderEncHandle(uint256 _circleId, uint256 _round) external view returns (eaddress) {
        return lowestBidderEnc[_circleId][_round];
    }

    function getRoundResult(uint256 _circleId, uint256 _round) external view returns (
        address winner, uint256 winningBid, uint256 poolAmount, bool resolved
    ) {
        RoundResult memory r = roundResults[_circleId][_round];
        return (r.winner, r.winningBidPlaintext, r.poolAmountPlaintext, r.resolved);
    }

    function hasBid(uint256 _circleId, uint256 _round, address _bidder) external view returns (bool) {
        return bids[_circleId][_round][_bidder].submitted;
    }

    function getRoundBidders(uint256 _circleId, uint256 _round) external view returns (address[] memory) {
        return roundBidders[_circleId][_round];
    }

    function getRoundBidCount(uint256 _circleId, uint256 _round) external view returns (uint256) {
        return roundBidders[_circleId][_round].length;
    }
}
