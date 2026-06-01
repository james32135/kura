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

Billions save through rotating circles—tontines, chit funds, susu, arisan—because pooled discipline works where formal credit does not. On-chain coordination adds enforceable rules and global reach; it also makes every contribution, bid, and vote a permanent public record. Observers infer income, strategy, and reputation from behavior never meant to be broadcast. KURA closes that gap: encrypted state, selective disclosure, threshold-governed publication—not surveillance by default. Members contribute to a shared pool each round; one receives the payout—contributions, bids, credit, votes, membership, and metadata stay encrypted via FHE and CoFHE.

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

State stays encrypted (`euint64`, `ebool`, `eaddress`) — computed in-contract, no intermediate decryption. **FHE** compares bids and pools on ciphertext. **CoFHE** (`@cofhe/sdk 0.5.1`, `@fhenixprotocol/cofhe-contracts v0.1.3`) handles ACL + `verifyDecryptResult(Batch)`. Wave 4: **sixteen FHE operations**, ten contracts — no plaintext amounts in normal operation.

---

## Vision

Confidential cooperative finance treats privacy as infrastructure, not a feature flag. Real savings will not move on-chain if competitors, employers, or governments can read contribution timing, bid strategy, or credit history. DeFi adoption at scale requires the confidentiality assumptions informal circles already rely on—implemented with cryptography, not social opacity. KURA targets verifiable coordination without surveillance: homomorphic enforcement, aggregates published only when the protocol explicitly closes a vote or auction.

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
| **Governance** | Individual votes never stored — encrypted counters until `closeVoteBatch` |
| **Disputes** | Admins see validity `ebool`, not claimed amounts |
| **Metadata** | Private circles revert reads for outsiders |

---

## Wave 4 Achievements

**6** contracts · **3** FHE ops (`rem`, `not`, `verifyDecryptResultBatch`) · **8** routes · **8** hooks · **7** fixes (`isAllowed` views, `viaIR`, tuple unpack, bool verify)

---

## Wave 5 · Live Validation

[kura-gilt.vercel.app](https://kura-gilt.vercel.app) · Circle `#0` · `0xf7...71a3` · round `1/3` · `2540ecc`: contribution 1 USDC (`$1` reveal) · bid 0.5 USDC · stream 0.001/block × 10 · governance vote · dispute 0.1 USDC · vault · registry.

**Txs:** `0x262ba5d3...` · `0xc071bf...` · `0x54282b...` · `0x66e262...` · `0xbe0858...` · `0xe7b6dc...` · `0x3f1c59...`

**7** fix commits · iframe proxy · full `InEuint64` ABI · 3 pre-fix reverts resolved.

---

## Why This Was Technically Difficult

Plaintext ROSCA on ERC-20 is a weekend project. A private one is a systems problem.

| Surface | Ciphertext requirement |
|:--|:--|
| **Contributions** | Encrypted cUSDC · silent minimum · homomorphic pools |
| **Governance** | No stored ballots · `closeVoteBatch` threshold verify |
| **Membership** | `eaddress` slots · `FHE.rem` without count leaks |
| **Credit** | Encrypted scores · tier proofs · `FHE.square` weight |
| **Disputes** | Blind resolve · admin sees `ebool` only |
| **Publication** | `verifyDecryptResult(Batch)` · no forged plaintext |

**Engineering solved:** non-view `isAllowed` ACL · committee threshold verify · full CoFHE ABI `(ctHash, securityZone, utype, signature)` · `/storage-hub.html` iframe proxy · `getGasFees` on Wave 5 hooks · `FHE.rem` slots · blind dispute `ebool` · `FHE.eq(eaddress)` escrow self-claim · COOP/COEP removal

---

## Closing

The standard for cooperative finance infrastructure is not higher throughput alone—it is whether participants must broadcast their financial lives to use it. KURA answers no. A **complete ROSCA lifecycle** runs on ciphertext: membership, streaming payments, blind disputes, quadratic credit governance, credit-gated ReineiraOS escrow.

**13** contracts · **16** FHE operations · **15** deployments on Arbitrum Sepolia · **86** passing tests · **7** confirmed live transactions on production Vercel. Threshold decryption verified. Privacy preserved by architecture, not policy.

What blockchains made transparent for auditors, KURA makes confidential for savers—the prerequisite for inclusive DeFi.
