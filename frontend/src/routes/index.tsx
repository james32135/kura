import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Lock,
  Shield,
  Eye,
  Users,
  Vote,
  CreditCard,
  Database,
  Zap,
  Check,
  X,
  ExternalLink,
  GitBranch,
  Layers,
  Fingerprint,
  Scale,
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Reveal, stagger, staggerItem } from "@/components/Reveal";
import { Grain } from "@/components/Grain";
import { FHEFlowDiagram } from "@/components/FHEFlowDiagram";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { EncryptedParticles } from "@/components/landing/EncryptedParticles";
import { ProtocolDiagram } from "@/components/landing/ProtocolDiagram";
import {
  PROTOCOL,
  STATS,
  CONTRACTS,
  PRIVACY_GUARANTEES,
  ENCRYPTED_SURFACES,
  LIVE_TXS,
} from "@/data/protocol";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KURA — Financial Coordination Without Financial Exposure" },
      {
        name: "description",
        content:
          "Confidential cooperative finance on Arbitrum Sepolia. FHE-powered ROSCAs with private contributions, reputation, governance, and threshold-verified decryption via Fhenix CoFHE.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <Hero />
      <TrustedBar />
      <WhyExists />
      <PrivacyProblem />
      <HowItWorks />
      <WhatIsEncrypted />
      <ProtocolFeatures />
      <FHEFlowDiagram />
      <ContractArchitecture />
      <UserJourney />
      <PrivacyGuarantees />
      <TechnicalAchievements />
      <ProtocolStats />
      <LiveDeployment />
      <SecurityTrust />
      <FutureVision />
      <FinalCta />
      <Footer />
    </main>
  );
}

function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 400], [0, 80]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3]);

  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden grain pt-32 pb-20">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-background/60 via-transparent to-background/30" />
      <Grain opacity={0.22} />

      <motion.div style={{ y, opacity }} className="relative z-10 max-w-6xl mx-auto px-6 text-center">
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
          <motion.span
            variants={staggerItem}
            className="block text-white drop-shadow-[0_2px_24px_rgba(255,255,255,0.18)]"
          >
            Financial Coordination
          </motion.span>
          <motion.span
            variants={staggerItem}
            className="block text-gradient-accent drop-shadow-[0_4px_40px_oklch(0.78_0.13_200_/_0.7)]"
          >
            Without Financial Exposure
          </motion.span>
        </motion.h1>

        <Reveal delay={0.4}>
          <p className="mt-7 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-white/70">
            KURA is a confidential rotating savings protocol. Contributions, bids, and credit scores
            live as{" "}
            <code className="text-white/90 bg-white/10 px-1.5 py-0.5 rounded text-sm">euint64</code>{" "}
            ciphertext — computed homomorphically on-chain, revealed only through threshold-verified
            decryption.
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

        <Reveal delay={0.8}>
          <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { v: String(STATS.protocolContracts), l: "Protocol Contracts" },
              { v: String(STATS.fheOperations), l: "FHE Operations" },
              { v: String(STATS.testsPassing), l: "Tests Passing" },
              { v: "Live", l: "Arbitrum Sepolia" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <p className="font-display font-semibold text-3xl sm:text-4xl text-gradient">{s.v}</p>
                <p className="mt-2 text-xs sm:text-sm text-white/50">{s.l}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </motion.div>

      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-[10px] uppercase tracking-[0.4em] text-white/40"
      >
        Scroll
      </motion.div>
    </section>
  );
}

function TrustedBar() {
  const items = [
    "Fhenix CoFHE",
    PROTOCOL.fheSdk,
    PROTOCOL.compiler,
    PROTOCOL.network,
    "ReineiraOS Escrow",
    "Confidential USDC",
  ];
  return (
    <section className="border-y border-border/40 bg-surface/20 py-8 overflow-hidden">
      <div className="flex animate-[marquee_40s_linear_infinite] gap-12 whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span key={`${item}-${i}`} className="font-mono text-sm text-muted-foreground/80">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function WhyExists() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <Reveal>
          <SectionLabel>Why KURA Exists</SectionLabel>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
            Blockchains enforce rules.{" "}
            <span className="text-gradient-accent">They shouldn&apos;t broadcast behavior.</span>
          </h2>
          <p className="mt-6 text-muted-foreground leading-relaxed">
            Rotating savings circles coordinate pooled capital through mutual trust. On-chain
            enforcement adds programmability and global reach, but public ledgers expose contribution
            amounts, bid strategies, credit histories, and governance preferences.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            KURA preserves cooperative finance mechanics while keeping financial state encrypted.
            Plaintext appears only when the protocol explicitly publishes aggregates via CoFHE
            threshold decryption — never by default.
          </p>
        </Reveal>
        <ProtocolDiagram />
      </div>
    </section>
  );
}

