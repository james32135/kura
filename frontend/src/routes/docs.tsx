import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { Lock, Network, Code2, BookOpen, ChevronDown, Shield, Layers, Zap, Users, GitBranch, AlertTriangle, Sparkles } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — KURA Protocol" },
      {
        name: "description",
        content:
          "Official KURA Protocol documentation — architecture, smart contracts, FHE operations, and developer reference.",
      },
      { property: "og:title", content: "Documentation — KURA Protocol" },
      {
        property: "og:description",
        content: "Complete technical documentation for the KURA encrypted savings circle protocol.",
      },
    ],
  }),
  component: Docs,
});

const sections = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "architecture", label: "Architecture", icon: Network },
  { id: "contracts", label: "Smart Contracts", icon: Code2 },
  { id: "fhe", label: "FHE Operations", icon: Lock },
  { id: "why-fhe", label: "Why FHE", icon: Sparkles },
  { id: "access", label: "Access Control", icon: Shield },
  { id: "threats", label: "Threat Model", icon: AlertTriangle },
  { id: "flow", label: "Data Flow", icon: Layers },
  { id: "deployment", label: "Deployment", icon: Zap },
  { id: "faq", label: "FAQ", icon: Users },
];

function Docs() {
  return (
    <main className="relative bg-background text-foreground min-h-screen">
      <Navbar />
      <div className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 bg-radial-glow opacity-40 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
            Official Documentation
          </p>
          <h1 className="mt-4 font-display text-5xl md:text-6xl font-semibold tracking-tight">
            KURA <span className="text-gradient-accent">Protocol</span> Docs
          </h1>
          <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">
            Complete technical reference — six smart contracts, 14 FHE operations, five encrypted
            credit tiers, sealed-bid auction with eaddress tracking, and ReineiraOS escrow
            integration. Deployed on Arbitrum Sepolia with Fhenix CoFHE.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-[220px_1fr] gap-10">
        <aside className="hidden md:block sticky top-28 self-start">
          <ul className="space-y-1">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <article className="space-y-20 max-w-3xl">
          {/* ── OVERVIEW ── */}
          <Section id="overview" eyebrow="Overview" title="What is KURA?">
            <p>
              KURA is an on-chain savings circle protocol where <strong>every contribution, bid, and credit
              score exists as <code>euint64</code> ciphertext</strong> — computed on using Fully Homomorphic Encryption (FHE).
              Members deposit encrypted values; smart contracts perform arithmetic, comparison, and conditional selection
              on those ciphertexts; block explorers see only handles; and only the round winner ever decrypts a payout.
            </p>
            <p>
              The protocol mirrors the social structure of chamas (Kenya), tandas (Mexico),
              stokvels (South Africa), and chit funds (India) — serving a <strong>$500B+ informal savings
              market</strong> used by 1.2 billion people — but eliminates the failure modes caused by
              financial transparency: social shame, leader coercion, free-rider fraud, and absence of credit history.
            </p>
            <p>
              Six Solidity contracts use <strong>14 distinct FHE operations</strong> (add, sub, min, gte, lte, eq, select, div,
              asEuint64, asEaddress, allow, allowThis, allowPublic, sealoutput) to implement encrypted pool accumulation,
              sealed-bid auctions with eaddress tracking, five-tier encrypted credit scoring, and ReineiraOS escrow integration.
            </p>
            <p>
              Built on Fhenix CoFHE with <code>@cofhe/sdk 0.5.1</code>, deployed on
              Arbitrum Sepolia (chain 421614). The frontend is a React 19 SPA using wagmi, viem,
              RainbowKit, and TanStack Router with client-side FHE encryption.
            </p>
          </Section>

          {/* ── ARCHITECTURE ── */}
          <Section id="architecture" eyebrow="Architecture" title="System architecture">
            <p>
              KURA is composed of six Solidity contracts coordinating via shared encrypted state.
              The browser handles client-side encryption, transaction signing, and private decryption
              through the CoFHE SDK. All FHE computation runs on Fhenix coprocessors — the EVM
              never sees plaintext.
            </p>
            <pre className="rounded-xl bg-background/80 border border-border/60 p-5 font-mono text-xs leading-relaxed overflow-x-auto">{`Browser (CoFHE SDK · @cofhe/sdk 0.5.1)
   │ encrypt(amount) → inEuint64 + proof
   ▼
KuraCircle.sol  ──FHE.add──►  poolBalance: euint64
   │ contribute(ct, proof)        │
   ▼                              ▼
KuraBid.sol v2  ──FHE.lte──►  lowestBidderEnc: eaddress
   │ submitBid(ct, proof)   FHE.select()
   ▼                              ▼
KuraCredit.sol  ──FHE.add──►  creditScores: euint64
                ──FHE.gte──►  pass / fail (ebool)
   ▼
KuraConditionResolver.sol  ──verifyCondition──►  tier gate
   ▼
KuraEscrowAdapter.sol  ──► ConfidentialEscrow (ReineiraOS)`}</pre>
          </Section>

          {/* ── SMART CONTRACTS ── */}
          <Section id="contracts" eyebrow="Reference" title="Smart contract reference">
            <p className="text-sm text-muted-foreground mb-6">
              All contracts deployed on Arbitrum Sepolia. Solidity 0.8.25 with @fhenixprotocol/cofhe-contracts.
            </p>

            <ContractRef
              name="KuraCircle.sol"
              address="0x5B2DBDCC210Df55486BdBc7E1A16B1f8CF0673b7"
              fns={[
                ["createCircle(maxMembers, roundDuration, totalRounds, InEuint64 minContrib)", "Create a new savings circle with encrypted minimum contribution"],
                ["joinCircle(circleId)", "Join an existing circle as a member"],
                ["contribute(circleId, InEuint64 encAmount)", "Submit encrypted contribution — FHE.gte validates, FHE.add accumulates pool"],
                ["startRound(circleId)", "Open the next round (admin only)"],
                ["closeRound(circleId)", "Close current round when deadline elapses"],
                ["transferPool(circleId, winner)", "Transfer encrypted pool balance to round winner"],
                ["getPoolBalance(circleId) → euint64", "Returns encrypted pool (admin access only)"],
                ["viewMyContribution(circleId) → euint64", "Returns member's own encrypted contribution"],
              ]}
            />

            <ContractRef
              name="KuraBid.sol v2"
              address="0x0179416EfeD421aB3582B2b4Cb238450d60A9Af1"
              fns={[
                ["submitBid(circleId, roundId, InEuint64 encBid)", "Submit sealed discount bid — encrypted and compared via FHE.lte"],
                ["closeRound(circleId, roundId)", "Close bidding, FHE.allowPublic on winner handle"],
                ["settleRound(circleId, roundId, winner)", "Settle the round and record winner"],
                ["getLowestBidderEncHandle(circleId, round) → eaddress", "Returns encrypted address of lowest bidder (v2)"],
                ["getUserBidHandle(circleId, round, user) → euint64", "Returns user's own encrypted bid handle"],
              ]}
            />

            <ContractRef
              name="KuraCredit.sol"
              address="0xF6e42A0523373F6Ef89d91E925a4a93299b75144"
              fns={[
                ["recordContribution(member)", "Increment encrypted credit score by 1 via FHE.add"],
                ["recordCircleCompletion(member)", "Award +5 points for completing a full circle"],
                ["verifyCreditworthiness(member, InEuint64 threshold) → ebool", "Double-blind FHE.gte — neither score nor threshold revealed"],
                ["getCreditScore(member) → euint64", "Returns encrypted score (member access only)"],
                ["getCreditStats(member)", "Returns contribution count, on-time, late, circles completed, tier"],
              ]}
            />

            <ContractRef
              name="KuraConditionResolver.sol"
              address="0xA35d76dbbe380a75777F93C6773A20f5ebAbA744"
              fns={[
                ["verifyCondition(user, conditionData) → bool", "ReineiraOS IConditionResolver — gates escrow redemption on KURA credit tier"],
              ]}
            />

            <ContractRef
              name="KuraEscrowAdapter.sol"
              address=""
              fns={[
                ["createWinnerEscrow(circleId, round, winner, amount)", "Create escrow for round winner via ConfidentialEscrow"],
                ["claimEscrow(escrowId)", "Winner claims escrow after condition check"],
                ["claimAndUnwrap(escrowId)", "Claim and unwrap to plain USDC"],
              ]}
            />
          </Section>

          {/* ── FHE OPERATIONS ── */}
          <Section id="fhe" eyebrow="FHE Primitives" title="Encryption you can compute on">
            <p>
              Fully Homomorphic Encryption allows smart contracts to perform arithmetic, comparison,
              and conditional selection on encrypted values <strong>without decrypting them</strong>.
              KURA uses 14 distinct FHE operations across its contract suite.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-4 font-mono text-xs text-primary">Operation</th>
                    <th className="py-2 pr-4 font-mono text-xs text-primary">Used In</th>
                    <th className="py-2 font-mono text-xs text-primary">Purpose</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["FHE.asEuint64()", "All", "Convert encrypted input to euint64"],
                    ["FHE.asEaddress()", "KuraBid v2", "Convert address to encrypted address"],
                    ["FHE.add(a, b)", "Circle, Credit", "Pool accumulation, score increment"],
                    ["FHE.sub(a, b)", "Bid", "Deduct discount from pool payout"],
                    ["FHE.min(a, b)", "Bid", "Find lowest bid across members"],
                    ["FHE.gte(a, b)", "Circle, Credit", "Contribution check, credit verification"],
                    ["FHE.lte(a, b)", "Bid v2", "Compare bids to track lowest"],
                    ["FHE.eq(a, b)", "Bid", "Winner identification"],
                    ["FHE.select(cond, a, b)", "Circle, Bid", "Encrypted ternary — conditional logic"],
                    ["FHE.div(a, b)", "Bid", "Dividend distribution"],
                    ["FHE.allowThis()", "All", "Contract retains compute access"],
                    ["FHE.allow(h, addr)", "All", "Grant specific address access to handle"],
                    ["FHE.allowPublic()", "Bid v2", "Publish encrypted handle for settlement"],
                    ["FHE.sealoutput()", "All", "Permit-based encrypted viewing"],
                  ].map(([op, used, purpose]) => (
                    <tr key={op} className="border-b border-border/30">
                      <td className="py-2 pr-4 font-mono text-xs text-foreground">{op}</td>
                      <td className="py-2 pr-4 text-xs">{used}</td>
                      <td className="py-2 text-xs">{purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm">
              <strong>Decrypt flow:</strong> <code>decryptForView</code> (UI balance reveals via CoFHE SDK) +
              <code> decryptForTx</code> + <code>publishDecryptResult</code> (on-chain round settlement).
              All decryption is permission-gated and scoped to specific handles.
            </p>
          </Section>

          {/* ── WHY FHE ── */}
          <Section id="why-fhe" eyebrow="Rationale" title="Why FHE over ZK or MPC?">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-4 font-mono text-xs text-primary">Capability</th>
                    <th className="py-2 pr-4 font-mono text-xs text-primary">ZK Proofs</th>
                    <th className="py-2 pr-4 font-mono text-xs text-primary">MPC</th>
                    <th className="py-2 font-mono text-xs text-primary">FHE (KURA)</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["Sum encrypted values on-chain", "No", "Requires all online", "Yes — FHE.add()"],
                    ["Compare two secrets", "Limited", "Possible, slow", "Yes — FHE.lte() / FHE.gte()"],
                    ["Sealed-bid on ciphertext", "No", "Partial", "Yes — FHE.select(eaddress)"],
                    ["Permanent privacy of losing bids", "N/A", "N/A", "Yes — never decrypted"],
                    ["Asynchronous participation", "Yes", "No — all must be online", "Yes — deposit anytime"],
                    ["Composable on-chain credit", "Attestation only", "No", "Yes — double-blind FHE.gte()"],
                  ].map(([cap, zk, mpc, fhe]) => (
                    <tr key={cap} className="border-b border-border/30">
                      <td className="py-2 pr-4 text-xs text-foreground font-medium">{cap}</td>
                      <td className="py-2 pr-4 text-xs">{zk}</td>
                      <td className="py-2 pr-4 text-xs">{mpc}</td>
                      <td className="py-2 text-xs text-primary font-medium">{fhe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              FHE is the only privacy technology that supports <strong>server-side computation on encrypted data</strong>.
              ZK proofs can verify claims about hidden values but cannot compute new results from them.
              MPC requires synchronized participation from all parties. FHE allows any member to deposit at any time,
              while the contract computes sums, minimums, and comparisons on ciphertext — asynchronously and permanently private.
            </p>
          </Section>

          {/* ── ACCESS CONTROL ── */}
          <Section id="access" eyebrow="Security" title="Access control model">
            <p>
              Every piece of encrypted data has an explicit access control list (ACL). No data is
              ever globally visible. The principle: <strong>minimum necessary disclosure</strong>.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-4 font-mono text-xs text-primary">Data</th>
                    <th className="py-2 pr-4 font-mono text-xs text-primary">Who Sees</th>
                    <th className="py-2 font-mono text-xs text-primary">FHE Primitive</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["Individual contribution", "Member only", "FHE.allow(handle, member)"],
                    ["Pool total (encrypted)", "Admin only", "FHE.allow(pool, admin)"],
                    ["Individual bids", "Bidder only", "FHE.allow(bid, bidder)"],
                    ["Winning bid (settlement)", "All (published)", "decryptForTx + publishDecryptResult"],
                    ["Credit score", "Member only", "FHE.allow(score, member)"],
                    ["Credit check result", "Requester only", "FHE.allow(ebool, requester)"],
                    ["Raw plaintext data", "NEVER public", "No FHE.allowPublic() on user data"],
                  ].map(([data, who, prim]) => (
                    <tr key={data} className="border-b border-border/30">
                      <td className="py-2 pr-4 text-xs text-foreground">{data}</td>
                      <td className="py-2 pr-4 text-xs">{who}</td>
                      <td className="py-2 font-mono text-xs">{prim}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── THREAT MODEL ── */}
          <Section id="threats" eyebrow="Threat Model" title="What KURA protects against">
            <div className="space-y-4">
              {[
                { threat: "Curious admin reads contributions", mitigation: "Contributions stored as euint64 handles. Admin sees participation count only — never amounts. FHE.allow() scopes each handle to its owner." },
                { threat: "Block explorer exposes bids", mitigation: "Bids are encrypted calldata — Etherscan sees InEuint64 structs (ciphertext + proof), not plaintext values." },
                { threat: "Losing bidder's amount leaked", mitigation: "Only the winning bid is published via decryptForTx + publishDecryptResult. Losing bids remain as encrypted handles forever." },
                { threat: "DeFi lender learns exact credit score", mitigation: "verifyCreditworthiness uses double-blind FHE.gte() — returns ebool only. Neither score nor threshold is ever revealed to either party." },
                { threat: "Front-running sealed-bid auction", mitigation: "Bids are encrypted client-side before submission. Validators process ciphertext — they cannot read bid values to front-run." },
                { threat: "Replay of encrypted values", mitigation: "Each FHE input includes a unique proof bound to the sender. Replaying another member's ciphertext fails proof verification." },
              ].map(({ threat, mitigation }) => (
                <div key={threat} className="rounded-xl border border-border/50 bg-card/30 p-4">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                    {threat}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{mitigation}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── DATA FLOW ── */}
          <Section id="flow" eyebrow="Data Flow" title="Complete circle round">
            <pre className="rounded-xl bg-background/80 border border-border/60 p-5 font-mono text-xs leading-relaxed overflow-x-auto">{`MEMBER A                    KURA CONTRACTS                    MEMBER B
────────                    ──────────────                    ────────
    │                            │                                │
    │ 1. contribute(enc($50))    │     contribute(enc($50))       │
    │ ──────────────────────►    │    ◄────────────────────────── │
    │                            │                                │
    │                     FHE.asEuint64(enc)                      │
    │                     FHE.gte(amount, minimum) ✓              │
    │                     FHE.add(pool, amount)                   │
    │                            │                                │
    │                            │  ──── BIDDING OPENS ────       │
    │                            │                                │
    │ 2. submitBid(enc($40))     │     submitBid(enc($35))        │
    │ ──────────────────────►    │    ◄────────────────────────── │
    │                            │                                │
    │                     FHE.lte(bidB, bidA) → true               │
    │                     FHE.select → lowestBidderEnc = B         │
    │                            │                                │
    │                     closeRound → FHE.allowPublic(handle)     │
    │                     settleRound → Member B wins               │
    │                     transferPool → encrypted payout           │
    │                            │                                │
    │ 3. creditScore += 1        │     creditScore += 1           │
    │    (encrypted via FHE.add) │     (encrypted via FHE.add)    │
    │                            │                                │
    │ 4. viewMyBalance(permit)   │                                │
    │    → decryptForView        │   Etherscan sees: 0xa3f2...    │
    │    → Browser shows: $50    │   (ciphertext handle only)     │`}</pre>
          </Section>

          {/* ── DEPLOYMENT ── */}
          <Section id="deployment" eyebrow="Deployment" title="Contract addresses">
            <p>All contracts are deployed on Arbitrum Sepolia (chain ID 421614).</p>
            <div className="space-y-2 mt-4">
              {[
                ["KuraCircle", "0x5B2DBDCC210Df55486BdBc7E1A16B1f8CF0673b7"],
                ["KuraBid v2", "0x0179416EfeD421aB3582B2b4Cb238450d60A9Af1"],
                ["KuraCredit", "0xF6e42A0523373F6Ef89d91E925a4a93299b75144"],
                ["KuraConditionResolver", "0xA35d76dbbe380a75777F93C6773A20f5ebAbA744"],
                ["cUSDC (ConfidentialUSDC)", "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f"],
              ].map(([name, addr]) => (
                <div key={name} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-border/50 bg-card/30">
                  <span className="text-sm font-semibold">{name}</span>
                  <a
                    href={`https://sepolia.arbiscan.io/address/${addr}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-primary hover:underline truncate max-w-[360px]"
                  >
                    {addr}
                  </a>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-border/50 bg-card/30 p-4">
              <h4 className="text-sm font-semibold mb-2">Tech Stack</h4>
              <div className="flex flex-wrap gap-2">
                {["Fhenix CoFHE", "@cofhe/sdk 0.5.1", "Solidity 0.8.25", "React 19", "TypeScript", "Vite 7", "wagmi 2.19", "viem 2.48", "RainbowKit", "TanStack Router", "Tailwind v4", "Framer Motion"].map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-full text-xs border border-border/50 bg-background/40 font-mono">{t}</span>
                ))}
              </div>
            </div>
          </Section>

          {/* ── FAQ ── */}
          <Section id="faq" eyebrow="FAQ" title="Frequently asked">
            <div className="space-y-3">
              {FAQ.map((q) => (
                <FaqItem key={q.q} q={q.q} a={q.a} />
              ))}
            </div>
          </Section>
        </article>
      </div>
      <Footer />
    </main>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal>
      <section id={id} className="scroll-mt-32">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">{title}</h2>
        <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">{children}</div>
      </section>
    </Reveal>
  );
}

function ContractRef({ name, address, fns }: { name: string; address: string; fns: [string, string][] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden mb-4">
      <div className="px-5 py-3 border-b border-border/60 bg-background/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Code2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-sm font-semibold">{name}</span>
        </div>
        {address && (
          <a
            href={`https://sepolia.arbiscan.io/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[10px] text-muted-foreground hover:text-primary truncate max-w-[200px]"
          >
            {address.slice(0, 6)}...{address.slice(-4)}
          </a>
        )}
      </div>
      <ul className="divide-y divide-border/40">
        {fns.map(([sig, desc]) => (
          <li key={sig} className="px-5 py-3">
            <p className="font-mono text-xs text-foreground break-all">{sig}</p>
            <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const FAQ = [
  {
    q: "Who can see my contribution amount?",
    a: "Nobody. Your amount is encrypted client-side using the CoFHE SDK before it reaches the smart contract. Only you can decrypt your own balance using your wallet signature via decryptForView. Not even the circle admin sees individual amounts.",
  },
  {
    q: "What happens if I lose a round bid?",
    a: "Your bid remains encrypted forever. The contract only publishes the winning bidder's identity during settlement. Losing bids are mathematically inaccessible — they are never decrypted, not now, not ever.",
  },
  {
    q: "How does double-blind credit verification work?",
    a: "A DeFi protocol submits an encrypted threshold. Your score is already encrypted. FHE.gte() compares them and returns a single encrypted boolean. The protocol never sees your score. You never see their threshold. Only the pass/fail result is disclosed to the requester.",
  },
  {
    q: "What chain does KURA run on?",
    a: "KURA is deployed on Arbitrum Sepolia (chain ID 421614) using Fhenix CoFHE for FHE operations. The coprocessor handles all encrypted computation off-chain and returns results to the EVM.",
  },
  {
    q: "Can the circle admin coerce me?",
    a: "No. The admin cannot see contribution amounts, bids, or credit scores. They can only see participation counts (e.g. '6 of 8 contributed'). Financial coercion based on amounts is cryptographically impossible.",
  },
  {
    q: "Why FHE instead of ZK proofs or MPC?",
    a: "ZK proofs can prove 'I contributed ≥ minimum' but cannot compute pool totals or find the minimum bid across multiple encrypted values. MPC requires all members online simultaneously. FHE allows asynchronous computation on encrypted data with permanent privacy — the only technology that supports sealed-bid auctions on ciphertext.",
  },
  {
    q: "What is the auto-settle feature?",
    a: "One-click Advance Round in the admin panel automates the entire round lifecycle: close bidding → decrypt lowest bidder (FHE) → settle round → transfer encrypted pool → start next round. Each step requires a wallet confirmation but runs sequentially from a single button.",
  },
  {
    q: "How does KURA integrate with ReineiraOS?",
    a: "KuraConditionResolver implements the IConditionResolver interface to gate escrow redemption on KURA credit tiers. KuraEscrowAdapter creates winner escrows via ConfidentialEscrow, where winners claim payouts only after passing the credit tier check.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border/60 bg-card/40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 text-left px-5 py-4"
      >
        <span className="font-display text-base text-foreground">{q}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

