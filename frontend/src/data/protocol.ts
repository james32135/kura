/** Canonical KURA protocol facts — sourced from deployed contracts & Wave 5 validation */

export const PROTOCOL = {
  name: "KURA",
  tagline: "Confidential Cooperative Finance",
  network: "Arbitrum Sepolia",
  chainId: 421614,
  liveUrl: "https://kura-gilt.vercel.app",
  deployed: "2026-05-03",
  validated: "2026-05-27",
  deployCommit: "2540ecc",
  compiler: "Solidity 0.8.25",
  viaIR: true,
  optimizerRuns: 200,
  evmVersion: "cancun",
  fheLibrary: "@fhenixprotocol/cofhe-contracts v0.1.3",
  fheSdk: "@cofhe/sdk 0.5.1",
  deployer: "0xd462cc45b06Ae45daCd93F7B3979758C7b4a2cc0",
} as const;

export const STATS = {
  protocolContracts: 13,
  deployedAddresses: 15,
  fheOperations: 16,
  fheEnabledContracts: 10,
  wave4NewContracts: 6,
  wave4UpdatedContracts: 4,
  wave4NewRoutes: 8,
  wave4NewHooks: 8,
  testsPassing: 86,
  testsPending: 15,
  wave4BugFixes: 7,
  wave5FixCommits: 7,
  confirmedLiveTxs: 7,
  verifiedWorkflows: 13,
} as const;