function PrivacyProblem() {
  const leaks = [
    { icon: Eye, title: "Contribution surveillance", desc: "Every transfer amount visible to observers and validators." },
    { icon: Scale, title: "Bid strategy leakage", desc: "Sealed bids become public after settlement on plaintext chains." },
    { icon: Fingerprint, title: "Reputation doxing", desc: "Credit scores become permanent, queryable public records." },
    { icon: Users, title: "Governance coercion", desc: "Individual votes traceable — participation becomes risky." },
  ];
  return (
    <section className="py-28 px-6 bg-line-grid relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />
      <div className="relative max-w-6xl mx-auto">
        <Reveal>
          <SectionLabel tone="warm">The Privacy Problem</SectionLabel>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight max-w-3xl">
            Public ROSCAs leak the data that makes circles work.
          </h2>
        </Reveal>
        <div className="mt-14 grid sm:grid-cols-2 gap-5">
          {leaks.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <div className="group rounded-2xl border border-border/50 bg-card/50 p-8 hover:border-warm/30 transition-colors">
                <item.icon className="h-5 w-5 text-warm" />
                <h3 className="mt-5 font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Encrypt", desc: "Client-side CoFHE encryption via @cofhe/sdk. Full InEuint64 tuples submitted on-chain." },
    { n: "02", title: "Compute", desc: "Contracts perform FHE.add, FHE.select, FHE.lte on ciphertext — pool math without decryption." },
    { n: "03", title: "Permit", desc: "Members decrypt own handles via wallet-bound permits. ACL enforced by FHE.isAllowed." },
    { n: "04", title: "Publish", desc: "Aggregates revealed only through verifyDecryptResult(Batch) with threshold committee signatures." },
  ];
  return (
    <section id="how" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionLabel>How KURA Works</SectionLabel>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Four layers. <span className="text-gradient-accent">Zero default exposure.</span>
          </h2>
        </Reveal>
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="relative h-full rounded-2xl border border-border/50 bg-surface/30 p-7 overflow-hidden group hover:border-primary/35 transition">
                <span className="font-mono text-xs text-primary">{s.n}</span>
                <h3 className="mt-6 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatIsEncrypted() {
  return (
    <section className="py-28 px-6 border-y border-border/40">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionLabel>What Is Encrypted</SectionLabel>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl">
            Every financial surface. <span className="text-gradient-accent">By default.</span>
          </h2>
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ENCRYPTED_SURFACES.map((item, i) => (
            <Reveal key={item} delay={i * 0.04}>
              <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/40 px-4 py-4">
                <Lock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProtocolFeatures() {
  const features = [
    { icon: Lock, title: "Encrypted Contributions", desc: "cUSDC deposits with silent minimum checks. Events emit circleId + round only." },
    { icon: Scale, title: "Sealed-Bid Auctions", desc: "KuraBid compares bids homomorphically. Losing bids never publish." },
    { icon: CreditCard, title: "Private Credit Scoring", desc: "KuraCredit + KuraCreditV2 with tier proofs, weighted scores, quadratic governance weight." },
    { icon: Users, title: "Encrypted Membership", desc: "KuraMemberRegistry stores eaddress slots. FHE.rem for random winner selection." },
    { icon: Vote, title: "Private Governance", desc: "Homomorphic vote accumulation. closeVoteBatch threshold verification." },
    { icon: Database, title: "Privacy Vault", desc: "Circle metadata as encrypted 8-byte euint64 chunks. Private circles invisible to outsiders." },
    { icon: Zap, title: "Stream Pay", desc: "Per-block encrypted contributions. FHE.min caps payments; timing decoupled from lump sums." },
    { icon: Shield, title: "Blind Disputes", desc: "Admins resolve via validity ebool — claimed amounts stay encrypted." },
    { icon: GitBranch, title: "Credit-Gated Escrow", desc: "ReineiraOS ConfidentialEscrow via KuraEscrowAdapter + KuraConditionResolver." },
  ];
  return (
    <section className="py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <SectionLabel>Protocol Features</SectionLabel>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight">
            A complete ROSCA lifecycle — <span className="text-gradient-accent">not a demo.</span>
          </h2>
        </Reveal>
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-border/50 bg-card/40 p-7 hover:border-primary/30 transition group">
                <div className="h-11 w-11 rounded-xl border border-primary/25 bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContractArchitecture() {
  const all = [...CONTRACTS.wave13, ...CONTRACTS.wave4, ...CONTRACTS.external];
  return (
    <section className="py-28 px-6 bg-surface/20">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionLabel>Contract Architecture</SectionLabel>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight">
            {STATS.protocolContracts} contracts. {STATS.deployedAddresses} deployments.
          </h2>
        </Reveal>
        <div className="mt-12 space-y-2">
          {all.map((c, i) => (
            <Reveal key={c.name} delay={i * 0.02}>
              <a
                href={`https://sepolia.arbiscan.io/address/${c.address}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-card/30 px-5 py-3.5 hover:border-primary/30 hover:bg-card/50 transition group"
              >
                <div className="flex items-center gap-3">
                  <Layers className="h-4 w-4 text-primary/70" />
                  <span className="font-mono text-sm font-medium">{c.name}</span>
                  {"wave" in c && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border/40 px-2 py-0.5 rounded-full">
                      Wave {c.wave}
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs text-muted-foreground group-hover:text-primary">
                  {c.address.slice(0, 10)}…{c.address.slice(-8)}
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function UserJourney() {
  const journey = [
    "Connect wallet on Arbitrum Sepolia",
    "Wrap USDC → cUSDC · setOperator",
    "Create or join encrypted circle",
    "Contribute encrypted amount per round",
    "Submit sealed bid · build credit score",
    "Govern · stream · vault · dispute",
    "Claim via credit-gated escrow",
  ];
  return (
    <section className="py-28 px-6">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <SectionLabel>User Journey</SectionLabel>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight text-center">
            From wallet to encrypted circle in minutes.
          </h2>
        </Reveal>
        <div className="mt-14 relative">
          <div className="absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/60 via-border to-transparent" />
          <ul className="space-y-6">
            {journey.map((step, i) => (
              <Reveal key={step} delay={i * 0.06}>
                <li className="flex items-start gap-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-background font-mono text-xs text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="pt-2.5 text-muted-foreground">{step}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function PrivacyGuarantees() {
  return (
    <section className="py-28 px-6 border-y border-border/40">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionLabel>Privacy Guarantees</SectionLabel>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Structural privacy — <span className="text-gradient-accent">not policy.</span>
          </h2>
        </Reveal>
        <div className="mt-12 overflow-hidden rounded-2xl border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-surface/50">
                <th className="text-left px-6 py-4 font-mono text-xs uppercase tracking-wider text-primary">Domain</th>
                <th className="text-left px-6 py-4 font-mono text-xs uppercase tracking-wider text-primary">Guarantee</th>
              </tr>
            </thead>
            <tbody>
              {PRIVACY_GUARANTEES.map((row, i) => (
                <tr key={row.domain} className={`border-b border-border/30 ${i % 2 ? "bg-card/20" : ""}`}>
                  <td className="px-6 py-4 font-medium text-foreground">{row.domain}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row.guarantee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function TechnicalAchievements() {
  const items = [
    `All ${STATS.fheOperations} specified FHE operations deployed across ${STATS.fheEnabledContracts} contracts`,
    `Wave 4: ${STATS.wave4NewContracts} new contracts, ${STATS.wave4NewRoutes} routes, ${STATS.wave4NewHooks} hooks`,
    `${STATS.wave4BugFixes} contract bug fixes including isAllowed view corrections & viaIR compilation`,
    `Wave 5: ${STATS.confirmedLiveTxs} confirmed live transactions on production Vercel`,
    "CoFHE storage iframe proxy, full InEuint64 ABI, dynamic gas fee handling",
    "ReineiraOS ConfidentialEscrow integration with FHE.eq(eaddress) self-claim",
  ];
  return (
    <section className="py-28 px-6">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <SectionLabel>Technical Achievements</SectionLabel>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Production-validated FHE infrastructure.
          </h2>
        </Reveal>
        <ul className="mt-12 space-y-4">
          {items.map((item, i) => (
            <Reveal key={item} delay={i * 0.06}>
              <li className="flex items-start gap-4 rounded-xl border border-border/40 bg-card/30 px-5 py-4">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ProtocolStats() {
  const stats = [
    { v: STATS.protocolContracts, l: "Protocol Contracts" },
    { v: STATS.deployedAddresses, l: "Deployed Addresses" },
    { v: STATS.fheOperations, l: "FHE Operations" },
    { v: STATS.fheEnabledContracts, l: "FHE-Enabled Contracts" },
    { v: STATS.testsPassing, l: "Tests Passing" },
    { v: STATS.verifiedWorkflows, l: "Verified Live Workflows" },
  ];
  return (
    <section className="py-28 px-6 bg-radial-glow">
      <div className="max-w-6xl mx-auto text-center">
        <Reveal>
          <SectionLabel>Protocol Statistics</SectionLabel>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Real numbers. <span className="text-gradient-accent">No mock data.</span>
          </h2>
        </Reveal>
        <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-5">
          {stats.map((s, i) => (
            <Reveal key={s.l} delay={i * 0.05}>
              <div className="rounded-2xl border border-border/50 bg-surface/40 backdrop-blur p-8">
                <p className="font-display text-4xl md:text-5xl font-semibold text-gradient-accent">{s.v}</p>
                <p className="mt-2 text-sm text-muted-foreground">{s.l}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveDeployment() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionLabel>Live Deployment</SectionLabel>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Verified on Arbitrum Sepolia.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Wave 5 validation · {PROTOCOL.validated} · commit{" "}
            <code className="text-primary font-mono text-sm">{PROTOCOL.deployCommit}</code>
          </p>
        </Reveal>
        <div className="mt-10 grid lg:grid-cols-2 gap-8">
          <Reveal>
            <div className="rounded-2xl border border-border/50 bg-card/40 p-6 space-y-3">
              <p className="font-mono text-xs uppercase tracking-wider text-primary">Production App</p>
              <a
                href={PROTOCOL.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="font-display text-2xl font-semibold hover:text-primary transition inline-flex items-center gap-2"
              >
                kura-gilt.vercel.app
                <ExternalLink className="h-5 w-5" />
              </a>
              <p className="text-sm text-muted-foreground">
                Circle #0 · encrypted 1 USDC contribution · 0.5 USDC sealed bid · Stream Pay ·
                Governance vote · Dispute · Privacy Vault · Member Registry
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-border/50 bg-card/40 p-6">
              <p className="font-mono text-xs uppercase tracking-wider text-primary mb-4">
                Confirmed Transactions
              </p>
              <ul className="space-y-2 max-h-[220px] overflow-y-auto">
                {LIVE_TXS.map((tx) => (
                  <li key={tx.hash}>
                    <a
                      href={`https://sepolia.arbiscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex justify-between gap-2 text-xs hover:text-primary transition"
                    >
                      <span className="text-muted-foreground">{tx.label}</span>
                      <span className="font-mono">{tx.hash.slice(0, 10)}…</span>
                    </a>
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

function SecurityTrust() {
  const without = [
    "Plaintext contribution amounts on-chain",
    "Traceable governance votes",
    "Public bid strategies after settlement",
    "No threshold verification on published values",
  ];
  const withKura = [
    "FHE ciphertext handles for all financial state",
    "Homomorphic vote accumulation — ballots never stored",
    "Losing bids remain encrypted permanently",
    "verifyDecryptResult(Batch) committee signatures required",
    "FHE.isAllowed ACL guards on every protected read",
    "Permit-based selective disclosure client-side",
  ];
  return (
    <section className="py-28 px-6 border-y border-border/40">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <SectionLabel>Security & Trust Model</SectionLabel>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Trust the cryptography. <span className="text-gradient-accent">Verify the signatures.</span>
          </h2>
        </Reveal>
        <div className="mt-14 grid md:grid-cols-2 gap-5">
          <Reveal>
            <div className="rounded-2xl border border-border/50 bg-card/30 p-8">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Plaintext ROSCA</p>
              <ul className="mt-6 space-y-3">
                {without.map((x) => (
                  <li key={x} className="flex gap-3 text-sm text-muted-foreground">
                    <X className="h-4 w-4 text-destructive/70 shrink-0 mt-0.5" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-8 ring-glow">
              <p className="font-mono text-xs uppercase tracking-wider text-primary">KURA</p>
              <ul className="mt-6 space-y-3">
                {withKura.map((x) => (
                  <li key={x} className="flex gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {x}
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

function FutureVision() {
  const items = [
    "Populate KuraMemberRegistry automatically from joinCircle",
    "End-to-end encrypted metadata storage in Privacy Vault UI",
    "Full FHE tier comparison for join gates",
    "Mainnet deployment with audited CoFHE configuration",
  ];
  return (
    <section className="py-28 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <Reveal>
          <SectionLabel>Future Vision</SectionLabel>
          <h2 className="mt-5 font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Confidential cooperative finance at scale.
          </h2>
          <p className="mt-6 text-muted-foreground leading-relaxed">
            Wave 4 completed the FHE privacy layer. Wave 5 validated production flows on Arbitrum
            Sepolia. Next: close remaining integration gaps and extend encrypted coordination to
            mainnet.
          </p>
          <ul className="mt-10 text-left space-y-3">
            {items.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow opacity-80" />
      <EncryptedParticles />
      <div className="relative max-w-3xl mx-auto text-center">
        <Reveal>
          <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight">
            Save together. <span className="text-gradient-accent">Reveal nothing.</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            {STATS.protocolContracts} contracts · {STATS.fheOperations} FHE operations · Live on{" "}
            {PROTOCOL.network}. Open the app and create your first encrypted circle.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/app/onboarding"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground text-background px-8 py-4 text-sm font-semibold hover:gap-3 transition-all"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 px-8 py-4 text-sm font-medium hover:bg-surface/50 transition"
            >
              Read the Protocol Docs
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
