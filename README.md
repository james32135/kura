# KURA — Encrypted Community Savings Circles

<div align="center">

### *"Save Together. Know Nothing."*

**The first savings circle protocol where every contribution, bid, credit score, and payout position is `euint64` ciphertext — computed on-chain via FHE, never decrypted in plaintext.**

[![Arbitrum Sepolia](https://img.shields.io/badge/Arbitrum_Sepolia-Live-blue?style=flat-square)](https://sepolia.arbiscan.io) [![Contracts](https://img.shields.io/badge/Smart_Contracts-6_Deployed-teal?style=flat-square)]() [![FHE Ops](https://img.shields.io/badge/FHE_Operations-14+-purple?style=flat-square)]() [![CoFHE SDK](https://img.shields.io/badge/Fhenix_CoFHE-@cofhe/sdk_0.5.1-orange?style=flat-square)]() [![Tests](https://img.shields.io/badge/Tests-39_passing-green?style=flat-square)]()

[Launch App](https://kura-gilt.vercel.app/app) · [Documentation](https://kura-gilt.vercel.app/docs) · [Arbiscan](https://sepolia.arbiscan.io)

</div>

---

## The Problem — $500B Market, Zero Privacy

**1.2 billion people** across 50+ countries save through informal community circles — chit funds (India, $80B+), stokvels (South Africa, $50B+), tandas (Mexico), susus (West Africa), paluwagan (Philippines). These circles are the **#1 savings mechanism** in developing economies, predating modern banking by centuries.

They break because of one design flaw: **transparency.**

| Failure Mode | What Happens |
|---|---|
| **Social Shame** | Visible contributions expose financial status → members drop out → circle collapses |
| **Leader Coercion** | Admin sees all balances → pressures members for loans, embezzles quietly |
| **Free-Rider Fraud** | Early pool recipients stop contributing → last members bear all default risk |
| **No Credit History** | Years of reliable saving produce zero formal credit → banks and DeFi ignore it |

**Every existing solution** (Money Fellows, eqb, on-chain protocols) exposes contribution amounts. KURA encrypts everything.

---

## The Solution — Six Smart Contracts, Complete Privacy

KURA encrypts every financial action using **Fhenix CoFHE** (Fully Homomorphic Encryption). Every value stored on-chain is a ``euint64`` ciphertext handle — block explorers see ``0xa3f2...``, never ``$50.00``.

### Contract Architecture (All Deployed on Arbitrum Sepolia)

| Contract | Address (Arb Sepolia) | Purpose |
|---|---|---|
| **KuraCircle.sol** | `0x5B2DBDCC210Df55486BdBc7E1A16B1f8CF0673b7` | Encrypted contributions, reputation-gated membership, round lifecycle |
| **KuraBid.sol** | `0x0179416EfeD421aB3582B2b4Cb238450d60A9Af1` | Sealed-bid auction — FHE.lte auto-detects lowest bidder as eaddress |
| **KuraCredit.sol** | `0xF6e42A0523373F6Ef89d91E925a4a93299b75144` | Encrypted credit score — getMemberTier() gate, double-blind verification |
| **KuraRoundOrder.sol** | `0x7204C03033ad8FfBAFfdE9313fd14cAF0Df7182a` | FHE.randomCiphertext() for provably-fair encrypted payout ordering |
| **KuraConditionResolver** | `0xA35d76dbbe380a75777F93C6773A20f5ebAbA744` | ReineiraOS escrow gate — credit tier enforcement |
| **KuraEscrowAdapter** | `0xaa9814c029302aA3d66C502D2210c456aC3c9aD8` | Bridge to ConfidentialEscrow for winner payouts |
| **cUSDC (test)** | `0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f` | Confidential USDC for circle deposits |

### How a Round Works

```
Member encrypts $50  →  FHE.asEuint64()  →  stored as euint64 ciphertext
                                              │
FHE.gte(amount, minimum)  →  verify compliance without plaintext
FHE.add(pool, amount)      →  accumulate pool as encrypted sum
                                              │
FHE.lte(bidA, bidB)        →  sealed-bid comparison
FHE.select()               →  track lowest bidder as eaddress
                                              │
decryptForTx + publishDecryptResult  →  settle winner on-chain
FHE.add(creditScore, 1)               →  build encrypted reputation
FHE.randomCiphertext(euint8)          →  assign payout order privately
```

**Arbiscan sees:** `0xa3f2...` (ciphertext handle)
**Member sees:** `$50.00` (decrypted privately via CoFHE SDK `decryptForView`)
**Admin sees:** `8/10 contributed` (count only, no amounts)

---

## FHE Operations

| Operation | Contract | Purpose |
|---|---|---|
| `FHE.asEuint64()` | All | Convert encrypted inputs |
| `FHE.asEaddress()` | KuraBid | Encrypted address type for lowest bidder |
| `FHE.add(a, b)` | Circle, Credit, RoundOrder | Pool accumulation, score increment, position derivation |
| `FHE.sub(a, b)` | Bid | Deduct discount from pool |
| `FHE.gte(a, b)` | Circle, Credit | Contribution check, credit verification |
| `FHE.lte(a, b)` | Bid | Compare bids to track lowest |
| `FHE.eq(a, b)` | Bid | Winner identification |
| `FHE.select(c, a, b)` | Circle, Bid | Encrypted ternary |
| `FHE.randomCiphertext()` | RoundOrder | Encrypted on-chain randomness for payout order |
| `FHE.allow(h, addr)` | All | Per-member access control |
| `FHE.allowThis()` | All | Contract self-access for intermediate values |
| `FHE.allowPublic()` | Bid | Publish handle for settlement |
| `FHE.sealoutput()` | All | Permit-based encrypted viewing |
| `decryptForView` | SDK | Client-side private reveals via wallet permit |

**Decrypt flow:** ``decryptForView`` (UI balances) + ``decryptForTx`` + ``publishDecryptResult`` (round settlement)

---

## Why FHE — Not ZK, MPC, or TEE

| Alternative | Why It Fails for Savings Circles |
|---|---|
| **ZK Proofs** | Proves "I contributed ≥ minimum" but cannot compute pool totals or find minimum bid across multiple encrypted inputs |
| **MPC** | Requires all 10-20 members online simultaneously — impractical across time zones with unreliable internet |
| **TEE** | Raw amounts decrypted inside hardware — one enclave compromise exposes all member data |
| **Commit-Reveal** | Reveal phase exposes amounts permanently — shame and coercion return |
| **FHE** | Encrypted arithmetic on contributions, sealed-bid comparison, async, permanent privacy ✅ |

---

## Access Control

| Data | Who Sees | Mechanism |
|---|---|---|
| Individual contribution | Member only | ``FHE.allow(handle, member)`` |
| Pool total | Admin only | ``FHE.allow(pool, admin)`` |
| Individual bids | Bidder only | ``FHE.allow(bid, bidder)`` |
| Winning bid | All (published) | ``decryptForTx`` + ``publishDecryptResult`` |
| Credit score | Member only | ``FHE.allow(score, member)`` |
| Credit check result | Requester only | ``FHE.allow(ebool, requester)`` |
| Raw plaintext | **NEVER** | No ``FHE.allowPublic()`` on user data |

---

## What KURA Has Built (Wave 2 + Wave 3, All Live)

### Smart Contracts (6 Deployed, All Verified on Arbiscan)
- **KuraCircle.sol** — Full circle lifecycle: create, join, encrypted contribute (FHE.asEuint64 + FHE.gte + FHE.add), reputation-gated membership via getMemberTier(), round rotation, pool transfer
- **KuraBid.sol** — Sealed-bid auction with `FHE.lte` + `FHE.select` auto-detection of lowest bidder via `eaddress`. Settlement via `decryptForTx` + `publishDecryptResult`
- **KuraCredit.sol** — Encrypted credit scoring: +1 per contribution, +5 per circle completion. Five tiers (Open→Bronze→Silver→Gold→Diamond). `getMemberTier()` public view for reputation gates. Double-blind `FHE.gte` verification
- **KuraRoundOrder.sol** — `FHE.randomCiphertext(euint8)` generates an encrypted random seed on-chain. Each member's payout position is derived with `FHE.add(base, offset)` and granted with `FHE.allow(pos, member)` — only that member can decrypt their turn
- **KuraConditionResolver.sol** — ReineiraOS `IConditionResolver` for credit-gated escrow release
- **KuraEscrowAdapter.sol** — Bridge to ConfidentialEscrow with claim/unwrap flow

### Protocol Features
- **Multi-circle support** — Create, join, and manage multiple circles simultaneously
- **One-click auto-settle** — Close bidding → detect winner (FHE) → settle → transfer pool → advance round
- **Reputation gates** — Circle creators set minimum tier; joinCircle() enforces it without revealing the member's score
- **Provably-fair payout order** — `FHE.randomCiphertext()` means no admin can manipulate who gets paid first
- **Client-side FHE encryption** — `@cofhe/sdk 0.5.1` encrypts values in the browser; lazy-loaded to prevent WASM TDZ crashes

### Production Frontend
- **React 19 SPA** with wagmi 2.19, viem 2.48, RainbowKit, TanStack Router, Tailwind v4, Framer Motion
- **9 app pages** — Dashboard, Contribute, Bid, Reputation/Credit, Admin, Browse Circles, Onboarding, Manage Circle, Docs
- **Browse Circles** — `/app/browse` multicalls all on-chain circles, live search + status filter
- **Guided onboarding wizard** — 4-step first-visit flow explaining FHE privacy + wallet setup
- **Transak fiat on-ramp** — Buy USDC directly from the Contribute page, pre-filled with wallet address
- **Animated FHE progress** — Framer Motion `ProgressStepper` with pulsing icons and per-step fill bar
- **Encrypted balance reveals** — `decryptForView` with sessionStorage caching + stale-permit retry

---

## Product-Market Fit

| Evidence | What It Proves |
|---|---|
| **Money Fellows** raised **$31M Series B** | Savings circles are venture-scale |
| **150M+ people** in India use chit funds | Massive existing user base |
| **$50B+ annual** stokvel circulation (South Africa) | Proven market size |
| **60% of Mexicans** participate in tandas | Deep cultural penetration |
| **eqb** reached **100K users** in 12 months | Digital savings circles grow fast |
| All existing apps expose contribution amounts | Privacy gap = KURA's opportunity |

**TAM:** $500B+ · **SAM:** $50B+ · **SOM (Year 1):** $6M (1K circles × 10 members × $50/month)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Encryption** | Fhenix CoFHE, @cofhe/sdk 0.5.1 |
| **Contracts** | Solidity 0.8.25, @fhenixprotocol/cofhe-contracts |
| **Frontend** | React 19, TypeScript, Vite 7 |
| **Wallet** | wagmi 2.19, viem 2.48, RainbowKit |
| **Routing** | TanStack Router (file-based SPA) |
| **Styling** | Tailwind v4, Framer Motion |
| **Chain** | Arbitrum Sepolia (chainId 421614) |
| **Tests** | Hardhat + Chai: 39 passing / 14 pending (FHE mock) / 0 failing |

---

## 5-Wave Roadmap

| Wave | Deliverable | Status |
|---|---|---|
| **Wave 2** | 6 contracts, 14 FHE ops, sealed-bid with eaddress, encrypted credit (5 tiers), ReineiraOS escrow, auto-settle, production dApp | **Live** ✅ |
| **Wave 3** | CoFHE SDK 0.5.1 migration, FHE.randomCiphertext payout ordering, reputation gates, onboarding wizard, Transak on-ramp, Browse Circles, mobile PWA, 39 tests | **Live** ✅ |
| **Wave 4** | DeFi credit bridge — KURA encrypted score → undercollateralized lending qualification via double-blind FHE.gte | Next 📋 |
| **Wave 5** | Multi-chain circles, $KURA FHERC20 savings token, institutional API, governance | Planned 🗓️ |

---

## Running Locally

```bash
# Contracts
cd contracts
npm install
npx hardhat compile

# Frontend
cd frontend
npm install
npm run dev        # Vite dev server at localhost:5173
npm run build      # Production build (tsc + vite)
npm run type-check # TypeScript validation
```

Requires Node 18+, Arbitrum Sepolia RPC, and a wallet with testnet ETH + cUSDC.

---

## Security Model

| Threat | Mitigation |
|---|---|
| Curious admin reads contributions | Contributions stored as ``euint64`` handles — admin sees count only, never amounts |
| Block explorer exposes bids | Bids are encrypted calldata — Etherscan sees ``InEuint64`` structs, not plaintext |
| Losing bidder's amount leaked | Only winning bidder published via ``decryptForTx`` — losing bids encrypted forever |
| DeFi lender learns exact credit score | ``verifyCreditworthiness`` uses double-blind ``FHE.gte`` — returns ``ebool`` only |
| Front-running sealed-bid auction | Bids are ciphertext — validators cannot read values to front-run |
| Replay of encrypted values | Each FHE input includes a unique proof bound to the sender — replay fails verification |

---

## Identity

| | |
|---|---|
| **Name** | KURA — "Choose" in Swahili |
| **Tagline** | *Save Together. Know Nothing.* |
| **Network** | Arbitrum Sepolia (chainId 421614) |
| **Live App** | kura-gilt.vercel.app |
| **Token** | $KURA (FHERC20, Wave 5) |

---

<div align="center">

**Save together. Know nothing. Build credit.**

Built with Fhenix CoFHE on Arbitrum Sepolia.

</div>
