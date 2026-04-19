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

  // Check TaskManager has code
  const tmCode = await ethers.provider.getCode("0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9");
  console.log("TaskManager code length:", tmCode.length, "(hex chars)");
  console.log("TaskManager has code:", tmCode !== "0x");

  // Setup viem clients
  const privateKey = (process.env.PRIVATE_KEY!.startsWith("0x") ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http("https://sepolia-rollup.arbitrum.io/rpc"),
  });
  const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http("https://sepolia-rollup.arbitrum.io/rpc"),
  });

  const config = createCofheConfig({ supportedChains: [arbSepolia] });
  const cofheClient = createCofheClient(config);
  await cofheClient.connect(publicClient, walletClient);

  // Test 1: Try createCircle (which also calls FHE.asEuint64)
  console.log("\n--- TEST 1: createCircle ---");
  const kuraCircle = await ethers.getContractAt(
    "KuraCircle",
    "0x6598A3f8BA862e758CaF02Bf8678dE457df192DB"
  );
  
  const encMin = (await cofheClient.encryptInputs([Encryptable.uint64(1_000_000n)]).execute())[0];
  console.log("Encrypted min contribution OK");
  
  try {
    const tx1 = await kuraCircle.createCircle(3, 86400, 3, encMin, { gasLimit: 5_000_000 });
    console.log("createCircle TX:", tx1.hash);
    const r1 = await tx1.wait();
    console.log("createCircle status:", r1?.status === 1 ? "SUCCESS" : "REVERTED");
    console.log("createCircle gas used:", r1?.gasUsed.toString());
  } catch (err: any) {
    console.error("createCircle FAILED");
    const r = err.receipt;
    if (r) {
      console.log("  status:", r.status);
      console.log("  gas used:", r.gasUsed?.toString());
    }
    console.error("  reason:", err.reason || "none");
  }

  // Test 2: Try contribute on the new circle (no cUSDC transfer expected to succeed, but 
  // the FHE operations before it should work)
  console.log("\n--- TEST 2: Direct verifyInput via TaskManager ---");
  const taskManager = new ethers.Contract("0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9", [
    "function verifyInput(tuple(uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature) input, address sender) external returns (uint256)",
  ], signer);
  
  const encTest = (await cofheClient.encryptInputs([Encryptable.uint64(999n)]).execute())[0];
  console.log("Encrypted test value OK");
  
  try {
    const tx2 = await taskManager.verifyInput(encTest, signer.address, { gasLimit: 5_000_000 });
    console.log("verifyInput TX:", tx2.hash);
    const r2 = await tx2.wait();
    console.log("verifyInput status:", r2?.status === 1 ? "SUCCESS" : "REVERTED");
    console.log("verifyInput gas used:", r2?.gasUsed.toString());
  } catch (err: any) {
    console.error("verifyInput FAILED");
    const r = err.receipt;
    if (r) {
      console.log("  status:", r.status);
      console.log("  gas used:", r.gasUsed?.toString());
    }
    console.error("  reason:", err.reason || "none");
    console.error("  data:", err.data || "none");
  }
}

main().catch((err) => {
  console.error("Script error:", err.message);
  process.exit(1);
});
