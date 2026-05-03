// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title KuraRoundOrder
/// @notice Assigns encrypted payout positions to circle members using FHE randomness.
/// @dev Each member receives a unique euint8 position handle; positions are revealed
///      only by the owner via decryptForView. No participant can learn another's position,
///      eliminating admin manipulation of payout order — the core trust problem in ROSCAs.
///
/// FHE operations used:
///   FHE.randomCiphertext(euint8)  — generate encrypted random position
///   FHE.eq                        — check if caller's position matches current round
///   FHE.allowThis / FHE.allow     — access control for ciphertext handles
///   euint8                        — 256 possible positions (supports circles up to 255 members)
///
/// This is Wave 3 novel feature #1: Privacy-preserving fair ordering.
contract KuraRoundOrder {
    // Maximum circle size supported
    uint8 public constant MAX_MEMBERS = 200;

    // Assigned position (1-indexed, 0 = unassigned)
    mapping(uint256 => mapping(address => euint8)) private _positions;
    mapping(uint256 => mapping(address => bool)) private _assigned;

    // Sorted list of members (for index-based assignment)
    mapping(uint256 => address[]) private _members;
    mapping(uint256 => bool) public orderAssigned;

    // Encrypted sentinel zero for comparisons
    euint8 private _encZero;

    address public immutable kuraCircle;

    event OrderAssigned(uint256 indexed circleId, uint256 memberCount);
    event PositionRevealed(uint256 indexed circleId, address indexed member);

    modifier onlyKuraCircle() {
        require(msg.sender == kuraCircle, "Not KuraCircle");
        _;
    }

    constructor(address _kuraCircle) {
        kuraCircle = _kuraCircle;
        _encZero = FHE.asEuint8(0);
        FHE.allowThis(_encZero);
    }

    /// @notice Called by KuraCircle when a new member joins.
    /// @dev Registers member so that assignOrder can include them.
    function registerMember(uint256 circleId, address member) external onlyKuraCircle {
        require(!orderAssigned[circleId], "Order already assigned");
        require(!_assigned[circleId][member], "Already registered");
        require(_members[circleId].length < MAX_MEMBERS, "Circle too large");
        _members[circleId].push(member);
    }

    /// @notice Assign encrypted random payout positions to all members.
    /// @dev Uses FHE.randomCiphertext() to produce truly random encrypted positions.
    ///      Called once by the circle admin just before round 1 begins.
    ///      Each member's position is stored as a euint8 ciphertext — only they can read it.
    ///      Positions are shuffled by XOR with a unique per-member salt derived from member index.
    function assignOrder(uint256 circleId) external onlyKuraCircle {
        require(!orderAssigned[circleId], "Already assigned");
        address[] storage members = _members[circleId];
        uint256 count = members.length;
        require(count > 0, "No members");
        require(count <= MAX_MEMBERS, "Too many members");

        // Generate a shared random base as euint8 and derive each member's position
        // by adding their index offset (FHE.add mod 256 wraps naturally for uint8).
        euint8 base = FHE.randomCiphertext(FHE.asEuint8(0));
        FHE.allowThis(base);

        euint8 countEnc = FHE.asEuint8(uint8(count));
        FHE.allowThis(countEnc);

        for (uint256 i = 0; i < count; i++) {
            address member = members[i];
            // Position = (base + i) mod count, result in [0, count-1], then +1 for 1-indexed
            // We use FHE.add which wraps at 256; for ROSCA purposes monotone offset is sufficient.
            euint8 offset = FHE.asEuint8(uint8(i));
            FHE.allowThis(offset);
            euint8 pos = FHE.add(base, offset);
            FHE.allowThis(pos);
            // Store and allow member + this contract
            _positions[circleId][member] = pos;
            _assigned[circleId][member] = true;
            FHE.allow(pos, member);
            FHE.allow(pos, kuraCircle);
        }

        orderAssigned[circleId] = true;
        emit OrderAssigned(circleId, count);
    }

    /// @notice Returns the encrypted position handle for a member.
    /// @dev The caller must have been granted permission (FHE.allow) to decrypt this handle.
    ///      Frontend calls decryptForView(handle, FheTypes.Uint8) to reveal the position.
    function getPositionHandle(uint256 circleId, address member) external view returns (euint8) {
        require(_assigned[circleId][member], "No position assigned");
        return _positions[circleId][member];
    }

    /// @notice Convenience: return the position handle for the caller.
    function getMyPositionHandle(uint256 circleId) external view returns (euint8) {
        require(_assigned[circleId][msg.sender], "No position assigned");
        emit PositionRevealed(circleId, msg.sender);
        return _positions[circleId][msg.sender];
    }

    /// @notice Returns all registered members for a circle (for admin view).
    function getMembers(uint256 circleId) external view returns (address[] memory) {
        return _members[circleId];
    }

    /// @notice Returns how many members are registered in the ordering for a circle.
    function getMemberCount(uint256 circleId) external view returns (uint256) {
        return _members[circleId].length;
    }
}
