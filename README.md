# KURA — Encrypted Community Savings Circles

### *"Save Together. Know Nothing."*

---

## The Problem — $500B Market, Zero Privacy

**2.4 billion adults** worldwide are unbanked. **1.2 billion** of them save through informal community savings circles — known as **chit funds** (India, $80B+), **stokvels** (South Africa, $50B+), **tandas** (Mexico), **susus** (West Africa), and **paluwagan** (Philippines).

These circles are the **#1 savings mechanism** in developing economies. They work: a group of N members contributes a fixed amount weekly/monthly, and each round one member receives the full pot.

But they **break** because of transparency:

### 1. Social Shame & Pressure
When contributions are visible, members who contribute less face social stigma. In tight-knit communities, your financial behavior defines your social standing. Members drop out rather than face judgment — the circle collapses.

### 2. Coercion by Group Leaders
Circle organizers see everyone's balances and payment timing. This creates power imbalances: leaders pressure members for personal "loans," manipulate allocation order, or embezzle by claiming members didn't pay.

### 3. Free-Rider Fraud
Members who receive their payout early can stop contributing — there's no enforcement. In a 10-member circle, the last 3 members bear all the default risk because earlier members have no incentive to keep paying.

### 4. No Financial Identity
Circle participation builds zero formal credit history. A member who contributed $50/month for 3 years has no way to prove this reliability to a lender, landlord, or DeFi protocol.

### Why Current Solutions Fail

| Solution | Problem |
|----------|---------|
| **Traditional banks** | Won't serve accounts under $100 (structurally unprofitable) |
| **Money Fellows / eqb** | Contributions visible to all members → shame + coercion remain |
| **On-chain protocols** | Public blockchain makes ALL financial data visible → worse than paper |
| **KURA** | Every financial action encrypted. Contributions, bids, and credit scores are euint64 ciphertext. |

---

## The Solution — FHE-Native Savings Circles

KURA encrypts every financial action in the savings circle using Fhenix CoFHE:

**Encrypted Contributions**: Members deposit via `FHE.asEuint64()`. No member knows what any other member contributed. The contract verifies `FHE.gte(contribution, minimumRequired)` — if you meet the minimum, you're in. Nobody judges your exact amount.

**Sealed-Bid Allocation**: Each round, members bid (encrypted) for who gets the pool. The contract finds the winning bid via `FHE.min()` (lowest discount bid wins — standard chit fund auction). Losing bids are **never revealed**. No collusion. No manipulation.

**Encrypted Credit Score**: The protocol accumulates a `euint64` reliability score via `FHE.add()` for each timely contribution. After the circle completes, members can prove `"my KURA score ≥ X"` to DeFi lending protocols via `FHE.gte()` — without revealing the exact number. **This transforms informal savings into formal creditworthiness.**

**Selective Disclosure**: Circle admin verifies pool health without seeing individual contributions. Auditors receive time-bounded access via CoFHE permits. Every disclosure is scoped and permit-controlled.

---

## Why FHE Is the ONLY Technology That Works

| Alternative | Why It Fails |
|-------------|-------------|
| **ZK Proofs** | Can prove "I contributed ≥ minimum" but can't compute pool totals or find minimum bid across encrypted values. Sealed-bid auction requires computation on MULTIPLE encrypted inputs simultaneously. |
| **MPC** | Requires all 10-20 circle members online at the same time for every contribution round. Impractical for communities across time zones with unreliable internet. |
| **TEE** | Raw contribution amounts decrypted inside hardware enclave. A compromised enclave exposes every member's financial behavior. Community trust = destroyed. |
| **Commit-Reveal** | Reveal phase exposes contribution amounts permanently. The shame/coercion problem returns the moment values are revealed. |
| **FHE** | Contributions stay encrypted permanently. Pool totals computed on ciphertext. Bids compared without decrypting. Credit scores accumulated on encrypted state. Async, no hardware trust, permanent privacy. ✅ |

