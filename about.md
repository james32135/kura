# KURA - Encrypted Community Savings Circles

### "Save Together. Know Nothing."

> The first savings circle protocol where every contribution, bid, credit score, and payout position is euint64 ciphertext - computed on Fhenix CoFHE, never decrypted in plaintext. Live on Arbitrum Sepolia.

---

## The Problem - $500B+ Market, Zero Privacy

1.2 billion people across 50+ countries rely on informal savings circles - chit funds (India, $80B+), stokvels (South Africa, $50B+), tandas (Mexico), susus (West Africa). These circles predate modern banking and remain the #1 savings mechanism in developing economies.

| Failure Mode | Impact |
|---|---|
| Social Shame | Visible amounts expose financial status, circle collapses |
| Leader Coercion | Admin sees all balances, pressures members, embezzles quietly |
| Free-Rider Fraud | Early payees stop contributing, last members bear all default risk |
| No Credit History | Years of reliable saving produce zero portable credit history |

---

## Six Smart Contracts (All Deployed + Verified on Arbiscan)

| Contract | Address | What It Does |
|---|---|---|
| KuraCircle | 0x5B2DBDCC210Df55486BdBc7E1A16B1f8CF0673b7 | FHE.add() pool accumulation, FHE.gte() minimum check, reputation-gated membership |
| KuraBid | 0x0179416EfeD421aB3582B2b4Cb238450d60A9Af1 | Sealed-bid auction - FHE.lte() compares, FHE.select() tracks lowest bidder as eaddress, losing bids never decrypted |
| KuraCredit | 0xF6e42A0523373F6Ef89d91E925a4a93299b75144 | +1/contribution, +5/circle, 5 tiers (Open-Diamond), double-blind FHE.gte() |
| KuraRoundOrder | 0x7204C03033ad8FfBAFfdE9313fd14cAF0Df7182a | FHE.randomCiphertext(euint8) for provably-fair encrypted payout positions |
| KuraConditionResolver | 0xA35d76dbbe380a75777F93C6773A20f5ebAbA744 | ReineiraOS IConditionResolver, gates escrow redemption on encrypted credit tiers |
| KuraEscrowAdapter | 0xaa9814c029302aA3d66C502D2210c456aC3c9aD8 | Bridges payouts to ConfidentialEscrow (ReineiraOS) with claim/unwrap |
| cUSDC | 0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f | Confidential USDC (ConfidentialERC20) for encrypted deposits |

---

## Wave 3 - What We Added (All Live)

### FHE.randomCiphertext - Provably-Fair Payout Ordering
The #1 reason ROSCAs collapse is organizer fraud. assignOrder() generates FHE.randomCiphertext(euint8) — an encrypted seed nobody can read. Each member gets a position via FHE.add(base, offset_i) with FHE.allow(pos, member) access. Only that member can decrypt via wallet permit. No override possible.

### Reputation-Gated Circles
Circle creators set a minimum tier (Open / Bronze+ / Silver+ / Gold+ / Diamond+) at creation time. joinCircle() calls getMemberTier(msg.sender) and reverts silently if the member does not qualify — without revealing their actual score.

### Browse Circles Discovery Page
/app/browse multicalls getCircleInfo for every deployed circle. Stats bar: Total / Open / Completed. Live search by circle ID, status filter, member fill bar, reputation tier badge per card. Auto-refreshes every 20 seconds.

### Guided Onboarding Wizard
4-step /app/onboarding flow auto-shown on first visit: circle explainer, FHE privacy guarantees, wallet connection, credit tier preview. Stores kura_onboarded in localStorage.

### Fiat On-Ramp (Transak)
@transak/transak-sdk on the Contribute page. Pre-fills USDC on Arbitrum for the connected wallet. Banner shown when user has not yet contributed. One tap from fiat to encrypted deposit.

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

Savings circle apps have raised $30M+ in VC funding without privacy. India: 150M+ chit fund users, $80B+ annual market. South Africa: $50B+ annual stokvel circulation. Mexico: 60% participates in tandas. KURA is the first to encrypt everything on-chain.

TAM: $500B+ | SAM: $50B+ | SOM: $6M Year 1

---

## Roadmap

| Wave | Deliverable | Status |
|---|---|---|
| Wave 2 | 6 contracts, sealed-bid with eaddress, encrypted credit 5 tiers, escrow, auto-settle, full dApp | Live |
| Wave 3 | SDK 0.5.1, FHE.randomCiphertext ordering, reputation gates, onboarding, Transak, Browse Circles, 39 tests | Live |
| Wave 4 | DeFi credit bridge - encrypted KURA score to undercollateralized lending | Next |
| Wave 5 | Multi-chain, $KURA FHERC20 token, governance | Planned |

---

## Tech Stack

Fhenix CoFHE | @cofhe/sdk 0.5.1 | Solidity 0.8.25 | @fhenixprotocol/cofhe-contracts | React 19 | TypeScript | Vite 7 | wagmi 2.19 | viem 2.48 | RainbowKit | TanStack Router | Tailwind v4 | Framer Motion | Arbitrum Sepolia chainId 421614

Tests: 39 passing / 14 pending (FHE mock limitation) / 0 failing

---

> KURA - Save together. Know nothing. Build credit. Built with Fhenix CoFHE on Arbitrum Sepolia.