// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @dev Mock KuraCircle satisfying IKuraCircleGov for KuraGovernance tests.
contract MockKuraCircleGov {
    mapping(uint256 => mapping(address => bool)) public members;
    mapping(uint256 => uint256) public memberCounts;

    function addMember(uint256 circleId, address member) external {
        members[circleId][member] = true;
        memberCounts[circleId]++;
    }

    function isMember(uint256 circleId, address member) external view returns (bool) {
        return members[circleId][member];
    }

    function getMemberCount(uint256 circleId) external view returns (uint256) {
        return memberCounts[circleId];
    }
}
