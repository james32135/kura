import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { Lock, Network, Code2, BookOpen, ChevronDown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — KURA Protocol" },
      {
        name: "description",
        content:
          "Protocol overview, architecture, and smart contract reference for KURA encrypted savings circles.",
      },
      { property: "og:title", content: "Docs — KURA Protocol" },
      {
        property: "og:description",
        content: "Protocol overview, architecture, and smart contract reference for KURA.",
      },
    ],
  }),
  component: Docs,
});

const sections = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "architecture", label: "Architecture", icon: Network },
  { id: "fhe", label: "How FHE Works", icon: Lock },
  { id: "contracts", label: "Smart Contracts", icon: Code2 },
  { id: "faq", label: "FAQ", icon: BookOpen },
];

function Docs() {
  return (
    <main className="relative bg-background text-foreground min-h-screen">
      <Navbar />
      <div className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 bg-radial-glow opacity-40 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
            Documentation
          </p>
          <h1 className="mt-4 font-display text-5xl md:text-6xl font-semibold tracking-tight">
            How <span className="text-gradient-accent">KURA</span> works.
          </h1>
          <p className="mt-5 text-muted-foreground">
            A walk-through of the protocol, architecture, and the FHE primitives that make
            encrypted savings circles possible.
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
          <Section id="overview" eyebrow="Overview" title="Protocol overview">
            <p>
              KURA is a savings-circle protocol where every contribution, bid, and credit
              score is encrypted using Fully Homomorphic Encryption. Members deposit
              ciphertexts; the contract performs arithmetic and comparisons on those
              ciphertexts; only the round winner ever decrypts a payout.
            </p>
            <p>
              The result is a financial primitive that mirrors the social structure of
              chamas, tandas, stokvels, and chit funds — but eliminates the failure modes
              that come from on-chain transparency or trusted leadership.
            </p>
          </Section>

          <Section id="architecture" eyebrow="Architecture" title="System architecture">
            <p>
              KURA is composed of three Solidity contracts that coordinate via shared
              encrypted state. The browser handles encryption, signing, and decryption via
              the CoFHE SDK.
            </p>
            <pre className="rounded-xl bg-background/80 border border-border/60 p-5 font-mono text-xs leading-relaxed overflow-x-auto">{`Browser (CoFHE SDK)
   │ encrypt(amount) → ciphertext + proof
   ▼
KuraCircle.sol  ──FHE.add──►  pool: euint64
   │ contribute(ct, proof)        │
   ▼                              ▼
KuraBid.sol     ──FHE.min──►  winner allocation
   │ bid(ct, proof)               │
   ▼                              ▼
KuraCredit.sol  ──FHE.add──►  encrypted score
                ──FHE.gte──►  pass / fail (bool)`}</pre>
          </Section>

          <Section id="fhe" eyebrow="How FHE Works" title="Encryption you can compute on">
            <p>
              Fully Homomorphic Encryption lets the smart contract perform addition,
              comparison, minimum, and conditional selection on encrypted values without
              ever decrypting them. This is the property that makes KURA possible.
            </p>
            <ul className="space-y-2 text-muted-foreground list-disc pl-5">
              <li>
                <span className="text-foreground font-mono">FHE.add</span> — adds two
                ciphertexts to produce an encrypted sum.
              </li>
              <li>
                <span className="text-foreground font-mono">FHE.gte</span> — encrypted
                comparison; result is an encrypted boolean.
              </li>
              <li>
                <span className="text-foreground font-mono">FHE.min</span> — selects the
                minimum of two ciphertexts; used for sealed-bid auctions.
              </li>
              <li>
                <span className="text-foreground font-mono">FHE.select</span> — encrypted
                ternary; used for conditional payouts.
              </li>
            </ul>
          </Section>

          <Section id="contracts" eyebrow="Reference" title="Smart contract reference">
            <ContractRef
              name="KuraCircle.sol"
              fns={[
                ["contribute(euint64 amount, bytes proof)", "Submit an encrypted contribution"],
                ["poolTotal() → euint64", "Returns the encrypted pool"],
                ["startRound()", "Open the next round (admin only)"],
                ["closeRound()", "Close current round when deadline elapses"],
              ]}
            />
            <ContractRef
              name="KuraBid.sol"
              fns={[
                ["sealedBid(euint64 discount, bytes proof)", "Submit an encrypted discount bid"],
                ["resolveRound()", "FHE.min over all bids → encrypted winner"],
                ["publishDecryptResult(round)", "Publish only the winning discount"],
              ]}
            />
            <ContractRef
              name="KuraCredit.sol"
              fns={[
                ["scoreOf(address) → euint64", "Returns encrypted KURA score"],
                ["verify(threshold) → ebool", "Double-blind FHE.gte check"],
                ["grantPermit(auditor, expiry)", "Time-bound audit access"],
              ]}
            />
          </Section>

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

function ContractRef({ name, fns }: { name: string; fns: [string, string][] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-5 py-3 border-b border-border/60 bg-background/40 flex items-center gap-2">
        <Code2 className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-sm">{name}</span>
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
    a: "Nobody. Your amount is encrypted in your browser before it ever reaches the contract. Only you hold the key to decrypt your own balance.",
  },
  {
    q: "What happens if I lose a round bid?",
    a: "Your bid stays encrypted forever. The contract only ever decrypts the winning discount via publishDecryptResult — losing bids are mathematically inaccessible.",
  },
  {
    q: "How can DeFi protocols use my KURA score?",
    a: "Through double-blind verification. The protocol provides their threshold (encrypted), your score is encrypted, and FHE.gte returns a single boolean. Neither value is ever revealed.",
  },
  {
    q: "What chain does KURA run on?",
    a: "KURA is live on Base Sepolia for the current wave, using Fhenix CoFHE for FHE operations. Multi-chain support arrives in Wave 5.",
  },
  {
    q: "Can the circle admin coerce me?",
    a: "The admin cannot see your contribution amount, your bid, or your score. They can only see counts (e.g. 6 of 8 contributed). Coercion based on amounts is impossible.",
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