export const CONTRACTS = {
  wave13: [
    { name: "KuraCircle", address: "0x5B2DBDCC210Df55486BdBc7E1A16B1f8CF0673b7", wave: "1–3" },
    { name: "KuraRoundOrder", address: "0x7204C03033ad8FfBAFfdE9313fd14cAF0Df7182a", wave: "1–3" },
    { name: "KuraBid", address: "0x0179416EfeD421aB3582B2b4Cb238450d60A9Af1", wave: "1–3" },
    { name: "KuraCredit", address: "0xF6e42A0523373F6Ef89d91E925a4a93299b75144", wave: "1–3" },
    { name: "KuraConditionResolver", address: "0xA35d76dbbe380a75777F93C6773A20f5ebAbA744", wave: "1–3" },
    { name: "KuraEscrowAdapter", address: "0xaa9814c029302aA3d66C502D2210c456aC3c9aD8", wave: "1–3" },
  ],
  wave4: [
    { name: "KuraMemberRegistry", address: "0xE0408164FddD15adD420D8A5f9Ec8a8DA0F84708" },
    { name: "KuraCreditV2", address: "0x5fBc73FBBD343132483710AEA444aE3AD778a339" },
    { name: "KuraPrivacyVault", address: "0x7c8B4B5eC17e0B641909ca686cA6E4F7e5967cA9" },
    { name: "KuraStreamPay", address: "0x99dfa41b6614e170A46D1DEbB12fB7C6f9779b6f" },
    { name: "KuraDisputeResolution", address: "0xB6c337d636e258A062eE7de44299d8d7C5B91C55" },
    { name: "KuraGovernance", address: "0xf5396b80498F84FFe6EAACdaA2eaD9DbC934ce96" },
  ],
  external: [
    { name: "ConfidentialEscrow", address: "0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa" },
    { name: "cUSDC", address: "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f" },
    { name: "USDC", address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" },
  ],
} as const;

export const FHE_OPS = [
  { op: "FHE.sub", contracts: "KuraStreamPay", purpose: "Stream balance & refund math" },
  { op: "FHE.mul", contracts: "KuraCircle, KuraCreditV2, KuraStreamPay", purpose: "Pool target, weighted score, stream lock" },
  { op: "FHE.div", contracts: "KuraCreditV2", purpose: "Weighted score normalization" },
  { op: "FHE.rem", contracts: "KuraMemberRegistry", purpose: "Encrypted random slot selection", wave4: true },
  { op: "FHE.square", contracts: "KuraCreditV2", purpose: "Quadratic governance weight" },
  { op: "FHE.and", contracts: "KuraCreditV2", purpose: "Tier range verification" },
  { op: "FHE.or", contracts: "KuraMemberRegistry", purpose: "Membership slot matching" },
  { op: "FHE.not", contracts: "KuraGovernance", purpose: "Vote absence proof", wave4: true },
  { op: "FHE.eq(eaddress)", contracts: "KuraMemberRegistry, KuraEscrowAdapter", purpose: "Address equality & winner self-claim" },
  { op: "FHE.gt", contracts: "KuraStreamPay", purpose: "Active stream check" },
  { op: "FHE.min", contracts: "KuraStreamPay", purpose: "Cap payment to remaining balance" },
  { op: "FHE.allowSender", contracts: "KuraRoundOrder, KuraCreditV2, KuraMemberRegistry", purpose: "Grant caller decrypt access" },
  { op: "FHE.isAllowed", contracts: "KuraCredit, KuraCreditV2, KuraMemberRegistry, KuraStreamPay, KuraDisputeResolution", purpose: "ACL guard on handle reads" },
  { op: "FHE.verifyDecryptResult", contracts: "KuraBid, KuraEscrowAdapter", purpose: "Single threshold decryption verify" },
  { op: "FHE.verifyDecryptResultBatch", contracts: "KuraGovernance", purpose: "Batch tally verification", wave4: true },
  { op: "FHE.getDecryptResultSafe", contracts: "KuraBid", purpose: "Read published bid decryption" },
] as const;

export const LIVE_TXS = [
  { label: "Stream Pay create", hash: "0x262ba5d3cac571e56b0256107af316b2f5483838034a9bda5891e908010b3960" },
  { label: "Governance proposal", hash: "0xc071bfe4b8d28a8bd5f55cfad99a32e49d870ccb733a0c5d89e74fa3c25294ca" },
  { label: "Encrypted vote", hash: "0x54282b84bb77f3209ec99f890958702379061f1488a7a78eaf6966e603a3fd19" },
  { label: "Dispute raise", hash: "0x66e26262cc7f3ed58467df3d50908a60fd623a59dff48bc66187de0521dca61e" },
  { label: "Privacy vault init", hash: "0xbe0858f0217f65e39048ad7803437224ab9b3e54c9a7f79079fd85e5dc493d67" },
  { label: "Member registry", hash: "0xe7b6dc5ad5acc2cc180f5d2b3e36c17372d70886dff9a2eec2860e72bb0826c6" },
  { label: "Stream operator", hash: "0x3f1c59c51e8de69f2a51d6e8cd049fa83f7c77190646ea91e244c04ec97aa402" },
] as const;

export const PRIVACY_GUARANTEES = [
  { domain: "Contributions", guarantee: "Events emit circleId + round only — no address, no amount" },
  { domain: "Bids", guarantee: "Losing bids never publish; only winning bid after closeRound" },
  { domain: "Credit", guarantee: "Scores encrypted; tier proofs return ebool without exact values" },
  { domain: "Governance", guarantee: "Individual votes never stored — counters until closeVoteBatch" },
  { domain: "Disputes", guarantee: "Admins see validity ebool, not claimed amounts" },
  { domain: "Membership", guarantee: "eaddress slots; isMember returns ebool without slot index" },
  { domain: "Metadata", guarantee: "Private circles revert reads for outsiders" },
] as const;

export const ENCRYPTED_SURFACES = [
  "Contribution amounts & pool balances",
  "Sealed bid values & winner address (until close)",
  "Credit scores & tier proofs",
  "Governance votes & tallies (until threshold close)",
  "Member addresses in registry slots",
  "Circle names & descriptions (Privacy Vault)",
  "Stream rates, locked totals & paid amounts",
  "Dispute claimed amounts",
] as const;

export const DEPENDENCIES: { contract: string; dependsOn: string[] }[] = [
  { contract: "KuraCircle", dependsOn: ["KuraCredit", "cUSDC", "KuraRoundOrder"] },
  { contract: "KuraBid", dependsOn: ["KuraCircle", "cUSDC"] },
  { contract: "KuraEscrowAdapter", dependsOn: ["ConfidentialEscrow", "KuraCircle", "cUSDC", "KuraConditionResolver"] },
  { contract: "KuraGovernance", dependsOn: ["KuraCircle", "KuraCreditV2"] },
  { contract: "KuraStreamPay", dependsOn: ["cUSDC", "KuraCircle"] },
  { contract: "KuraMemberRegistry", dependsOn: ["KuraCircle"] },
  { contract: "KuraDisputeResolution", dependsOn: ["KuraCircle"] },
  { contract: "KuraPrivacyVault", dependsOn: ["Circle admin"] },
  { contract: "KuraConditionResolver", dependsOn: ["KuraCredit", "ConfidentialEscrow"] },
];

export const WAVE5_FIXES = [
  { commit: "4903b1b", purpose: "Circle action guards — explicit selected-circle checks" },
  { commit: "31d6621", purpose: "Stream Pay preparation flow" },
  { commit: "0e5cf97", purpose: "Governance proposal indexing; Dispute round defaults" },
  { commit: "2540ecc", purpose: "getGasFees(publicClient) on Wave 5 write hooks" },
  { commit: "d25c245", purpose: "Removed COOP/COEP headers breaking wallet/iframe" },
  { commit: "94efd68", purpose: "CoFHE storage hub proxy via /storage-hub.html" },
  { commit: "e845ed7", purpose: "Full InEuint64/InEbool tuple ABIs" },
] as const;
