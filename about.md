# KURA - Encrypted Community Savings Circles

### "Save Together. Know Nothing."

> The first savings circle protocol where every contribution, bid, credit score, and payout position is euint64 ciphertext - computed on-chain via Fhenix CoFHE, never decrypted in plaintext. Live on Arbitrum Sepolia.

---

## The Problem - $500B+ Market, Zero Privacy

1.2 billion people across 50+ countries rely on informal savings circles - chit funds (India, $80B+), stokvels (South Africa, $50B+), tandas (Mexico), susus (West Africa). These circles predate modern banking and remain the #1 savings mechanism in developing economies.

They all share one fatal flaw: transparency.

| Failure Mode | Impact |
|---|---|
| Social Shame | Visible amounts expose financial status, members drop out, circle collapses |
| Leader Coercion | Admin sees all balances, pressures members, embezzles quietly |
| Free-Rider Fraud | Early recipients stop contributing, last members bear all default risk |
| No Credit History | Years of reliable saving produce zero portable credit history |

Every existing platform exposes contribution amounts in plaintext. The privacy gap is KURA's entire market opportunity.

---

## The Solution - FHE-Powered Privacy

KURA encrypts every financial action using Fhenix CoFHE on Arbitrum Sepolia. All on-chain values are euint64 ciphertext. Block explorers see hashes, never amounts.

---

## Six Smart Contracts (All Deployed + Verified on Arbiscan)

| Contract | Address | What It Does |
|---|---|---|
| KuraCircle | 0x5B2DBDCC210Df55486BdBc7E1A16B1f8CF0673b7 | Encrypted contributions, pool via FHE.add(), reputation-gated membership |
| KuraBid | 0x0179416EfeD421aB3582B2b4Cb238450d60A9Af1 | Sealed-bid auction, FHE.lte() compares, FHE.select() tracks lowest bidder as eaddress. Losing bids never decrypted |
| KuraCredit | 0xF6e42A0523373F6Ef89d91E925a4a93299b75144 | +1/contribution, +5/circle. Five tiers: Open, Bronze, Silver, Gold, Diamond. getMemberTier() for gates. Double-blind FHE.gte() |
| KuraRoundOrder | 0x7204C03033ad8FfBAFfdE9313fd14cAF0Df7182a | FHE.randomCiphertext(euint8) assigns encrypted payout positions, no admin can see or manipulate the order |
| KuraConditionResolver | 0xA35d76dbbe380a75777F93C6773A20f5ebAbA744 | ReineiraOS IConditionResolver, gates escrow on encrypted credit tiers |
| KuraEscrowAdapter | 0xaa9814c029302aA3d66C502D2210c456aC3c9aD8 | Bridges payouts to ConfidentialEscrow with claim/unwrap |
| cUSDC | 0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f | Confidential USDC (ConfidentialERC20) for deposits |

---

## Wave 3 - What We Added (All Live)

### FHE.randomCiphertext - Provably-Fair Payout Ordering
The number one reason real-world ROSCAs collapse is organizer fraud: they pay themselves and friends first, then vanish. KURA eliminates this entirely with on-chain encrypted randomness.

assignOrder(circleId) generates FHE.randomCiphertext(euint8) as an encrypted seed nobody can read. Each member gets a unique position derived via FHE.add(base, offset_i) and access granted via FHE.allow(pos, member). Only that member can call decryptForView() in their browser using their wallet signature. The orderAssigned flag is set permanently - no override possible.

### Reputation-Gated Circles
Circle creators pick a minimum tier (Open / Bronze+ / Silver+ / Gold+ / Diamond+) when creating a circle. joinCircle() calls getMemberTier(msg.sender) and reverts silently if the member does not qualify - without revealing their actual score.

| Tier | Points Needed | How to Earn |
|---|---|---|
| Open | 0 | Any wallet |
| Bronze | 5 | 5 on-time contributions |
| Silver | 15 | 15 contributions or 3 complete circles |
| Gold | 30 | 6 complete circles |
| Diamond | 50 | 10 complete circles |

### CoFHE SDK 0.5.1 Migration
Upgraded to the latest API: createCofheConfig({ supportedChains }), createCofheClient(config), Encryptable.uint64(value), client.permits.getOrCreateSelfPermit(). All SDK imports are lazy (await import()) to prevent Temporal Dead Zone crashes caused by circular dependencies in the tfhe WASM module.

### Browse Circles Discovery Page
/app/browse multicalls getCircleInfo for every deployed circle. Stats bar shows Total / Open / Completed counts. Live search by circle ID, status filter, member fill bar, reputation tier badge per card. Auto-refreshes every 20 seconds. Solves the key discovery gap where users could not find circles without knowing the exact ID.

