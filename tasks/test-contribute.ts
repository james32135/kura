import hre, { ethers } from "hardhat";
import { Encryptable } from "@cofhe/sdk";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/node";
import { arbSepolia } from "@cofhe/sdk/chains";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  const kuraCircle = await ethers.getContractAt(
    "KuraCircle",
    "0x7224E14fFD2b49da0D7Bf375b17Df8894DA39047"
  );

  // Check preconditions
  const circleInfo = await kuraCircle.getCircleInfo(0n);
  console.log("Circle #0 currentRound:", circleInfo[3].toString());
  console.log("isMember:", await kuraCircle.isMember(0n, signer.address));
  console.log("hasContributed:", await kuraCircle.hasContributed(0n, circleInfo[3], signer.address));

  // Check cUSDC balance handle
  const cusdc = new ethers.Contract("0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f", [
    "function confidentialBalanceOf(address) view returns (uint256)",
    "function isOperator(address, address) view returns (bool)",
  ], ethers.provider);
  const balHandle = await cusdc.confidentialBalanceOf(signer.address);
  console.log("cUSDC balance handle (raw):", balHandle.toString());
  console.log("cUSDC balance initialized:", balHandle !== 0n);
  console.log("isOperator (signer->KuraCircle):", await cusdc.isOperator(signer.address, "0x7224E14fFD2b49da0D7Bf375b17Df8894DA39047"));

  // Create viem clients directly
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

  // Create cofhe client
  console.log("\nCreating cofhe client...");
  const config = createCofheConfig({ supportedChains: [arbSepolia] });
  const cofheClient = createCofheClient(config);
  await cofheClient.connect(publicClient, walletClient);
  console.log("Cofhe client connected");

  // Encrypt a contribution amount (2 USDC = 2_000_000 micro)
  console.log("Encrypting 2 USDC...");
  const encrypted = (await cofheClient
    .encryptInputs([Encryptable.uint64(2_000_000n)])
    .onStep((step: any) => console.log("  encrypt step:", String(step)))
    .execute())[0];
  console.log("Encrypted:", {
    ctHash: encrypted.ctHash.toString(),
    securityZone: encrypted.securityZone,
    utype: encrypted.utype,
    sigLen: encrypted.signature.length,
  });

  // Try to call contribute
  console.log("\nCalling contribute...");
  try {
    const tx = await kuraCircle.contribute(0n, encrypted, { gasLimit: 15_000_000 });
    console.log("TX submitted:", tx.hash);
    const receipt = await tx.wait();
    console.log("TX status:", receipt?.status === 1 ? "SUCCESS" : "REVERTED");
    console.log("Gas used:", receipt?.gasUsed.toString());
    console.log("Gas limit:", "15000000");
  } catch (err: any) {
    console.error("\n=== CONTRIBUTE FAILED ===");
    // Try to extract receipt from the error
    const receipt = err.receipt;
    if (receipt) {
      console.log("Receipt status:", receipt.status);
      console.log("Gas used:", receipt.gasUsed?.toString());
      console.log("Gas limit: 15000000");
      console.log("Gas ratio:", (Number(receipt.gasUsed) / 15_000_000 * 100).toFixed(1) + "%");
      console.log("Block:", receipt.blockNumber?.toString());
    }
    console.error("Error reason:", err.reason || "none");
    console.error("Error data:", err.data || "none");
    if (err.info?.error) {
      console.error("RPC error:", JSON.stringify(err.info.error, null, 2));
    }
  }
}

main().catch((err) => {
  console.error("Script error:", err.message);
  process.exit(1);
});
