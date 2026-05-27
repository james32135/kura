// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @dev Mock KuraCircle satisfying IKuraCircleDispute for KuraDisputeResolution tests.
contract MockKuraCircleDispute {
    mapping(uint256 => mapping(address => bool)) public members;
    mapping(uint256 => euint64) private _poolBalances;

    function addMember(uint256 circleId, address member) external {
        members[circleId][member] = true;
    }

    function isMember(uint256 circleId, address member) external view returns (bool) {
        return members[circleId][member];
    }

    /// @dev Initialise a pool balance for a circle using trivial encryption.
    ///      Trivially-encrypted handles bypass ACL checks in mock createTask,
    ///      so KuraDisputeResolution can use the handle in FHE.gte without
    ///      needing explicit allow() calls.
    function initPool(uint256 circleId, uint64 amount) external {
        _poolBalances[circleId] = FHE.asEuint64(amount);
        FHE.allowThis(_poolBalances[circleId]);
    }

    function getPoolBalanceHandle(uint256 circleId) external view returns (euint64) {
        return _poolBalances[circleId];
    }

    /// @dev Allow a specific contract to use the pool balance handle in FHE operations.
    function allowPool(uint256 circleId, address contractAddr) external {
        FHE.allow(_poolBalances[circleId], contractAddr);
    }
}