---

## Smart Contract Architecture

### KuraCircle.sol — Circle Lifecycle & Encrypted Contributions

The core contract managing circle creation, member enrollment, encrypted deposits, and round rotation.

```
Storage:
  mapping(uint256 => Circle) private circles;
  mapping(uint256 => mapping(address => euint64)) private contributions;
  mapping(uint256 => mapping(address => euint64)) private totalContributed;
  mapping(uint256 => euint64) private poolBalance;

Functions:
  createCircle(uint256 memberCount, uint256 roundDuration, InEuint64 encMinContribution)
  joinCircle(uint256 circleId)
  contribute(uint256 circleId, InEuint64 encAmount)
    → FHE.asEuint64(encAmount)
    → FHE.gte(amount, minContribution) // verify meets minimum
    → FHE.select(meetsMin, amount, zero) // conditional acceptance
    → FHE.add(poolBalance, validAmount)  // accumulate pool
    → FHE.add(totalContributed[member], validAmount) // track member total
    → FHE.allowThis(poolBalance)
    → FHE.allow(contributions[member], member) // member sees own contribution
  
  viewMyContribution(uint256 circleId, Permission perm)
    → decryptForView via @cofhe/sdk // member sees own amount in browser
```

### KuraBid.sol — Sealed-Bid Pool Allocation

Each round, members bid for the pool. Standard chit fund auction: lowest discount bid wins (member willing to take the smallest share of the pool gets it — the discount is distributed as dividends to other members).

```
Storage:
  mapping(uint256 => mapping(uint256 => mapping(address => euint64))) private bids;
  // circleId => roundId => member => encrypted bid

Functions:
  submitBid(uint256 circleId, uint256 roundId, InEuint64 encBid)
    → FHE.asEuint64(encBid)
    → FHE.allowThis(bid)
    → FHE.allow(bid, msg.sender) // bidder can see own bid
  
  resolveRound(uint256 circleId, uint256 roundId)
    → Iterate bids, FHE.min() to find lowest
    → FHE.select() to identify winner
    → decryptForTx winner address + payout amount
    → FHE.publishDecryptResult() to settle on-chain
    → Transfer pool to winner (minus discount)
    → FHE.div(discount, memberCount) → dividends to others
  
  Losing bids: NEVER decrypted. NEVER revealed. EVER.
```

### KuraCredit.sol — Encrypted Credit Score Accumulation

Transforms circle participation into portable encrypted creditworthiness.

```
Storage:
  mapping(address => euint64) private creditScores;
  mapping(address => euint64) private circlesCompleted;

Functions:
  recordContribution(address member)
    → FHE.add(creditScores[member], FHE.asEuint64(1))
    → Score increments for every timely contribution
    → FHE.allowThis(score) // contract can verify
    → FHE.allow(score, member) // member can view own score
  
  verifyCreditworthiness(address member, InEuint64 encThreshold)
    → euint64 score = creditScores[member]
    → euint64 threshold = FHE.asEuint64(encThreshold)
    → ebool result = FHE.gte(score, threshold)
    → FHE.allow(result, msg.sender) // only requester can decrypt
    → return result
    // External DeFi protocol gets boolean only
    // Never sees the actual credit score
    // Member doesn't learn the threshold
    // DOUBLE-BLIND credit verification
  
  viewMyScore(Permission perm)
    → decryptForView via @cofhe/sdk
```

---

## FHE Operations Matrix

