// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @dev Mock of IFHEStreamToken for testing KuraStreamPay.
/// All transfer functions are no-ops that return 0.
contract MockConfidentialToken {
    function confidentialTransferFrom(
        address,
        address,
        uint256
    ) external pure returns (uint256) {
        return 0;
    }

    function confidentialTransfer(
        address,
        uint256
    ) external pure returns (uint256) {
        return 0;
    }

    function setOperator(address, uint48) external {}
}
