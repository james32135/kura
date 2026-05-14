// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title KuraMemberRegistry
/// @notice Stores circle membership as encrypted addresses, preventing public enumeration.
/// Replaces the public address[] in KuraCircle with FHE-protected member slots.
/// Uses FHE.eq on eaddress to check membership without revealing any addresses.
contract KuraMemberRegistry {
    /// @dev Encrypted member slots per circle
    mapping(uint256 => eaddress[]) private _encMembers;
    /// @dev Plaintext member count per circle (count is safe to reveal, addresses are not)
    mapping(uint256 => uint256) public memberCount;
    /// @dev Guard: only KuraCircle can register members
    address public immutable kuraCircle;

    event MemberRegistered(uint256 indexed circleId, uint256 slotIndex);
    event MemberAccessGranted(uint256 indexed circleId, uint256 slotIndex, address member);

    modifier onlyKuraCircle() {
        require(msg.sender == kuraCircle, "Not KuraCircle");
        _;
    }

    constructor(address _kuraCircle) {
        kuraCircle = _kuraCircle;
    }

    /// @notice Register a new member's encrypted address in a circle slot.
    /// Called by KuraCircle on joinCircle / createCircle.
    function registerMember(uint256 circleId, address member) external onlyKuraCircle {
        eaddress encMember = FHE.asEaddress(member);
        FHE.allowThis(encMember);
        uint256 slot = _encMembers[circleId].length;
        _encMembers[circleId].push(encMember);
        memberCount[circleId]++;
        emit MemberRegistered(circleId, slot);
    }

    /// @notice Privacy-preserving membership check.
    /// Computes FHE.eq on each slot and accumulates with FHE.or.
    /// Returns an ebool that is true iff encCandidate matches any stored member.
    /// @param circleId   The circle to check
    /// @param candidate  Plaintext address to test (will be encrypted client-side via FHE.asEaddress)
    function isMember(uint256 circleId, address candidate) external returns (ebool) {
        uint256 count = _encMembers[circleId].length;
        require(count > 0, "No members");

        eaddress encCandidate = FHE.asEaddress(candidate);
        FHE.allowThis(encCandidate);

        ebool found = FHE.eq(_encMembers[circleId][0], encCandidate);
        FHE.allowThis(found);

        for (uint256 i = 1; i < count; i++) {
            ebool match = FHE.eq(_encMembers[circleId][i], encCandidate);
            FHE.allowThis(match);
            found = FHE.or(found, match);
            FHE.allowThis(found);
        }

        FHE.allow(found, msg.sender);
        return found;
    }

    /// @notice Member grants themselves view access to their own encrypted slot.
    /// Use this after registration so the member can decrypt their own entry.
    function allowMemberSelf(uint256 circleId, uint256 slotIndex) external {
        require(slotIndex < _encMembers[circleId].length, "Invalid slot");
        FHE.allow(_encMembers[circleId][slotIndex], msg.sender);
        emit MemberAccessGranted(circleId, slotIndex, msg.sender);
    }

    /// @notice Get the plaintext member count for a circle (safe: count not identity).
    function getMemberCount(uint256 circleId) external view returns (uint256) {
        return memberCount[circleId];
    }

    /// @notice Get encrypted member handle at a specific slot (for authorized callers).
    function getEncMemberSlot(uint256 circleId, uint256 slotIndex) external view returns (eaddress) {
        require(slotIndex < _encMembers[circleId].length, "Invalid slot");
        require(
            FHE.isAllowed(_encMembers[circleId][slotIndex], msg.sender),
            "Not permitted to read slot"
        );
        return _encMembers[circleId][slotIndex];
    }
}
