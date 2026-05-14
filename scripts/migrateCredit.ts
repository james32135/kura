/// @notice Migrate member tier data from KuraCredit v1 to KuraCreditV2.
/// Reads contributionCount and circlesCompleted from v1 for a list of known members,
/// then calls recordContributionWeighted on v2 the equivalent number of times.
/// Run after deployWave4.ts. Provide MEMBERS array and KURA_CREDIT_V2_ADDRESS.

import { ethers } from "hardhat";

// ─── Fill these in after deployWave4.ts ──────────────────────────────────────
const KURA_CREDIT_V1_ADDRESS = "0xF6e42A0523373F6Ef89d91E925a4a93299b75144";
const KURA_CREDIT_V2_ADDRESS = ""; // Set after deployWave4

// Known members to migrate — extend as needed
const MEMBERS: string[] = [
  // "0xMember1...",
  // "0xMember2...",
];

const CIRCLE_ID = 0; // Default circle for migration weight (1x = 100 bps)

async function main() {
  if (!KURA_CREDIT_V2_ADDRESS) {
    throw new Error("Set KURA_CREDIT_V2_ADDRESS before running migration");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Migration deployer:", deployer.address);

  const v1 = await ethers.getContractAt("KuraCredit", KURA_CREDIT_V1_ADDRESS);
  const v2 = await ethers.getContractAt("KuraCreditV2", KURA_CREDIT_V2_ADDRESS);

  // Authorize deployer on v2 to call recordContributionWeighted
  console.log("Authorizing deployer on KuraCreditV2...");
  const authTx = await v2.setAuthorized(deployer.address, true);
  await authTx.wait();

  console.log(`\nMigrating ${MEMBERS.length} members...`);

  for (const member of MEMBERS) {
    const contribs = await v1.contributionCount(member);
    const completions = await v1.circlesCompleted(member);

    console.log(`\n  Member: ${member}`);
    console.log(`    contributions: ${contribs}, completions: ${completions}`);

    // Replay contributions (1 per tx — batching not available without a helper contract)
    for (let i = 0; i < Number(contribs); i++) {
      const tx = await v2.recordContributionWeighted(member, CIRCLE_ID);
      await tx.wait();
      process.stdout.write(".");
    }

    // Replay completion bonus: each completion = 5 raw points → 5 contribution calls at 1x
    // KuraCreditV2 doesn't have recordCircleCompletion — encode as 5 weighted contributions
    for (let c = 0; c < Number(completions); c++) {
      for (let i = 0; i < 5; i++) {
        const tx = await v2.recordContributionWeighted(member, CIRCLE_ID);
        await tx.wait();
        process.stdout.write("*");
      }
    }

    console.log(" done");
  }

  // Revoke deployer authorization when done
  console.log("\nRevoking deployer authorization...");
  const revokeTx = await v2.setAuthorized(deployer.address, false);
  await revokeTx.wait();

  console.log("\nMigration complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