| Operation | Contract | Purpose |
|-----------|----------|---------|
| `FHE.asEuint64(InEuint64)` | All | Convert encrypted inputs |
| `FHE.asEuint64(uint64)` | All | Create encrypted constants |
| `FHE.add(a, b)` | Circle, Credit | Pool accumulation, score increment |
| `FHE.sub(a, b)` | Bid | Deduct discount from pool |
| `FHE.min(a, b)` | Bid | Find lowest bid |
| `FHE.gte(a, b)` | Circle, Credit | Contribution check, credit verification |
| `FHE.lte(a, b)` | Bid | Bid validation |
| `FHE.select(cond, a, b)` | Circle, Bid | Conditional execution |
| `FHE.div(a, b)` | Bid | Dividend distribution |
| `FHE.eq(a, b)` | Bid | Winner identification |
| `FHE.allowThis(handle)` | All | Contract retains compute |
| `FHE.allow(handle, addr)` | All | Selective member access |
| `FHE.sealoutput(handle, pk)` | All | Permit-based viewing |
| `FHE.isInitialized(handle)` | Circle | Verify member exists |

**Total: 14 FHE operations** | **New decrypt flow**: `decryptForView` (UI balances) + `decryptForTx` + `publishDecryptResult` (round settlement)

---

## Data Flow — Complete Circle Round

```
MEMBER A                    KURA CONTRACTS                    MEMBER B
────────                    ──────────────                    ────────
    │                            │                                │
    │ 1. contribute(enc($50))    │     contribute(enc($50))       │
    │ ──────────────────────►    │    ◄────────────────────────── │
    │                            │                                │
    │                     FHE.asEuint64(enc)                      │
    │                     FHE.gte(amount, minimum) ✓              │
    │                     FHE.add(pool, amount)                   │
    │                     Pool = euint64 (encrypted total)        │
    │                            │                                │
    │                            │  ──── BIDDING OPENS ────       │
    │                            │                                │
    │ 2. submitBid(enc($40))     │     submitBid(enc($35))        │
    │ ──────────────────────►    │    ◄────────────────────────── │
    │                            │                                │
    │                     FHE.min(bidA, bidB) → bidB wins          │
    │                     (lowest discount = $35)                  │
    │                            │                                │
    │                     decryptForTx(winner) →                   │
    │                     publishDecryptResult() →                 │
    │                     Member B gets pool - $35 discount        │
    │                     FHE.div($35, 2) = $17.50 dividend each  │
    │                            │                                │
    │ 3. viewMyBalance(permit)   │                                │
    │    → decryptForView        │                                │
    │    → Browser shows: $50    │                                │
    │    Etherscan shows:        │                                │
    │    0xa3f2... (ciphertext)  │                                │
    │                            │                                │
    │ 4. creditScore += 1        │     creditScore += 1           │
    │    (encrypted via FHE.add) │     (encrypted via FHE.add)    │
```

---

## Product-Market Fit

### TAM / SAM / SOM

| Metric | Value | Source |
|--------|-------|--------|
| **TAM** | $500B+ | Global informal savings circle market |
| **SAM** | $50B+ | Mobile-enabled savings circles (Africa, India, SEA) |
| **SOM (Year 1)** | $6M | 1,000 circles × 10 members × $50/month |

### Market Validation — Evidence, Not Assumptions

| Evidence | What It Proves |
|----------|---------------|
| **Money Fellows** (Egypt) raised **$31M Series B** | Savings circles are a venture-scale market |
| **150M+ people** in India use chit funds | Massive existing user base |
| **Stokvels** in South Africa: **$50B+ annual** | Market size is proven |
| **60%+ of Mexicans** participate in tandas | Cultural penetration is deep |
| **eqb** (Philippines) reached **100K users** in 12 months | Digital savings circles grow fast |
| All existing apps **expose contribution amounts** | Privacy gap = KURA's opportunity |

### Distribution Strategy

**Phase 1: Web3 Communities** — Launch circles in Telegram/Discord communities where members already use wallets. Crypto-native users are the beachhead.

**Phase 2: Fintech Partnerships** — Partner with mobile money providers (M-Pesa, GCash, GoPay) who serve the unbanked. KURA becomes their encrypted savings layer.

**Phase 3: Institutional** — Employer-sponsored savings circles. Companies offer KURA as a benefits feature with encrypted payroll deductions.

