import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Key addresses on Arbitrum Sepolia
const CUSDC_ADDRESS = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
const CONFIDENTIAL_ESCROW_ADDRESS = "0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying KURA contracts with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("cUSDC address:", CUSDC_ADDRESS);
  console.log("USDC address:", USDC_ADDRESS);

  // 1. Deploy KuraCredit (no dependencies)
  console.log("\n--- Deploying KuraCredit ---");
  const KuraCredit = await ethers.getContractFactory("KuraCredit");
  const kuraCredit = await KuraCredit.deploy();
  await kuraCredit.waitForDeployment();
  const kuraCreditAddr = await kuraCredit.getAddress();
  console.log("KuraCredit deployed to:", kuraCreditAddr);

  // 2. Deploy KuraRoundOrder with a placeholder — will re-set after KuraCircle is known.
  //    We use a two-phase deploy: KuraRoundOrder(address(0)) then upgrade kuraCircle reference.
  //    Since KuraRoundOrder stores kuraCircle as immutable we deploy it AFTER KuraCircle.
  //    To break the circular dependency: deploy KuraCircle with a temp zero address for roundOrder,
  //    then deploy KuraRoundOrder pointing to KuraCircle. KuraCircle stores the roundOrder address
  //    as a mutable state var (not immutable) so we set it after both are deployed.
  //
  //    HOWEVER — current KuraCircle constructor sets roundOrder in constructor from the arg.
  //    Since KuraRoundOrder.kuraCircle is immutable, we must deploy KuraCircle first (with a temp
  //    address), deploy KuraRoundOrder(kuraCircleAddr), then update KuraCircle.roundOrder via setRoundOrder().
  //
  //    We add setRoundOrder(address) to KuraCircle for this purpose.

  // 2a. Deploy KuraCircle with temp zero roundOrder
  console.log("\n--- Deploying KuraCircle (temp roundOrder = zero) ---");
  const KuraCircle = await ethers.getContractFactory("KuraCircle");
  const kuraCircle = await KuraCircle.deploy(kuraCreditAddr, CUSDC_ADDRESS, ethers.ZeroAddress);
  await kuraCircle.waitForDeployment();
  const kuraCircleAddr = await kuraCircle.getAddress();
  console.log("KuraCircle deployed to:", kuraCircleAddr);

  // 2b. Deploy KuraRoundOrder (points to KuraCircle)
  console.log("\n--- Deploying KuraRoundOrder ---");
  const KuraRoundOrder = await ethers.getContractFactory("KuraRoundOrder");
  const kuraRoundOrder = await KuraRoundOrder.deploy(kuraCircleAddr);
  await kuraRoundOrder.waitForDeployment();
  const kuraRoundOrderAddr = await kuraRoundOrder.getAddress();
  console.log("KuraRoundOrder deployed to:", kuraRoundOrderAddr);

  // 2c. Set the real roundOrder address on KuraCircle
  console.log("\n--- Setting KuraCircle.roundOrder to KuraRoundOrder ---");
  const setRoundOrderTx = await kuraCircle.setRoundOrder(kuraRoundOrderAddr);
  await setRoundOrderTx.wait();
  console.log("KuraCircle.roundOrder set to:", kuraRoundOrderAddr);

  // 3. Deploy KuraBid (depends on KuraCircle + cUSDC)
  console.log("\n--- Deploying KuraBid ---");
  const KuraBid = await ethers.getContractFactory("KuraBid");
  const kuraBid = await KuraBid.deploy(kuraCircleAddr, CUSDC_ADDRESS);
  await kuraBid.waitForDeployment();
  const kuraBidAddr = await kuraBid.getAddress();
  console.log("KuraBid deployed to:", kuraBidAddr);

  // 4. Deploy KuraConditionResolver (depends on KuraCredit + ConfidentialEscrow)
  console.log("\n--- Deploying KuraConditionResolver ---");
  const KuraConditionResolver = await ethers.getContractFactory("KuraConditionResolver");
  const kuraConditionResolver = await KuraConditionResolver.deploy(
    kuraCreditAddr,
    CONFIDENTIAL_ESCROW_ADDRESS
  );
  await kuraConditionResolver.waitForDeployment();
  const kuraConditionResolverAddr = await kuraConditionResolver.getAddress();
  console.log("KuraConditionResolver deployed to:", kuraConditionResolverAddr);

  // 5. Deploy KuraEscrowAdapter (depends on all above)
  console.log("\n--- Deploying KuraEscrowAdapter ---");
  const KuraEscrowAdapter = await ethers.getContractFactory("KuraEscrowAdapter");
  const kuraEscrowAdapter = await KuraEscrowAdapter.deploy(
    CONFIDENTIAL_ESCROW_ADDRESS,
    kuraCircleAddr,
    CUSDC_ADDRESS,
    kuraConditionResolverAddr
  );
  await kuraEscrowAdapter.waitForDeployment();
  const kuraEscrowAdapterAddr = await kuraEscrowAdapter.getAddress();
  console.log("KuraEscrowAdapter deployed to:", kuraEscrowAdapterAddr);

  // 6. Set authorizations
  console.log("\n--- Setting authorizations ---");
  const authCircleTx = await kuraCredit.setAuthorized(kuraCircleAddr, true);
  await authCircleTx.wait();
  console.log("KuraCircle authorized on KuraCredit");

  const authBidTx = await kuraCredit.setAuthorized(kuraBidAddr, true);
  await authBidTx.wait();
  console.log("KuraBid authorized on KuraCredit");

  const authAdapterTx = await kuraCredit.setAuthorized(kuraEscrowAdapterAddr, true);
  await authAdapterTx.wait();
  console.log("KuraEscrowAdapter authorized on KuraCredit");

  // 7. Generate frontend contract config
  console.log("\n--- Generating frontend config ---");

  const circleArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/KuraCircle.sol/KuraCircle.json"),
      "utf8"
    )
  );
  const bidArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/KuraBid.sol/KuraBid.json"),
      "utf8"
    )
  );
  const creditArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/KuraCredit.sol/KuraCredit.json"),
      "utf8"
    )
  );
  const resolverArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/KuraConditionResolver.sol/KuraConditionResolver.json"),
      "utf8"
    )
  );
  const escrowAdapterArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/KuraEscrowAdapter.sol/KuraEscrowAdapter.json"),
      "utf8"
    )
  );
  const roundOrderArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/KuraRoundOrder.sol/KuraRoundOrder.json"),
      "utf8"
    )
  );

  const contractsConfig = `// Auto-generated by deploy-kura.ts — DO NOT EDIT MANUALLY
// Deployed on Arbitrum Sepolia (421614)
// Deployer: ${deployer.address}
// Date: ${new Date().toISOString()}

export const CHAIN_ID = 421614;

// KURA Protocol contracts
export const KURA_CIRCLE_ADDRESS = "${kuraCircleAddr}" as const;
export const KURA_BID_ADDRESS = "${kuraBidAddr}" as const;
export const KURA_CREDIT_ADDRESS = "${kuraCreditAddr}" as const;
export const KURA_CONDITION_RESOLVER_ADDRESS = "${kuraConditionResolverAddr}" as const;
export const KURA_ESCROW_ADAPTER_ADDRESS = "${kuraEscrowAdapterAddr}" as const;
export const KURA_ROUND_ORDER_ADDRESS = "${kuraRoundOrderAddr}" as const;

// ReineiraOS / external contracts
export const CUSDC_ADDRESS = "${CUSDC_ADDRESS}" as const;
export const USDC_ADDRESS = "${USDC_ADDRESS}" as const;
export const CONFIDENTIAL_ESCROW_ADDRESS = "${CONFIDENTIAL_ESCROW_ADDRESS}" as const;

export const KURA_CIRCLE_ABI = ${JSON.stringify(circleArtifact.abi, null, 2)} as const;

export const KURA_BID_ABI = ${JSON.stringify(bidArtifact.abi, null, 2)} as const;

export const KURA_CREDIT_ABI = ${JSON.stringify(creditArtifact.abi, null, 2)} as const;

export const KURA_CONDITION_RESOLVER_ABI = ${JSON.stringify(resolverArtifact.abi, null, 2)} as const;

export const KURA_ESCROW_ADAPTER_ABI = ${JSON.stringify(escrowAdapterArtifact.abi, null, 2)} as const;

export const KURA_ROUND_ORDER_ABI = ${JSON.stringify(roundOrderArtifact.abi, null, 2)} as const;

// cUSDC minimal ABI for frontend
export const CUSDC_ABI = [
  { name: "wrap", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { name: "unwrap", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "value", type: "uint64" }], outputs: [] },
  { name: "claimUnwrapped", type: "function", stateMutability: "nonpayable", inputs: [{ name: "ctHash", type: "uint256" }], outputs: [] },
  { name: "setOperator", type: "function", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "until", type: "uint48" }], outputs: [] },
  { name: "isOperator", type: "function", stateMutability: "view", inputs: [{ name: "holder", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "bool" }] },
  { name: "confidentialBalanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }
] as const;

// USDC minimal ABI for wrap approval
export const USDC_ABI = [
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }
] as const;
`;

  const frontendConfigDir = path.join(__dirname, "../frontend/src/config");
  if (!fs.existsSync(frontendConfigDir)) {
    fs.mkdirSync(frontendConfigDir, { recursive: true });
  }
  fs.writeFileSync(path.join(frontendConfigDir, "contracts.ts"), contractsConfig);
  console.log("Frontend config written to frontend/src/config/contracts.ts");

  // Summary
  console.log("\n========================================");
  console.log("KURA Deployment Complete!");
  console.log("========================================");
  console.log("KuraCredit:              ", kuraCreditAddr);
  console.log("KuraCircle:              ", kuraCircleAddr);
  console.log("KuraBid:                 ", kuraBidAddr);
  console.log("KuraConditionResolver:   ", kuraConditionResolverAddr);
  console.log("KuraEscrowAdapter:       ", kuraEscrowAdapterAddr);
  console.log("KuraRoundOrder:          ", kuraRoundOrderAddr);
  console.log("cUSDC (ReineiraOS):      ", CUSDC_ADDRESS);
  console.log("ConfidentialEscrow:      ", CONFIDENTIAL_ESCROW_ADDRESS);
  console.log("Chain:                    Arbitrum Sepolia (421614)");
  console.log("Explorer:                 https://sepolia.arbiscan.io");
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