### Guided Onboarding Wizard
4-step /app/onboarding flow auto-shown on first visit: What is a savings circle, FHE privacy guarantees, Connect wallet via RainbowKit, Credit tier preview with all five tiers. Skip button at every step. Stores kura_onboarded in localStorage to prevent re-show.

### Fiat On-Ramp (Transak)
@transak/transak-sdk embedded in the Contribute page. Banner appears when a user is in an active circle but has not contributed. Pre-fills USDC on Arbitrum for the connected wallet. One-click path from fiat to encrypted savings circle deposit.

### Animated FHE Progress UX
ProgressStepper rebuilt with Framer Motion. Pulsing active step icon, green checkmark on completion, per-step progress bar fill. Cycling FHE icon set (Lock, Cpu, Eye, Zap). Used in contribute, bid, score reveal, and position reveal flows.

---

## FHE Operations

FHE.asEuint64 - convert encrypted inputs
FHE.asEaddress - encrypted address type for lowest bidder tracking
FHE.add - pool accumulation, score increment, position derivation
FHE.sub - deduct discount from pool
FHE.gte - contribution check, credit verification
FHE.lte - compare bids to track lowest
FHE.eq - winner identification
FHE.select - encrypted ternary conditional logic
FHE.randomCiphertext - encrypted on-chain randomness for payout order
FHE.allow - per-member access control
FHE.allowThis - contract self-access for intermediate values
FHE.allowPublic - publish handle for settlement
FHE.sealoutput - permit-based encrypted viewing
decryptForView - client-side private reveals via wallet permit
decryptForTx - on-chain settlement decryption

---

## Why FHE - Not ZK, MPC, or TEE

| Capability | ZK | MPC | FHE (KURA) |
|---|---|---|---|
| Sum encrypted values on-chain | No | Requires all online | Yes via FHE.add() |
| Compare two secrets | Limited | Slow | Yes via FHE.lte() and FHE.gte() |
| Sealed-bid on ciphertext | No | Partial | Yes via FHE.select(eaddress) |
| Permanent losing bid privacy | N/A | N/A | Yes, never decrypted |
| Async participation | Yes | No, all must be online | Yes, deposit anytime |
| Composable on-chain credit | Attestation only | No | Yes, double-blind FHE.gte() |
| Encrypted on-chain randomness | No | No | Yes, FHE.randomCiphertext() |

FHE is the only technology that supports server-side computation on encrypted data without ever decrypting it. ZK proofs can verify claims but cannot compute new results from hidden values. MPC requires synchronized participation. FHE allows any member to deposit at any time, while contracts compute sums, minimums, and comparisons on ciphertext - permanently private.

---

## Access Control

| Data | Who Sees | Method |
|---|---|---|
| Contribution amount | Member only | FHE.allow(handle, member) |
| Pool total | Admin only | FHE.allow(pool, admin) |
| Bids | Bidder only | FHE.allow(bid, bidder) |
| Payout position | Member only | FHE.allow(pos, member) |
| Winning bid | Published | decryptForTx + publishDecryptResult |
| Credit score | Member only | FHE.allow(score, member) |
| Raw plaintext | NEVER | No allowPublic on user data |

---

## Market Validation

Savings circle apps have raised $30M+ in VC funding without privacy. India has 150M+ chit fund users and an $80B+ annual market. South Africa has $50B+ annual stokvel circulation. 60% of Mexico participates in tandas. Digital circle apps in the Philippines hit 100K users in 12 months. Every single one of these exposes contribution amounts. KURA is the first to encrypt everything.

TAM: $500B+ | SAM: $50B+ | SOM: $6M Year 1

---

## Roadmap

| Wave | Deliverable | Status |
|---|---|---|
| Wave 2 | 6 contracts, sealed-bid with eaddress, encrypted credit 5 tiers, escrow, auto-settle, dApp | Live |
| Wave 3 | SDK 0.5.1, FHE.randomCiphertext ordering, reputation gates, onboarding, Transak, Browse Circles, PWA, 39 tests | Live |
| Wave 4 | DeFi credit bridge, KURA encrypted score to undercollateralized lending | Next |
| Wave 5 | Multi-chain, $KURA FHERC20 token, governance | Planned |

---

## Tech Stack

Fhenix CoFHE | @cofhe/sdk 0.5.1 | Solidity 0.8.25 | @fhenixprotocol/cofhe-contracts | React 19 | TypeScript | Vite 7 | wagmi 2.19 | viem 2.48 | RainbowKit | TanStack Router | Tailwind v4 | Framer Motion | Arbitrum Sepolia chainId 421614

Tests: 39 passing / 14 pending (FHE mock limitation) / 0 failing

---

> KURA - Save together. Know nothing. Build credit. Built with Fhenix CoFHE on Arbitrum Sepolia.
