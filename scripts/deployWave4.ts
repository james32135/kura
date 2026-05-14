import { ethers } from "hardhat";

// ─── Existing Wave 3 addresses on Arbitrum Sepolia ───────────────────────────
const CUSDC_ADDRESS               = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
const KURA_CREDIT_V1_ADDRESS      = "0xF6e42A0523373F6Ef89d91E925a4a93299b75144";
const KURA_CIRCLE_ADDRESS         = "0x5B2DBDCC210Df55486BdBc7E1A16B1f8CF0673b7";
const CONFIDENTIAL_ESCROW_ADDRESS = "0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Wave 4 deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  const deployed: Record<string, string> = {};

  // ── Step 1: KuraMemberRegistry (no deps) ──────────────────────────────────
  console.log("\n[1/6] Deploying KuraMemberRegistry...");
  const KuraMemberRegistry = await ethers.getContractFactory("KuraMemberRegistry");
  const memberRegistry = await KuraMemberRegistry.deploy(KURA_CIRCLE_ADDRESS);
  await memberRegistry.waitForDeployment();
  deployed.KuraMemberRegistry = await memberRegistry.getAddress();
  console.log("  KuraMemberRegistry:", deployed.KuraMemberRegistry);

  // ── Step 2: KuraCreditV2 (no deps) ────────────────────────────────────────
  console.log("\n[2/6] Deploying KuraCreditV2...");
  const KuraCreditV2 = await ethers.getContractFactory("KuraCreditV2");
  const creditV2 = await KuraCreditV2.deploy();
  await creditV2.waitForDeployment();
  deployed.KuraCreditV2 = await creditV2.getAddress();
  console.log("  KuraCreditV2:", deployed.KuraCreditV2);

  // Authorize KuraCircle as a caller on KuraCreditV2
  console.log("  Authorizing KuraCircle on KuraCreditV2...");
  const authTx = await creditV2.setAuthorized(KURA_CIRCLE_ADDRESS, true);
  await authTx.wait();
  // Also authorize KuraCircle as a verifier (so it can call getMemberTier-equivalent)
  const verTx = await creditV2.setVerifier(KURA_CIRCLE_ADDRESS, true);
  await verTx.wait();
  console.log("  Authorization done.");

  // ── Step 3: KuraPrivacyVault (no deps) ────────────────────────────────────
  console.log("\n[3/6] Deploying KuraPrivacyVault...");
  const KuraPrivacyVault = await ethers.getContractFactory("KuraPrivacyVault");
  const privacyVault = await KuraPrivacyVault.deploy();
  await privacyVault.waitForDeployment();
  deployed.KuraPrivacyVault = await privacyVault.getAddress();
  console.log("  KuraPrivacyVault:", deployed.KuraPrivacyVault);

  // ── Step 4: KuraStreamPay (deps: cUSDC, KuraCircle) ───────────────────────
  console.log("\n[4/6] Deploying KuraStreamPay...");
  const KuraStreamPay = await ethers.getContractFactory("KuraStreamPay");
  const streamPay = await KuraStreamPay.deploy(CUSDC_ADDRESS, KURA_CIRCLE_ADDRESS);
  await streamPay.waitForDeployment();
  deployed.KuraStreamPay = await streamPay.getAddress();
  console.log("  KuraStreamPay:", deployed.KuraStreamPay);

  // ── Step 5: KuraDisputeResolution (deps: KuraCircle) ──────────────────────
  console.log("\n[5/6] Deploying KuraDisputeResolution...");
  const KuraDisputeResolution = await ethers.getContractFactory("KuraDisputeResolution");
  const disputeResolution = await KuraDisputeResolution.deploy(KURA_CIRCLE_ADDRESS);
  await disputeResolution.waitForDeployment();
  deployed.KuraDisputeResolution = await disputeResolution.getAddress();
  console.log("  KuraDisputeResolution:", deployed.KuraDisputeResolution);

  // ── Step 6: KuraGovernance (deps: KuraCircle, KuraCreditV2) ───────────────
  console.log("\n[6/6] Deploying KuraGovernance...");
  const KuraGovernance = await ethers.getContractFactory("KuraGovernance");
  const governance = await KuraGovernance.deploy(
    KURA_CIRCLE_ADDRESS,
    deployed.KuraCreditV2
  );
  await governance.waitForDeployment();
  deployed.KuraGovernance = await governance.getAddress();
  console.log("  KuraGovernance:", deployed.KuraGovernance);

  // Authorize KuraCircle as verifier on KuraCreditV2 (for governance tier checks)
  const govVerTx = await creditV2.setVerifier(deployed.KuraGovernance, true);
  await govVerTx.wait();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════");
  console.log("WAVE 4 DEPLOYMENT COMPLETE — Arbitrum Sepolia");
  console.log("══════════════════════════════════════════════");
  for (const [name, addr] of Object.entries(deployed)) {
    console.log(`  ${name.padEnd(30)} ${addr}`);
  }
  console.log("\nAdd these to frontend/src/config/contracts.ts");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
