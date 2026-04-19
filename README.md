# KURA — Encrypted Community Savings Circles

<div align="center">

### *"Save Together. Know Nothing."*

**The first savings circle protocol where every contribution, bid, and credit score is encrypted using Fully Homomorphic Encryption.**

[Launch App](https://kura-protocol.vercel.app/app) · [Documentation](https://kura-protocol.vercel.app/docs) · [Arbitrum Sepolia](https://sepolia.arbiscan.io/address/0x7224E14fFD2b49da0D7Bf375b17Df8894DA39047)

</div>

---

## The Problem — $500B Market, Zero Privacy

**1.2 billion people** save through informal community circles — chit funds (India, $80B+), stokvels (South Africa, $50B+), tandas (Mexico), susus (West Africa), paluwagan (Philippines). These are the **#1 savings mechanism** in developing economies.

They break because of transparency:

| Failure Mode | What Happens |
|---|---|
| **Social Shame** | Visible contributions expose financial status → members drop out → circle collapses |
| **Leader Coercion** | Admin sees all balances → pressures members for loans, embezzles quietly |
| **Free-Rider Fraud** | Early pool recipients stop contributing → last members bear all default risk |
| **No Credit History** | Years of reliable saving produce zero formal credit → banks and DeFi ignore it |

**Every existing solution** (Money Fellows, eqb, on-chain protocols) exposes contribution amounts. KURA encrypts everything.

---

## The Solution — Six Smart Contracts, Complete Privacy

KURA encrypts every financial action using **Fhenix CoFHE** (Fully Homomorphic Encryption). All values are ``euint64`` ciphertext — block explorers see only hashes, never amounts.

### Contract Architecture

| Contract | Address (Arb Sepolia) | Purpose |
|---|---|---|
| **KuraCircle.sol** | ``0x7224E14fFD2b49da0D7Bf375b17Df8894DA39047`` | Encrypted contributions, pool accumulation, round lifecycle |
| **KuraBid.sol v2** | ``0x5195ED6bB28293080A430F1bE2f3965F0d8ad083`` | Sealed-bid auction — FHE.lte auto-detects lowest bidder |
| **KuraCredit.sol** | ``0x26b1ea9Bb8Aa33086Fa5b4D32EA89b2Da6DD4B14`` | Encrypted credit score — double-blind verification |
| **KuraConditionResolver** | ``0x2aa7CC7BeCBc274cfe7Fef0F38034623c3bDEa7b`` | ReineiraOS escrow gate — credit tier enforcement |
| **KuraEscrowAdapter** | — | Bridge to ConfidentialEscrow for winner payouts |
| **cUSDC (Test)** | ``0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f`` | Test stablecoin for circle deposits |

### How a Round Works

```
Member encrypts $50  →  FHE.asEuint64()  →  stored as ciphertext
                                              │
FHE.gte(amount, minimum)  →  verify compliance (no plaintext)
FHE.add(pool, amount)      →  accumulate pool (encrypted math)
                                              │
FHE.lte(bidA, bidB)        →  sealed-bid comparison
FHE.select()               →  track lowest bidder as eaddress
                                              │
decryptForTx + publishDecryptResult  →  settle winner on-chain
FHE.add(creditScore, 1)               →  build encrypted reputation
```

**Etherscan sees:** ``0xa3f2...`` (ciphertext handle)  
**Member sees:** ``$50.00`` (decrypted privately via CoFHE SDK)  
**Admin sees:** ``8/10 contributed`` (count only, no amounts)

---

## 14 FHE Operations

| Operation | Contract | Purpose |
|---|---|---|
| ``FHE.asEuint64()`` | All | Convert encrypted inputs |
| ``FHE.asEaddress()`` | KuraBid v2 | Encrypted address type |
| ``FHE.add(a, b)`` | Circle, Credit | Pool accumulation, score increment |
| ``FHE.sub(a, b)`` | Bid | Deduct discount from pool |
| ``FHE.min(a, b)`` | Bid | Find lowest bid |
| ``FHE.gte(a, b)`` | Circle, Credit | Contribution check, credit verification |
| ``FHE.lte(a, b)`` | Bid v2 | Compare bids to track lowest |
| ``FHE.eq(a, b)`` | Bid | Winner identification |
| ``FHE.select(c, a, b)`` | Circle, Bid | Encrypted ternary |
| ``FHE.div(a, b)`` | Bid | Dividend distribution |
| ``FHE.allowThis()`` | All | Contract retains compute access |
| ``FHE.allow(h, addr)`` | All | Selective member access |
| ``FHE.allowPublic()`` | Bid v2 | Publish handle for settlement |
| ``FHE.sealoutput()`` | All | Permit-based viewing |

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

## Wave 2 — What We Built

Everything below is **deployed and functional** on Arbitrum Sepolia:

- **KuraCircle.sol** — Full circle lifecycle: create, join, encrypted contribute, round rotation, pool transfer
- **KuraBid.sol v2** — Sealed-bid auction with ``FHE.lte`` + ``FHE.select`` auto-detection of lowest bidder via ``eaddress``
- **KuraCredit.sol** — Encrypted credit scoring: +1 per contribution, +5 per circle completion, double-blind ``FHE.gte`` verification
- **KuraConditionResolver.sol** — ReineiraOS ``IConditionResolver`` for credit-gated escrow release
- **KuraEscrowAdapter.sol** — Bridge to ConfidentialEscrow with claim/unwrap flow
- **Multi-circle support** — Create, join, and manage multiple circles simultaneously
- **One-click auto-settle** — Admin clicks once → close bidding → detect winner (FHE) → settle → transfer pool → advance round
- **Production frontend** — React 19, wagmi/viem, RainbowKit, TanStack Router, client-side FHE encryption/decryption
- **Encrypted balance reveals** — ``decryptForView`` with sessionStorage caching
- **Encrypted credit tiers** — Newcomer → Contributor → Reliable → Trusted → Elite with point thresholds

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
| **Encryption** | Fhenix CoFHE (FHE.sol) |
| **SDK** | @cofhe/sdk 0.4 |
| **Decrypt** | decryptForView + decryptForTx + publishDecryptResult |
| **Smart Contracts** | Solidity 0.8.25, @fhenixprotocol/cofhe-contracts |
| **Frontend** | React 19, TypeScript, Vite 7 |
| **Wallet** | wagmi 2.19, viem 2.48, RainbowKit |
| **Routing** | TanStack Router v1.168 (SPA) |
| **Styling** | Tailwind v4, Framer Motion |
| **Chain** | Arbitrum Sepolia (421614) |

---

## 5-Wave Roadmap

| Wave | Deliverable | Status |
|---|---|---|
| **2** | Full protocol: encrypted circles, sealed-bid v2, credit scoring, escrow, multi-circle, auto-settle, production dApp | **Live** ✅ |
| **3** | Fiat on-ramp (Privara SDK), mobile UI, push notifications, cross-circle reputation | In Progress |
| **4** | DeFi credit bridge — KURA score → undercollateralized lending qualification | Next |
| **5** | Multi-chain circles, FHERC20 savings token, institutional API | Planned |

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

Requires Node 18+, Arbitrum Sepolia RPC, and a wallet with testnet ETH.

---

## Identity

| | |
|---|---|
| **Name** | KURA — "Choose" in Swahili |
| **Tagline** | *Save Together. Know Nothing.* |
| **Token** | $KURA (FHERC20, Wave 5) |

---

<div align="center">

**Save together. Know nothing. Build credit.**

Built with Fhenix CoFHE on Arbitrum Sepolia.

</div>
