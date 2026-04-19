import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Existing contract addresses (unchanged)
const KURA_CREDIT_ADDRESS = "0x26b1ea9Bb8Aa33086Fa5b4D32EA89b2Da6DD4B14";
const CUSDC_ADDRESS = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Redeploying KuraCircle with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy new KuraCircle
  console.log("\n--- Deploying KuraCircle ---");
  const KuraCircle = await ethers.getContractFactory("KuraCircle");
  const kuraCircle = await KuraCircle.deploy(KURA_CREDIT_ADDRESS, CUSDC_ADDRESS);
  await kuraCircle.waitForDeployment();
  const kuraCircleAddr = await kuraCircle.getAddress();
  console.log("KuraCircle deployed to:", kuraCircleAddr);

  // Authorize new KuraCircle on KuraCredit
  console.log("\n--- Authorizing on KuraCredit ---");
  const kuraCredit = await ethers.getContractAt("KuraCredit", KURA_CREDIT_ADDRESS);
  const authTx = await kuraCredit.setAuthorized(kuraCircleAddr, true);
  await authTx.wait();
  console.log("KuraCircle authorized on KuraCredit");

  // Read the new ABI
  const circleArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/KuraCircle.sol/KuraCircle.json"),
      "utf8"
    )
  );

  console.log("\n=== UPDATE frontend/src/config/contracts.ts ===");
  console.log(`KURA_CIRCLE_ADDRESS = "${kuraCircleAddr}"`);
  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
