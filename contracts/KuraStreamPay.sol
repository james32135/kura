// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IFHEStreamToken {
    function confidentialTransferFrom(address from, address to, uint256 value) external returns (uint256);
    function confidentialTransfer(address to, uint256 value) external returns (uint256);
    function setOperator(address operator, uint48 until) external;
}

/// @title KuraStreamPay
/// @notice Members stream contributions per-block instead of lump sums.
/// Streaming hides exact contribution timing and prevents capacity inference
/// from single large transfers. All amounts stay encrypted throughout.
/// FHE ops used: FHE.mul (rate * blocks), FHE.min (cap to balance),
///               FHE.sub (refund = locked - paid), FHE.gt (active check)
contract KuraStreamPay {
    struct Stream {
        euint64 encRatePerBlock;  // encrypted contribution rate (per block)
        euint64 encLocked;        // encrypted total locked at stream creation
        euint64 encPaid;          // encrypted cumulative amount collected to pool
        uint256 startBlock;       // plaintext block number (fine to reveal)
        uint256 maxBlocks;        // maximum duration in blocks
        bool active;
    }

    mapping(uint256 => mapping(address => Stream)) private streams;
    /// @dev Encrypted pool balances accumulated from streams
    mapping(uint256 => euint64) private streamPools;

    IFHEStreamToken public paymentToken;
    address public kuraCircle;
    address public owner;

    // Reusable encrypted zero
    euint64 private encZero;

    event StreamCreated(uint256 indexed circleId, address indexed member, uint256 maxBlocks);
    event StreamCollected(uint256 indexed circleId, uint256 indexed round);
    event StreamCancelled(uint256 indexed circleId, address indexed member);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _paymentToken, address _kuraCircle) {
        paymentToken = IFHEStreamToken(_paymentToken);
        kuraCircle = _kuraCircle;
        owner = msg.sender;
        encZero = FHE.asEuint64(uint64(0));
        FHE.allowThis(encZero);
    }

    /// @notice Create a streaming contribution. The member specifies an encrypted rate
    /// and a max block duration. Total locked = rate * maxBlocks (FHE.mul).
    /// Member must pre-approve this contract as operator on the payment token.
    function createStream(
        uint256 circleId,
        InEuint64 calldata encRatePerBlock,
        uint256 maxBlocks
    ) external {
        require(!streams[circleId][msg.sender].active, "Stream already active");
        require(maxBlocks > 0 && maxBlocks <= 200000, "Invalid duration"); // ~1 month at 12s blocks

        euint64 rate = FHE.asEuint64(encRatePerBlock);
        FHE.allowThis(rate);
        FHE.allow(rate, msg.sender);

        // Total locked = rate * maxBlocks — FHE.mul used here
        euint64 encMax = FHE.asEuint64(uint64(maxBlocks));
        FHE.allowThis(encMax);
        euint64 locked = FHE.mul(rate, encMax);
        FHE.allowThis(locked);
        FHE.allow(locked, msg.sender);

        // Lock total from member's balance into this contract
        FHE.allowTransient(locked, address(paymentToken));
        paymentToken.confidentialTransferFrom(
            msg.sender,
            address(this),
            uint256(euint64.unwrap(locked))
        );

        streams[circleId][msg.sender] = Stream({
            encRatePerBlock: rate,
            encLocked: locked,
            encPaid: encZero,
            startBlock: block.number,
            maxBlocks: maxBlocks,
            active: true
        });

        emit StreamCreated(circleId, msg.sender, maxBlocks);
    }

    /// @notice Collect all pending stream amounts from a member into the circle pool.
    /// elapsed = current - start (plaintext, safe to reveal)
    /// due = rate * elapsed (FHE.mul)
    /// payment = min(due, locked - paid) (FHE.min to cap at remaining balance)
    function collectStream(uint256 circleId, address member) external {
        Stream storage s = streams[circleId][member];
        require(s.active, "No active stream");

        uint256 elapsed = block.number - s.startBlock;
        if (elapsed > s.maxBlocks) elapsed = s.maxBlocks;

        // due = rate * elapsed (plaintext elapsed is safe)
        euint64 encElapsed = FHE.asEuint64(uint64(elapsed));
        FHE.allowThis(encElapsed);
        euint64 due = FHE.mul(s.encRatePerBlock, encElapsed);
        FHE.allowThis(due);

        // remaining = locked - paid (FHE.sub)
        euint64 remaining = FHE.sub(s.encLocked, s.encPaid);
        FHE.allowThis(remaining);

        // payment = min(due, remaining) — caps to actual balance (FHE.min)
        euint64 payment = FHE.min(due, remaining);
        FHE.allowThis(payment);

        // Update paid accumulator
        s.encPaid = FHE.add(s.encPaid, payment);
        FHE.allowThis(s.encPaid);
        FHE.allow(s.encPaid, member);

        // Add to stream pool for this circle
        if (FHE.isInitialized(streamPools[circleId])) {
            streamPools[circleId] = FHE.add(streamPools[circleId], payment);
        } else {
            streamPools[circleId] = payment;
        }
        FHE.allowThis(streamPools[circleId]);

        emit StreamCollected(circleId, block.number);

        // Auto-close if stream exhausted (elapsed >= maxBlocks)
        if (elapsed >= s.maxBlocks) {
            s.active = false;
        }
    }

    /// @notice Cancel a stream and return remaining balance to member.
    /// refund = locked - paid (FHE.sub)
    function cancelStream(uint256 circleId) external {
        Stream storage s = streams[circleId][msg.sender];
        require(s.active, "No active stream");

        s.active = false;

        // Refund = locked - paid
        euint64 refund = FHE.sub(s.encLocked, s.encPaid);
        FHE.allowThis(refund);

        FHE.allowTransient(refund, address(paymentToken));
        paymentToken.confidentialTransfer(
            msg.sender,
            uint256(euint64.unwrap(refund))
        );

        emit StreamCancelled(circleId, msg.sender);
    }

    /// @notice Encrypted check: does member have an active balance > 0?
    /// Returns ebool using FHE.gt(encPaid, encZero)... actually checks remaining > 0.
    function hasActiveStream(uint256 circleId, address member) external returns (ebool) {
        Stream storage s = streams[circleId][member];
        if (!s.active) {
            ebool falseBool = FHE.asEbool(false);
            FHE.allow(falseBool, msg.sender);
            return falseBool;
        }
        // remaining = locked - paid
        euint64 remaining = FHE.sub(s.encLocked, s.encPaid);
        FHE.allowThis(remaining);
        ebool active = FHE.gt(remaining, encZero);
        FHE.allowThis(active);
        FHE.allow(active, msg.sender);
        return active;
    }

    /// @notice Get the encrypted stream pool balance for a circle (admin view).
    function getStreamPool(uint256 circleId) external view returns (euint64) {
        return streamPools[circleId];
    }

    /// @notice Member views their own encrypted paid amount.
    function getMyPaid(uint256 circleId) external view returns (euint64) {
        require(streams[circleId][msg.sender].active, "No stream");
        require(
            FHE.isAllowed(streams[circleId][msg.sender].encPaid, msg.sender),
            "Not permitted"
        );
        return streams[circleId][msg.sender].encPaid;
    }

    /// @notice Get plaintext stream metadata (timing, not amounts).
    function getStreamInfo(uint256 circleId, address member) external view returns (
        uint256 startBlock,
        uint256 maxBlocks,
        bool active
    ) {
        Stream storage s = streams[circleId][member];
        return (s.startBlock, s.maxBlocks, s.active);
    }
}
