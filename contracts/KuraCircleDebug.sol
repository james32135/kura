// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @notice Diagnostic contract to isolate FHE revert in contribute flow.
/// Each testStep function does incrementally more work.
contract KuraCircleDebug {
    euint64 private encZero;
    euint64 private storedMinContribution;
    euint64 private storedAmount;

    event StepPassed(uint8 step);

    constructor() {
        encZero = FHE.asEuint64(uint64(0));
        FHE.allowThis(encZero);
    }

    /// Store a min contribution for testing gte/select
    function setMinContribution(InEuint64 calldata _encMin) external {
        storedMinContribution = FHE.asEuint64(_encMin);
        FHE.allowThis(storedMinContribution);
    }

    /// Step 1: Just asEuint64 + allowThis
    function testStep1(InEuint64 calldata _enc) external {
        euint64 amount = FHE.asEuint64(_enc);
        FHE.allowThis(amount);
        storedAmount = amount;
        emit StepPassed(1);
    }

    /// Step 2: asEuint64 + allowThis + gte
    function testStep2(InEuint64 calldata _enc) external {
        euint64 amount = FHE.asEuint64(_enc);
        FHE.allowThis(amount);
        ebool meetsMin = FHE.gte(amount, storedMinContribution);
        emit StepPassed(2);
    }

    /// Step 3: asEuint64 + allowThis + gte + select
    function testStep3(InEuint64 calldata _enc) external {
        euint64 amount = FHE.asEuint64(_enc);
        FHE.allowThis(amount);
        ebool meetsMin = FHE.gte(amount, storedMinContribution);
        euint64 validAmount = FHE.select(meetsMin, amount, encZero);
        FHE.allowThis(validAmount);
        emit StepPassed(3);
    }

    /// Step 4: Everything up to cUSDC transfer (including allowTransient)
    function testStep4(InEuint64 calldata _enc, address paymentToken) external {
        euint64 amount = FHE.asEuint64(_enc);
        FHE.allowThis(amount);
        ebool meetsMin = FHE.gte(amount, storedMinContribution);
        euint64 validAmount = FHE.select(meetsMin, amount, encZero);
        FHE.allowThis(validAmount);
        FHE.allowTransient(validAmount, paymentToken);
        emit StepPassed(4);
    }
}
