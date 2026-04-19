import { ethers } from "hardhat";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/node";
import { Encryptable } from "@cofhe/sdk";
import { arbSepolia } from "@cofhe/sdk/chains";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

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

  // Deploy debug contract
  console.log("Deploying KuraCircleDebug...");
  const Factory = await ethers.getContractFactory("KuraCircleDebug");
  const debug = await Factory.deploy({ gasLimit: 5_000_000 });
  await debug.waitForDeployment();
  console.log("Deployed at:", await debug.getAddress());

  // Set min contribution
  console.log("\nSetting min contribution...");
  const encMin = (await cofheClient.encryptInputs([Encryptable.uint64(1_000_000n)]).execute())[0];
  let tx = await debug.setMinContribution(encMin, { gasLimit: 5_000_000 });
  let r = await tx.wait();
  console.log("setMinContribution:", r?.status === 1 ? "OK" : "FAILED", "gas:", r?.gasUsed.toString());

  // Test each step
  for (let step = 1; step <= 4; step++) {
    console.log(`\n--- Step ${step} ---`);
    const enc = (await cofheClient.encryptInputs([Encryptable.uint64(2_000_000n)]).execute())[0];
    const fnName = `testStep${step}`;
    try {
      let args: any[] = [enc];
      if (step === 4) args.push("0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f"); // cUSDC address
      tx = await (debug as any)[fnName](...args, { gasLimit: 5_000_000 });
      r = await tx.wait();
      console.log(`Step ${step}:`, r?.status === 1 ? "SUCCESS" : "REVERTED", "gas:", r?.gasUsed.toString());
    } catch (err: any) {
      console.error(`Step ${step}: FAILED`);
      const receipt = err.receipt;
      if (receipt) {
        console.log("  gas used:", receipt.gasUsed?.toString());
      }
      console.error("  reason:", err.reason || "none");
      console.error("  data:", err.data || "none");
      break; // Stop at first failure
    }
  }
}

main().catch(console.error);
