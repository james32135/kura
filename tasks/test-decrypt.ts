import { ethers } from "hardhat";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/node";
import { FheTypes } from "@cofhe/sdk";
import { arbSepolia } from "@cofhe/sdk/chains";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const KURA_CIRCLE = "0x7224E14fFD2b49da0D7Bf375b17Df8894DA39047";
const KURA_CREDIT = "0x26b1ea9Bb8Aa33086Fa5b4D32EA89b2Da6DD4B14";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  const privateKey = (process.env.PRIVATE_KEY!.startsWith("0x")
    ? process.env.PRIVATE_KEY
    : `0x${process.env.PRIVATE_KEY}`) as `0x${string}`;
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

  // Setup cofhe client
  console.log("\n--- Setting up CoFHE client ---");
  const config = createCofheConfig({ supportedChains: [arbSepolia] });
  const cofheClient = createCofheClient(config);
  await cofheClient.connect(publicClient, walletClient);
  console.log("Connected");

  // Read contribution handle from KuraCircle
  console.log("\n--- Reading contribution handle ---");
  const kuraCircle = await ethers.getContractAt("KuraCircle", KURA_CIRCLE);
  
  // Check what circle/round this signer contributed to
  const circleInfo = await kuraCircle.getCircleInfo(0n);
  const currentRound = circleInfo[3];
  console.log("Circle #0 currentRound:", currentRound.toString());
  
  const hasContrib = await kuraCircle.hasContributed(0n, currentRound, signer.address);
  console.log("hasContributed:", hasContrib);

  if (!hasContrib) {
    console.log("Signer has not contributed this round - nothing to decrypt");
    return;
  }

  // getMyContribution returns euint64 (bytes32 in our FHE.sol)
  const handle = await kuraCircle.getMyContribution(0n);
  console.log("Raw handle (bytes32):", handle);
  
  // Convert bytes32 to uint256 (BigInt) - this is what CoFHE expects
  const handleBigInt = BigInt(handle);
  console.log("Handle as BigInt:", handleBigInt.toString());
  console.log("Handle as hex:", handleBigInt.toString(16).padStart(64, "0"));

  // Test 1: Try decryptForView with the handle
  console.log("\n--- Test 1: decryptForView on contribution ---");
  try {
    // Create permit first
    console.log("Creating self permit...");
    await cofheClient.permits.getOrCreateSelfPermit();
    console.log("Permit created");

    console.log("Calling decryptForView...");
    const result = await cofheClient
      .decryptForView(handleBigInt, FheTypes.Uint64)
      .execute();
    console.log("SUCCESS! Decrypted value:", result?.toString());
  } catch (err: any) {
    console.error("FAILED:", err?.message || err);
    // Try to see if there's more detail
    if (err?.cause) console.error("Cause:", err.cause);
  }

  // Test 2: Try decryptForView on credit score
  console.log("\n--- Test 2: decryptForView on credit score ---");
  try {
    const kuraCredit = await ethers.getContractAt("KuraCredit", KURA_CREDIT);
    const scoreHandle = await kuraCredit.getMyScore();
    console.log("Credit score handle (bytes32):", scoreHandle);
    const scoreHandleBigInt = BigInt(scoreHandle);
    console.log("Score handle as BigInt:", scoreHandleBigInt.toString());

    const scoreResult = await cofheClient
      .decryptForView(scoreHandleBigInt, FheTypes.Uint64)
      .execute();
    console.log("SUCCESS! Credit score:", scoreResult?.toString());
  } catch (err: any) {
    console.error("FAILED:", err?.message || err);
  }

  // Test 3: Try direct HTTP to sealOutput to see error body
  console.log("\n--- Test 3: Direct HTTP test to sealOutput ---");
  try {
    const testBody = {
      ct_tempkey: handleBigInt.toString(16).padStart(64, "0"),
      host_chain_id: 421614,
      permit: null, // intentionally invalid to see error format
    };
    console.log("Sending request with ct_tempkey:", testBody.ct_tempkey);
    const resp = await fetch(
      "https://testnet-cofhe-tn.fhenix.zone/v2/sealoutput",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testBody),
      }
    );
    console.log("Response status:", resp.status);
    const body = await resp.text();
    console.log("Response body:", body.slice(0, 500));
  } catch (err: any) {
    console.error("HTTP error:", err?.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script error:", err.message || err);
    process.exit(1);
  });
