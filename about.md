# KURA Protocol

**Confidential rotating savings on Arbitrum Sepolia — encrypted ROSCAs powered by CoFHE**

| | |
|:--|:--|
| **Network** | Arbitrum Sepolia · chainId `421614` |
| **Contracts** | 13 protocol · 15 deployed addresses |
| **FHE operations** | 16 across 10 contracts |
| **Unit tests** | 86 passing |
| **Live app** | [kura-gilt.vercel.app](https://kura-gilt.vercel.app) |
| **Timeline** | Deployed 2026-05-03 · Wave 5 validated 2026-05-27 |
| **Stack** | Solidity 0.8.25 · viaIR · `@cofhe/sdk` · `@fhenixprotocol/cofhe-contracts` |

## Why ROSCAs · Why KURA

Billions save through rotating circles—tontines, chit funds, susu, arisan—because pooled discipline works where formal credit does not. On-chain coordination adds enforceable rules and global reach; it also makes every contribution, bid, and vote a permanent public record. Observers infer income, strategy, and reputation from behavior never meant to be broadcast. KURA closes that gap: encrypted state, selective disclosure, threshold-governed publication—not surveillance by default.

---

## The Problem

On a public blockchain without encryption, observers see who saved how much, who bid what discount to receive the pool early, and who carries reputation risk. Traditional on-chain ROSCAs trade privacy for enforceability — excluding communities needing both **rule transparency** and **behavioral confidentiality**.

> Visible savings behavior is predictive—and permanent on-chain.

---

## Why FHE · Why CoFHE

| Failure | Leak |
|:--|:--|
| Lump-sum | Timing |
| Sealed bids | Post-settlement exposure |
| Members | Enumeration |
| Governance | Traceable votes |

State stays encrypted (`euint64`, `ebool`, `eaddress`) — computed in-contract, no intermediate decryption. **FHE** compares bids and pools on ciphertext. **CoFHE** (`@cofhe/sdk 0.5.1`, `@fhenixprotocol/cofhe-contracts v0.1.3`) handles ACL + `verifyDecryptResult(Batch)`. Wave 4: **sixteen FHE operations**, ten contracts.

---

## Vision

Confidential cooperative finance treats privacy as infrastructure, not a feature flag. KURA targets verifiable coordination without surveillance.

---

## ReineiraOS Integration

KURA uses ReineiraOS for confidential value transfer and conditional settlement — where encrypted money must move with enforceable release rules.

| Component | Role |
|:--|:--|
| **cUSDC** | Confidential USDC for contributions, bids, StreamPay, escrow funding |
| **ConfidentialEscrow** | Holds encrypted payout until IConditionResolver approves redeem |
| **IConditionResolver** | ReineiraOS callback — `onConditionSet`, `isConditionMet` |
| **KuraConditionResolver** | Stores `(member, minScore)`; tier gate via KuraCredit stats |
| **KuraEscrowAdapter** | `createWinnerEscrow` / `fundEscrow` / `claimEscrow` bridge |

**Why ReineiraOS:** Direct pool transfers expose payout timing. ConfidentialEscrow keeps owner and balance encrypted; redemption requires `isConditionMet` (minScore 5/15/30/50 → Bronze–Diamond). `claimEscrowWithProof` uses `FHE.eq(eaddress)` + threshold verify. Interfaces inline in KURA Solidity — no ReineiraOS npm package. Deployed ConfidentialEscrow `0xC433…60Fa`, cUSDC `0x6b6e…89f`.

---

## Architecture

Vercel frontend · client encrypt · full CoFHE tuples on-chain · permit decrypt.

| Wave | Contracts |
|:--|:--|
| **1–3 Core** | KuraCircle · KuraBid · KuraCredit · KuraRoundOrder · KuraEscrowAdapter · KuraConditionResolver |
| **4 Privacy** | KuraMemberRegistry · KuraCreditV2 · KuraPrivacyVault · KuraStreamPay · KuraDisputeResolution · KuraGovernance |
| **External** | ConfidentialEscrow · cUSDC · USDC |

---

## Privacy Guarantees

| Domain | Guarantee |
|:--|:--|
| **Contributions** | Events emit `circleId` + round only — no address, no amount |
| **Bids** | Losing bids never publish |
| **Credit** | Scores encrypted; tier proofs return `ebool` without exact values |
| **Governance** | Individual votes never stored — counters until `closeVoteBatch` |
| **Disputes** | Admins see validity `ebool`, not claimed amounts |
| **Metadata** | Private circles revert reads for outsiders |

---

## Wave 4 · Wave 5

**Wave 4:** 6 contracts · 3 FHE ops (`rem`, `not`, `verifyDecryptResultBatch`) · 8 routes · 8 hooks · 7 fixes

**Wave 5:** [kura-gilt.vercel.app](https://kura-gilt.vercel.app) · Circle `#0` · 1 USDC contribution · 0.5 USDC bid · stream · governance · dispute · vault · registry · **7** confirmed txs

**Txs:** `0x262ba5d3…` · `0xc071bf…` · `0x54282b…` · `0x66e262…` · `0xbe0858…` · `0xe7b6dc…` · `0x3f1c59…`

---

## Why This Was Technically Difficult

| Surface | Requirement |
|:--|:--|
| **Contributions** | Encrypted cUSDC · silent minimum · homomorphic pools |
| **Governance** | No ballots stored · `closeVoteBatch` threshold verify |
| **Escrow** | ReineiraOS create/fund/redeem + tier gate + `FHE.eq(eaddress)` proof |
| **Publication** | `verifyDecryptResult(Batch)` · no forged plaintext |

**Engineering solved:** non-view `isAllowed` ACL · committee threshold verify · full CoFHE tuple ABI · `/storage-hub.html` iframe proxy · `getGasFees` hooks · `FHE.rem` slots · blind dispute `ebool` · bool escrow verify

---

## Closing

The standard for cooperative finance infrastructure is not higher throughput alone—it is whether participants must broadcast their financial lives to use it. KURA answers no. A **complete ROSCA lifecycle** runs on ciphertext: membership, streams, disputes, governance, and ReineiraOS credit-gated escrow for confidential settlement.

**13** contracts · **16** FHE operations · **15** deployments on Arbitrum Sepolia · **86** passing tests · **7** confirmed live transactions on production Vercel. Privacy preserved by architecture, not policy.

What blockchains made transparent for auditors, KURA makes confidential for savers.
