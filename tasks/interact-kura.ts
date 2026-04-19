import { ethers } from "hardhat";

// Usage: npx hardhat run tasks/interact-kura.ts --network arb-sepolia

async function main() {
  const action = process.env.ACTION || "info";
  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);

  // Load deployed addresses from frontend config
  const contracts = await import("../frontend/src/config/contracts.js");
  const circleAddr = contracts.KURA_CIRCLE_ADDRESS;
  const bidAddr = contracts.KURA_BID_ADDRESS;
  const creditAddr = contracts.KURA_CREDIT_ADDRESS;

  const circle = await ethers.getContractAt("KuraCircle", circleAddr);
  const bid = await ethers.getContractAt("KuraBid", bidAddr);
  const credit = await ethers.getContractAt("KuraCredit", creditAddr);

  switch (action) {
    case "info": {
      console.log("Circle count:", (await circle.circleCount()).toString());
      break;
    }
    case "create-circle": {
      const maxMembers = parseInt(process.env.MAX_MEMBERS || "5");
      const roundDuration = parseInt(process.env.ROUND_DURATION || "3600");
      // For CLI interaction, we would need the cofhe SDK to encrypt
      // This is primarily used for frontend-driven operations
      console.log(`To create a circle with ${maxMembers} members and ${roundDuration}s rounds, use the frontend.`);
      break;
    }
    default:
      console.log("Available actions: info, create-circle");
      console.log("Set ACTION env var, e.g. ACTION=info npx hardhat run tasks/interact-kura.ts --network arb-sepolia");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
