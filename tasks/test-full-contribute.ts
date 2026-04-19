import { ethers } from "hardhat";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/node";
import { Encryptable } from "@cofhe/sdk";
import { arbSepolia } from "@cofhe/sdk/chains";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const KURA_CIRCLE = "0x7224E14fFD2b49da0D7Bf375b17Df8894DA39047";
const CUSDC = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
const USDC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  // Setup cofhe client
  const privateKey = (process.env.PRIVATE_KEY!.startsWith("0x") ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http("https://sepolia-rollup.arbitrum.io/rpc") });
  const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http("https://sepolia-rollup.arbitrum.io/rpc") });
  const config = createCofheConfig({ supportedChains: [arbSepolia] });
  const cofheClient = createCofheClient(config);
  await cofheClient.connect(publicClient, walletClient);

  const kuraCircle = await ethers.getContractAt("KuraCircle", KURA_CIRCLE);
  
  // Step 1: Create circle
  const circleCount = await kuraCircle.circleCount();
  if (circleCount === 0n) {
    console.log("\n--- Creating Circle ---");
    const encMin = (await cofheClient.encryptInputs([Encryptable.uint64(1_000_000n)]).execute())[0];
    const tx = await kuraCircle.createCircle(2, 86400 * 30, 2, encMin, { gasLimit: 5_000_000 });
    await tx.wait();
    console.log("Circle created");
  } else {
    console.log("Circle already exists, count:", circleCount.toString());
  }

  // Step 2: Start round
  const info = await kuraCircle.getCircleInfo(0n);
  if (info[3] === 0n) { // currentRound == 0
    console.log("\n--- Starting Round ---");
    const tx = await kuraCircle.startRound(0n, { gasLimit: 5_000_000 });
    await tx.wait();
    console.log("Round started");
  } else {
    console.log("Round already started:", info[3].toString());
  }

  // Step 3: Set operator for new KuraCircle
  const cusdc = new ethers.Contract(CUSDC, [
    "function isOperator(address, address) view returns (bool)",
    "function setOperator(address, uint48) external",
    "function confidentialBalanceOf(address) view returns (uint256)",
  ], signer);
  
  const isOp = await cusdc.isOperator(signer.address, KURA_CIRCLE);
  if (!isOp) {
    console.log("\n--- Setting Operator ---");
    const tx = await cusdc.setOperator(KURA_CIRCLE, 281474976710655, { gasLimit: 100_000 });
    await tx.wait();
    console.log("Operator set");
  } else {
    console.log("Operator already set");
  }

  // Check balance
  const bal = await cusdc.confidentialBalanceOf(signer.address);
  console.log("cUSDC balance handle:", bal.toString());
  console.log("Balance initialized:", bal !== 0n);

  // Step 4: Wrap some USDC if needed (user might need fresh cUSDC)
  // The user already wrapped before — they should have cUSDC from previous wraps
  // But the previous contribute failed (reverted), so the cUSDC was never spent
  
  // Step 5: Contribute!
  console.log("\n--- Contributing 2 USDC ---");
  const encAmount = (await cofheClient.encryptInputs([Encryptable.uint64(2_000_000n)]).execute())[0];
  console.log("Encrypted OK, ctHash:", encAmount.ctHash.toString().slice(0, 20) + "...");
  
  try {
    const tx = await kuraCircle.contribute(0n, encAmount, { gasLimit: 15_000_000 });
    console.log("TX submitted:", tx.hash);
    const receipt = await tx.wait();
    console.log("\n=== CONTRIBUTE RESULT ===");
    console.log("Status:", receipt?.status === 1 ? "SUCCESS ✅" : "REVERTED ❌");
    console.log("Gas used:", receipt?.gasUsed.toString());
    if (receipt?.logs) {
      console.log("Events:", receipt.logs.length);
      for (const log of receipt.logs) {
        try {
          const parsed = kuraCircle.interface.parseLog(log);
          if (parsed) console.log("  Event:", parsed.name, parsed.args);
        } catch {}
      }
    }
  } catch (err: any) {
    console.error("\n=== CONTRIBUTE FAILED ===");
    const receipt = err.receipt;
    if (receipt) {
      console.log("Gas used:", receipt.gasUsed?.toString());
      console.log("Gas limit: 15000000");
      console.log("Gas ratio:", (Number(receipt.gasUsed) / 15_000_000 * 100).toFixed(1) + "%");
    }
    console.error("Reason:", err.reason || "none");
    console.error("Data:", err.data || "none");
  }
}

main().catch(console.error);
