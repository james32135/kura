// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @dev Mock KuraCredit satisfying IKuraCreditGov for KuraGovernance tests.
/// Returns Bronze tier (1) for every address so membership gating works.
contract MockKuraCreditGov {
    function getMemberTier(address) external pure returns (uint8) {
        return 1; // Bronze
    }
}
