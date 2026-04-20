# 🔐 KURA — Encrypted Community Savings Circles

### *"Save Together. Know Nothing."*

> The first savings circle protocol where every contribution, bid, and credit score is euint64 ciphertext — computed on-chain via FHE, never decrypted.

---

## 🌍 The Problem — $500B+ Market, Zero Privacy

**1.2 billion people** across 50+ countries rely on informal savings circles — **chit funds** (India, $80B+), **stokvels** (South Africa, $50B+), **tandas** (Mexico), **susus** (West Africa). These circles predate modern banking and remain the #1 savings mechanism in developing economies.

They all share one fatal flaw: **transparency.**

| 😰 Failure Mode | 💥 Impact |
|---|---|
| **Social Shame** | Visible amounts expose financial status → members drop out |
| **Leader Coercion** | Admin sees all balances → pressures members, embezzles |
| **Free-Rider Fraud** | Early recipients stop contributing → last members lose |
| **No Credit History** | Years of saving produce zero portable credit |

**Every existing platform** — Money Fellows ($31M raised), eqb (100K users), chama apps, stokvel trackers — **exposes contribution amounts in plaintext.** The privacy gap is KURA's market opportunity.

---

## 🛡️ The Solution — FHE-Powered Privacy

KURA encrypts every financial action using **Fhenix CoFHE** on Arbitrum Sepolia. All on-chain values are euint64 ciphertext. Block explorers see hashes — never amounts.

### 🏗️ Six Smart Contracts (All Deployed)

| Contract | What It Does |
|---|---|
| 🔵 **KuraCircle** | Encrypted contributions via FHE.asEuint64(), pool accumulation via FHE.add(), validation via FHE.gte() + FHE.select() |
| 🟢 **KuraBid v2** | Sealed-bid auction — FHE.lte() compares, FHE.select() tracks lowest bidder as encrypted eaddress. Losing bids **never decrypted** |
| 🟣 **KuraCredit** | +1/contribution, +5/circle. Five tiers: Newcomer→Elite. Double-blind FHE.gte() verification |
| 🟡 **KuraConditionResolver** | ReineiraOS IConditionResolver — gates escrow on encrypted credit tiers |
| 🟠 **KuraEscrowAdapter** | Bridges payouts to ConfidentialEscrow with claim/unwrap |
| ⚪ **cUSDC** | Confidential USDC (ConfidentialERC20) for deposits |

### 🔑 14 FHE Operations

sEuint64 · sEaddress · dd · sub · min · gte · lte · eq · select · div · llowThis · llow · llowPublic · sealoutput

---

## ⚡ Wave 2 — What We Built (Live)

### Smart Contracts
- 📝 **KuraCircle** — Create → join → encrypt & contribute → round rotation → transfer encrypted pool
- 🎯 **KuraBid v2** — FHE.lte + FHE.select auto-detect lowest bidder as eaddress. Settlement via decryptForTx + publishDecryptResult
- ⭐ **KuraCredit** — Five-tier encrypted scoring with double-blind FHE.gte for DeFi composability
- 🔗 **Escrow Integration** — KuraConditionResolver + KuraEscrowAdapter for credit-gated payouts

### Protocol Features
- 🔄 Multi-circle support — manage multiple circles simultaneously
- ⚙️ One-click auto-settle — close → detect winner (FHE) → settle → transfer → advance
- 🔒 Client-side FHE via @cofhe/sdk 0.4 — encryption happens in your browser
- 👁️ Encrypted balance reveals with decryptForView + sessionStorage caching

### Production Frontend
- ⚛️ React 19, wagmi 2.19, viem 2.48, RainbowKit, TanStack Router, Tailwind v4, Framer Motion
- 📊 5 pages: Dashboard, Contribute (3-step flow), Bid, Reputation, Admin
- 📐 SVG flow diagrams explaining each FHE step to users

---

## 🧠 Why FHE — Not ZK, MPC, or TEE

| Capability | ZK | MPC | FHE (KURA) ✅ |
|---|---|---|---|
| Sum encrypted values on-chain | ❌ | All online required | ✅ FHE.add() |
| Compare two secrets | Limited | Slow | ✅ FHE.lte() |
| Sealed-bid on ciphertext | ❌ | Partial | ✅ FHE.select() |
| Permanent losing bid privacy | N/A | N/A | ✅ Never decrypted |
| Async participation | ✅ | ❌ | ✅ Anytime |
| Composable credit | Attestation | ❌ | ✅ Double-blind |

FHE is the **only** privacy technology that supports server-side computation on encrypted data without ever decrypting it. ZK can prove claims but cannot compute new results. MPC requires all parties online. FHE allows asynchronous encrypted arithmetic — perfect for savings circles.

---

## 🛡️ Access Control

| Data | Who Sees | Method |
|---|---|---|
| Contribution | Member only | FHE.allow(handle, member) |
| Pool total | Admin only | FHE.allow(pool, admin) |
| Bids | Bidder only | FHE.allow(bid, bidder) |
| Winning bid | Published | decryptForTx + publishDecryptResult |
| Credit score | Member only | FHE.allow(score, member) |
| Raw plaintext | **NEVER** | No llowPublic on user data |

---

## 📈 Market Validation

- 💰 Money Fellows: **$31M Series B** — savings circles without privacy
- 🇮🇳 India: **150M+** chit fund users
- 🇿🇦 South Africa: **$50B+** annual stokvel circulation
- 🇲🇽 Mexico: **60%** population in tandas
- 🇵🇭 Philippines: eqb hit **100K users** in 12 months

**TAM:** $500B+ · **SAM:** $50B+ · **SOM:** $6M

---

## 🗺️ Roadmap

| Wave | Deliverable | Status |
|---|---|---|
| **2** | 6 contracts, 14 FHE ops, sealed-bid v2, encrypted credit, escrow, auto-settle, dApp | ✅ **Live** |
| **3** | Fiat on-ramp, mobile UI, cross-circle reputation | 🔨 In Progress |
| **4** | DeFi credit bridge — encrypted score → undercollateralized lending | 📋 Next |
| **5** | Multi-chain, $KURA FHERC20 token, governance | 🗓️ Planned |

---

## 🔧 Tech Stack

Fhenix CoFHE · @cofhe/sdk 0.4 · Solidity 0.8.25 · React 19 · TypeScript · Vite 7 · wagmi 2.19 · iem 2.48 · RainbowKit · TanStack Router · Tailwind v4 · Framer Motion · Arbitrum Sepolia

---

> 🔐 **KURA** — *Save together. Know nothing. Build credit.* Built with Fhenix CoFHE on Arbitrum Sepolia.