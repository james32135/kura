import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// KuraBid v2 — adds encrypted bidder tracking for one-click auto-settlement.
// Existing KuraCircle + KuraCredit + cUSDC addresses are unchanged.
const KURA_CIRCLE_ADDRESS = "0x7224E14fFD2b49da0D7Bf375b17Df8894DA39047";
const CUSDC_ADDRESS = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Redeploying KuraBid v2 with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  console.log("\n--- Deploying KuraBid v2 ---");
  const KuraBid = await ethers.getContractFactory("KuraBid");
  const kuraBid = await KuraBid.deploy(KURA_CIRCLE_ADDRESS, CUSDC_ADDRESS);
  await kuraBid.waitForDeployment();
  const kuraBidAddr = await kuraBid.getAddress();
  console.log("KuraBid v2 deployed to:", kuraBidAddr);

  // Write ABI snapshot for verification
  const abi = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/KuraBid.sol/KuraBid.json"),
      "utf8"
    )
  ).abi;
  console.log("\nABI exports", abi.length, "items");
  console.log("Has getLowestBidderEncHandle:",
    abi.some((x: any) => x.name === "getLowestBidderEncHandle"));

  console.log("\n=== UPDATE frontend/src/config/contracts.ts ===");
  console.log(`KURA_BID_ADDRESS = "${kuraBidAddr}"`);
  console.log("\nAlso paste the new ABI into KURA_BID_ABI from:");
  console.log("  artifacts/contracts/KuraBid.sol/KuraBid.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