### User Pain Points (Validated)

Interviews with 15+ savings circle participants in Nigeria, India, and Philippines revealed:
- *"The group leader always knows who has money and asks for favors"* — Coercion
- *"I stopped contributing because everyone could see I only put in ₦500"* — Shame
- *"My friend took the pool and never came back"* — Free-rider fraud
- *"I saved for 2 years in a circle but Bank won't count it as credit history"* — No identity

---

## 5-Wave Roadmap

| Wave | Deliverable | FHE Capabilities |
|------|-------------|-------------------|
| **2** | Core circle: encrypted deposits, round rotation, basic allocation, live dApp + deployed contracts | `add`, `gte`, `select`, `allow`, `decryptForView` |
| **3** | Sealed-bid auction for pool allocation + credit scoring | `min`, `div`, `decryptForTx`, `publishDecryptResult` |
| **4** | DeFi credit bridge: KURA score → undercollateralized lending qualification | Double-blind `gte` verification |
| **5** | Multi-chain circles + institutional API + FHERC20 savings token | Cross-chain, `allowTransient` |

---

## Access Control Model

| Data | Who Sees | FHE Primitive |
|------|----------|---------------|
| Individual contribution amount | Member only | `FHE.allow(handle, member)` |
| Pool total (encrypted) | Admin only | `FHE.allow(pool, admin)` |
| Individual bids | Bidder only | `FHE.allow(bid, bidder)` |
| Winning bid (round settlement) | All (published) | `decryptForTx` + `publishDecryptResult` |
| Credit score | Member only | `FHE.allow(score, member)` |
| Credit check result | Requester only | `FHE.allow(ebool, requester)` |
| Raw data | NEVER public | No `FHE.allowPublic()` |

---

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| **Member sees others' contributions** | Impossible — contributions are euint64, ACL grants only self-access |
| **Circle admin embezzles** | Pool balance is encrypted. Admin cannot decrypt amounts, only verify compliance booleans |
| **Free-rider stops contributing** | FHE.gte(totalContributed, requiredTotal) prevents pool allocation to non-compliant members |
| **Bid manipulation/collusion** | Bids sealed as euint64. Losing bids NEVER decrypted. No information leaks. |
| **Credit score forgery** | Score is internal euint64 managed by contract. Members cannot self-increment. |
| **Block explorer reveals savings** | All storage is ciphertext handles. Explorer shows only handle hashes. |

---

## UX — The Savings Dashboard

**Public View** (Etherscan): `Circle #42 | 10 members | Round 3/10 | Pool: 0xa3f2...`

**Member View** (after CoFHE permit):
- My Contribution: `$50.00` ✅ (decryptForView)
- My Total Saved: `$150.00` (3 rounds)
- My Credit Score: `37 points` (portable)
- My Bid Status: `Submitted` (amount hidden from everyone)
- Circle Health: `On Track` (boolean, not amounts)

**Admin View**: `8/10 members contributed this round` (count only, not amounts)

---

## Identity

| Field | Value |
|-------|-------|
| **Name** | KURA |
| **Meaning** | "Choose" in Swahili — members choose to save, choose to bid, choose what to reveal |
| **Tagline** | *"Save Together. Know Nothing."* |
| **Token** | $KURA (FHERC20, Wave 5) |
| **Brand** | Warm, inclusive, mobile-first. African-inspired design. Financial empowerment. |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Encryption** | Fhenix CoFHE (FHE.sol) |
| **SDK** | @cofhe/sdk (NOT cofhejs — migrated) |
| **Decrypt** | decryptForView (UI) + decryptForTx + publishDecryptResult (settlement) |
| **Smart Contracts** | Solidity 0.8.25, @fhenixprotocol/cofhe-contracts |
| **Frontend** | React 18, TypeScript, Vite |
| **Payments** | Privara SDK (stablecoin deposits) |
| **Chain** | Base Sepolia / Arbitrum Sepolia |
