import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Lock,
  Layers,
  Eye,
  Hand,
  PersonStanding,
  XCircle,
  Coins,
  Shield,
  Network,
  Sparkles,
  Check,
  X,
  CircleDollarSign,
  Gavel,
  TrendingUp,
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Reveal, stagger, staggerItem } from "@/components/Reveal";
import { Grain } from "@/components/Grain";
import { FHEFlowDiagram } from "@/components/FHEFlowDiagram";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KURA — Save Together. Know Nothing." },
      {
        name: "description",
        content:
          "Encrypted community savings circles for 1.2 billion people. Every contribution private. Every bid sealed. Every credit score portable.",
      },
      { property: "og:title", content: "KURA — Save Together. Know Nothing." },
      {
        property: "og:description",
        content:
          "Encrypted community savings circles powered by Fully Homomorphic Encryption.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      <Hero />
      <HowItWorks />
      <FHEFlowDiagram />
      <Problem />
      <WhyFHE />
      <ThreeLayers />
      <MarketValidation />
      <Roadmap />
      <TechStack />
      <CtaBand />
      <Footer />
    </main>
  );
}

/* ------------------------------- HERO ------------------------------- */

function Hero() {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden grain pt-32 pb-20">
      {/* BG image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      />
      {/* Vignette / fade to bg at bottom */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-background/60 via-transparent to-background/30" />
      <Grain opacity={0.22} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/70 bg-background/40 backdrop-blur text-xs font-medium"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          FHE-Powered · Live on Arbitrum Sepolia
        </motion.div>

        <motion.h1
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mt-8 font-display font-semibold text-5xl sm:text-6xl md:text-7xl lg:text-[88px] leading-[0.95] tracking-tight"
        >
          <motion.span variants={staggerItem} className="block text-white drop-shadow-[0_2px_24px_rgba(255,255,255,0.18)]">
            Save Together.
          </motion.span>
          <motion.span
            variants={staggerItem}
            className="block text-gradient-accent drop-shadow-[0_4px_40px_oklch(0.78_0.13_200_/_0.7)]"
          >
            Know Nothing.
          </motion.span>
        </motion.h1>

        <Reveal delay={0.4}>
          <p className="mt-7 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-white/70">
            The first protocol where contributions, bids, and credit scores live as{" "}
            <code className="text-white/90 bg-white/10 px-1.5 py-0.5 rounded text-sm">euint64</code> ciphertext.
            Block explorers see hashes — members see their own balances.{" "}
            <span className="text-white font-semibold">$500B+ informal savings market</span>,{" "}
            1.2 billion people, zero on-chain plaintext.
          </p>
        </Reveal>

        <Reveal delay={0.55}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/app"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground text-background px-7 py-3.5 text-sm font-semibold transition-all hover:gap-3 hover:shadow-[0_8px_40px_-8px_oklch(0.78_0.13_200_/_0.6)]"
            >
              Launch App
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/docs"
              className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/30 backdrop-blur px-7 py-3.5 text-sm font-medium text-foreground transition hover:bg-background/60"
            >
              Read Docs
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
            </Link>
          </div>
        </Reveal>

        {/* Stats */}
        <Reveal delay={0.8}>
          <div className="mt-20 grid grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { v: "$500B+", l: "Informal Savings Market" },
              { v: "1.2B", l: "People Using Savings Circles" },
              { v: "14", l: "FHE Operations Used" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-display font-semibold text-3xl sm:text-5xl text-gradient">
                  <AnimatedCounter value={s.v} />
                </div>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Scroll cue */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
      >
        Scroll
      </motion.div>
    </section>
  );
}

/* --------------------------- HOW IT WORKS --------------------------- */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: Lock,
      t: "Encrypt & Deposit",
      d: "Your contribution is encrypted client-side via FHE.asEuint64() before touching the chain. Nobody — not the admin, not a block explorer, not a validator — sees your amount.",
    },
    {
      n: "02",
      icon: Layers,
      t: "Pool Accumulates",
      d: "The smart contract sums encrypted contributions via FHE.add(). The pool total is computed on ciphertext — cryptographically real, mathematically verified, permanently invisible.",
    },
    {
      n: "03",
      icon: Gavel,
      t: "Sealed-Bid Auction",
      d: "Members bid privately each round. KuraBid v2 uses FHE.lte() + FHE.select() to auto-detect the lowest bidder as an eaddress. Losing bids are never decrypted — ever.",
    },
    {
      n: "04",
      icon: TrendingUp,
      t: "Build Credit",
      d: "Every timely contribution earns +1 encrypted point via FHE.add(). Circle completion earns +5. Prove reliability to DeFi lenders through FHE.gte() — double-blind, neither score nor threshold revealed.",
    },
  ];

  return (
    <section id="how" className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="mt-4 font-display font-semibold text-4xl md:text-6xl tracking-tight max-w-3xl">
            Four steps. <span className="text-gradient-accent">Zero leakage.</span>
          </h2>
        </Reveal>

        <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="group relative h-full rounded-2xl border border-border/60 bg-surface/40 backdrop-blur-sm p-7 overflow-hidden transition hover:border-primary/40">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/[0.06] group-hover:to-transparent transition-all duration-500" />
                <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{s.n}</span>
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-8 font-display text-xl font-semibold">{s.t}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ PROBLEM ----------------------------- */

function Problem() {
  const problems = [
    {
      icon: Eye,
      t: "Social Shame",
      d: "When contributions are visible, members who put in less face social stigma. They drop out. The circle collapses.",
    },
    {
      icon: Hand,
      t: "Leader Coercion",
      d: "Group organizers see everyone's balances. They pressure members for personal loans or embezzle quietly.",
    },
    {
      icon: PersonStanding,
      t: "Free-Rider Fraud",
      d: "Members who receive their payout early stop contributing. The last members bear all the default risk.",
    },
    {
      icon: XCircle,
      t: "No Credit History",
      d: "Years of reliable saving produce zero formal credit history. Banks and DeFi protocols ignore it.",
    },
  ];

  return (
    <section className="relative py-32 px-6 bg-line-grid">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />
      <div className="relative max-w-7xl mx-auto">
        <Reveal>
          <SectionLabel tone="warm">The Problem</SectionLabel>
          <h2 className="mt-4 font-display font-semibold text-4xl md:text-6xl tracking-tight max-w-4xl">
            1.2 Billion People Save Through Community Circles.{" "}
            <span className="text-warm">They All Break.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-2 gap-5">
          {problems.map((p, i) => (
            <Reveal key={p.t} delay={i * 0.08}>
              <div className="group relative h-full rounded-2xl border border-border/60 bg-card/60 p-8 transition hover:border-warm/40">
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl border border-border/60 flex items-center justify-center bg-background/60">
                    <p.icon className="h-5 w-5 text-warm" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold">{p.t}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.d}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ WHY FHE ----------------------------- */

function WhyFHE() {
  const without = [
    "Visible contribution amounts",
    "Social pressure & judgment",
    "Leader coercion & embezzlement",
    "No on-chain enforcement",
    "No portable credit history",
  ];
  const withKura = [
    "euint64 encrypted contributions",
    "Sealed-bid allocation (FHE.lte)",
    "On-chain FHE enforcement",
    "Portable encrypted credit (5 tiers)",
    "14 FHE operations, zero plaintext",
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionLabel>Why FHE</SectionLabel>
          <h2 className="mt-4 font-display font-semibold text-4xl md:text-6xl tracking-tight max-w-3xl">
            Privacy isn't a feature.{" "}
            <span className="text-gradient-accent">It's the foundation.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-2 gap-5">
          <Reveal>
            <div className="rounded-2xl border border-border/60 bg-card/40 p-8">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Without KURA
              </p>
              <ul className="mt-6 space-y-4">
                {without.map((x) => (
                  <li key={x} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <X className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive/80" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.04] to-transparent p-8 ring-glow">
              <div className="absolute -top-px left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent" />
              <p className="font-mono text-xs uppercase tracking-widest text-primary">With KURA</p>
              <ul className="mt-6 space-y-4">
                {withKura.map((x) => (
                  <li key={x} className="flex items-start gap-3 text-sm text-foreground">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- THREE LAYERS --------------------------- */

function ThreeLayers() {
  const layers = [
    {
      icon: CircleDollarSign,
      file: "KuraCircle.sol",
      t: "Encrypted Contributions",
      d: "Members deposit via FHE.asEuint64(). The contract validates minimums with FHE.gte(), accepts conditionally with FHE.select(), and accumulates the pool with FHE.add(). All storage is euint64 handles — Etherscan sees hashes, never USDC amounts.",
    },
    {
      icon: Gavel,
      file: "KuraBid.sol",
      t: "Sealed-Bid Allocation",
      d: "Members submit encrypted discount bids each round. KuraBid v2 compares bids with FHE.lte() and tracks the lowest bidder as an encrypted eaddress via FHE.select(). Settlement uses decryptForTx + publishDecryptResult. Losing bids stay encrypted forever.",
    },
    {
      icon: Shield,
      file: "KuraCredit.sol",
      t: "Encrypted Credit Score",
      d: "+1 point per contribution, +5 per circle completion, accumulated as euint64 via FHE.add(). Five tiers from Newcomer to Elite. External protocols verify with FHE.gte(score, threshold) — double-blind: neither score nor threshold is revealed.",
    },
    {
      icon: Network,
      file: "KuraEscrowAdapter.sol",
      t: "ReineiraOS Escrow Bridge",
      d: "KuraConditionResolver implements ReineiraOS IConditionResolver — gating escrow redemption on encrypted credit tiers. KuraEscrowAdapter bridges pool payouts to ConfidentialEscrow with claim/unwrap.",
    },
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <SectionLabel>Architecture</SectionLabel>
          <h2 className="mt-4 font-display font-semibold text-4xl md:text-6xl tracking-tight max-w-3xl">
            Six contracts. <span className="text-gradient-accent">Complete privacy.</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground max-w-2xl">
            All deployed on Arbitrum Sepolia. Every storage slot is a ciphertext handle — block explorers see only hashes, never values.
          </p>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {layers.map((l, i) => (
            <Reveal key={l.file} delay={i * 0.1}>
              <div className="group relative h-full rounded-2xl border border-border/60 bg-card/60 p-8 overflow-hidden transition hover:border-primary/40">
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="h-12 w-12 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-center">
                  <l.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="mt-6 font-mono text-xs text-muted-foreground">{l.file}</p>
                <h3 className="mt-2 font-display text-xl font-semibold">{l.t}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{l.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- MARKET VALIDATION ---------------------- */

function MarketValidation() {
  const items = [
    { k: "Money Fellows", v: "$31M Series B raised — savings circles without privacy. Imagine with it." },
    { k: "India", v: "150M+ people use chit funds — the single largest informal savings mechanism on Earth" },
    { k: "South Africa", v: "$50B+ annual stokvel circulation. Every rand of it visible to every member." },
    { k: "Mexico", v: "60% of the population participates in tandas — deeply cultural, deeply transparent" },
    { k: "Philippines", v: "eqb reached 100K users in 12 months. All contribution amounts exposed." },
    { k: "Privacy Gap", v: "Every existing solution exposes amounts. KURA is the first to encrypt everything on-chain." },
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <SectionLabel>Market Validation</SectionLabel>
          <h2 className="mt-4 font-display font-semibold text-4xl md:text-6xl tracking-tight max-w-4xl">
            $500B+ market. 1.2B people.{" "}
            <span className="text-gradient-accent">Proven demand.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <Reveal key={it.k} delay={i * 0.06}>
              <div className="rounded-2xl border border-border/60 bg-surface/30 p-7 h-full">
                <p className="font-display text-2xl font-semibold">{it.k}</p>
                <div className="mt-4 h-px w-12 bg-primary/50" />
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{it.v}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ ROADMAP ----------------------------- */

function Roadmap() {
  const waves = [
    {
      n: "Wave 2",
      t: "Full Protocol — Live",
      d: "All 6 contracts deployed on Arbitrum Sepolia: KuraCircle (encrypted contributions + pool), KuraBid v2 (sealed-bid with eaddress auto-detection), KuraCredit (5-tier encrypted scoring), KuraConditionResolver + KuraEscrowAdapter (ReineiraOS integration). One-click auto-settle, multi-circle support, production dApp with client-side FHE via @cofhe/sdk 0.4.",
      status: "live",
    },
    {
      n: "Wave 3",
      t: "Payment Rails + Mobile",
      d: "Fiat on-ramp via Privara SDK, mobile-optimized UI, push notifications for round deadlines, and cross-circle reputation aggregation.",
      status: "active",
    },
    {
      n: "Wave 4",
      t: "DeFi Credit Bridge",
      d: "KURA credit score enables undercollateralized lending qualification on external DeFi protocols.",
      status: "next",
    },
    {
      n: "Wave 5",
      t: "Multi-Chain + Token",
      d: "Cross-chain circles plus FHERC20 savings token plus institutional API.",
      status: "future",
    },
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <SectionLabel>Roadmap</SectionLabel>
          <h2 className="mt-4 font-display font-semibold text-4xl md:text-6xl tracking-tight max-w-3xl">
            Five waves. <span className="text-gradient-accent">From savings to credit.</span>
          </h2>
        </Reveal>

        <div className="mt-16 relative">
          <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gradient-to-b from-primary/60 via-border to-transparent" />
          <ul className="space-y-6">
            {waves.map((w, i) => (
              <Reveal key={w.n} delay={i * 0.08}>
                <li className="relative pl-12">
                  <span
                    className={`absolute left-0 top-2 h-7 w-7 rounded-full border-2 flex items-center justify-center bg-background ${
                      w.status === "live"
                        ? "border-primary glow-primary"
                        : w.status === "active"
                          ? "border-primary"
                          : "border-border"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        w.status === "live" || w.status === "active"
                          ? "bg-primary"
                          : "bg-muted-foreground/50"
                      }`}
                    />
                  </span>
                  <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground">{w.n}</span>
                        <h3 className="font-display text-lg font-semibold">{w.t}</h3>
                      </div>
                      <StatusPill status={w.status} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{w.d}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { l: string; c: string }> = {
    live: { l: "Live", c: "bg-primary/15 text-primary border-primary/30" },
    active: { l: "In Progress", c: "bg-primary/10 text-primary border-primary/25" },
    next: { l: "Next", c: "bg-warm/10 text-warm border-warm/30" },
    future: { l: "Planned", c: "bg-muted text-muted-foreground border-border" },
  };
  const m = map[status] ?? map.future;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest border ${m.c}`}
    >
      {m.l}
    </span>
  );
}

/* ----------------------------- TECH STACK --------------------------- */

function TechStack() {
  const items = [
    "Fhenix CoFHE",
    "@cofhe/sdk 0.4",
    "Solidity 0.8.25",
    "React 19",
    "TypeScript",
    "Vite 7",
    "wagmi / viem",
    "Arbitrum Sepolia",
    "RainbowKit",
    "TanStack Router",
  ];
  return (
    <section className="relative py-24 px-6 border-y border-border/60">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground text-center">
            Built With
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {items.map((it) => (
              <span
                key={it}
                className="font-mono text-sm text-muted-foreground hover:text-foreground transition"
              >
                {it}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ CTA BAND ---------------------------- */

function CtaBand() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow opacity-60 pointer-events-none" />
      <div className="relative max-w-4xl mx-auto text-center">
        <Reveal>
          <Sparkles className="h-6 w-6 text-primary mx-auto" />
          <h2 className="mt-6 font-display font-semibold text-4xl md:text-6xl tracking-tight">
            Start your encrypted circle.
          </h2>
          <p className="mt-5 text-muted-foreground max-w-xl mx-auto">
            Deploy a private savings circle in under a minute. Your data never leaves
            ciphertext.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/app"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground text-background px-7 py-3.5 text-sm font-semibold transition-all hover:gap-3"
            >
              Launch App
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-border/70 px-7 py-3.5 text-sm font-medium hover:bg-surface transition"
            >
              <Network className="h-4 w-4" />
              Read Architecture
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------- SHARED PARTS -------------------------- */

function SectionLabel({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "warm";
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`h-px w-8 ${tone === "warm" ? "bg-warm" : "bg-primary"}`}
        aria-hidden
      />
      <span
        className={`font-mono text-[11px] uppercase tracking-[0.3em] ${
          tone === "warm" ? "text-warm" : "text-primary"
        }`}
      >
        {children}
      </span>
    </div>
  );
}

// silence unused imports lint by re-exporting via dummy noop (kept clean: Coins used? remove)
void Coins;
