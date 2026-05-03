import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, CircleDollarSign, Zap, ArrowRight, Lock, CheckCircle2, Wallet, Users } from "lucide-react";
import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/app/onboarding")({
  component: OnboardingPage,
});

const STEPS = [
  {
    id: 1,
    icon: Users,
    title: "What is a savings circle?",
    subtitle: "Trusted by 1 billion people. Now private.",
    body: "A savings circle (called a \"tanda\", \"chit fund\", or \"susu\") is a group of people who pool money together every round. Each round, one member receives the full pot. KURA makes it private and fraud-proof using cryptography — no one can see your balance, and the payout order is mathematically fair.",
    visual: "circle",
  },
  {
    id: 2,
    icon: Shield,
    title: "Your privacy is non-negotiable.",
    subtitle: "Fully Homomorphic Encryption (FHE) on every transaction.",
    body: "Unlike other savings apps, KURA encrypts your contribution amounts directly in your browser before they ever touch the blockchain. Even the contract operator cannot see your balance. Your credit score stays encrypted. Your bid amount stays sealed. Only you see your data.",
    visual: "fhe",
  },
  {
    id: 3,
    icon: Wallet,
    title: "Connect your wallet.",
    subtitle: "One wallet. Full control.",
    body: "Connect your wallet to get started. You'll need a small amount of ETH (Arbitrum Sepolia testnet) for gas, and cUSDC to contribute. You can wrap any USDC to cUSDC inside the app.",
    visual: "wallet",
  },
  {
    id: 4,
    icon: CircleDollarSign,
    title: "You're ready!",
    subtitle: "Join a circle or create your own.",
    body: "Browse available circles, check their requirements, and join one that fits your goals. Each circle shows the round duration, required contribution range, and member count — without ever revealing individual balances.",
    visual: "ready",
  },
];

function CircleVisual() {
  return (
    <svg viewBox="0 0 280 120" className="w-full max-w-xs mx-auto" aria-hidden>
      {[
        { cx: 140, cy: 60, r: 42, label: "Circle Pool", sub: "Encrypted" },
        { cx: 40, cy: 30, label: "Alice" },
        { cx: 240, cy: 30, label: "Bob" },
        { cx: 40, cy: 90, label: "Carol" },
        { cx: 240, cy: 90, label: "You" },
      ].map((n, i) =>
        i === 0 ? (
          <g key="pool">
            <circle cx={n.cx} cy={n.cy} r={n.r} fill="none" stroke="oklch(0.78 0.13 200)" strokeWidth="1.5" opacity={0.6} />
            <circle cx={n.cx} cy={n.cy} r={n.r! - 8} fill="oklch(0.78 0.13 200 / 0.07)" />
            <text x={n.cx} y={n.cy - 4} textAnchor="middle" fill="oklch(0.78 0.13 200)" fontSize="10" fontWeight="600">{n.label}</text>
            <text x={n.cx} y={n.cy + 10} textAnchor="middle" fill="oklch(0.78 0.13 200)" fontSize="8" opacity={0.7}>{n.sub}</text>
          </g>
        ) : (
          <g key={n.label}>
            <circle cx={n.cx} cy={n.cy} r="18" fill="none" stroke="oklch(0.78 0.13 200 / 0.3)" strokeWidth="1" />
            <text x={n.cx} y={n.cy + 4} textAnchor="middle" fill="currentColor" fontSize="9" className="fill-muted-foreground">{n.label}</text>
            <line x1={n.cx > 140 ? n.cx - 18 : n.cx + 18} y1={n.cy} x2={n.cy < 60 ? 140 - 30 : 140 + 30} y2={60} stroke="oklch(0.78 0.13 200 / 0.2)" strokeDasharray="3 2" strokeWidth="1" />
          </g>
        )
      )}
    </svg>
  );
}

function FheVisual() {
  return (
    <div className="flex items-center justify-center gap-4">
      {[
        { label: "Your amount", bg: "from-muted/30 to-muted/10", text: "100 USDC" },
        { label: "", bg: "", text: "→" },
        { label: "Encrypted", bg: "from-primary/20 to-primary/5", text: "0x3f…a8" },
        { label: "", bg: "", text: "→" },
        { label: "Blockchain", bg: "from-muted/30 to-muted/10", text: "🔒" },
      ].map((item, i) =>
        item.label ? (
          <div key={i} className={`rounded-xl border border-border/50 bg-gradient-to-br ${item.bg} px-4 py-3 text-center`}>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{item.label}</p>
            <p className="font-mono text-sm font-semibold">{item.text}</p>
          </div>
        ) : (
          <span key={i} className="text-muted-foreground text-lg">{item.text}</span>
        )
      )}
    </div>
  );
}

function ReadyVisual() {
  const tiers = [
    { label: "Open Circle", icon: "🌐", desc: "No requirements" },
    { label: "Silver+", icon: "🥈", desc: "15+ contribution points" },
    { label: "Gold+", icon: "🥇", desc: "30+ contribution points" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto">
      {tiers.map((t) => (
        <div key={t.label} className="rounded-xl border border-border/50 bg-card/60 p-3 text-center">
          <div className="text-2xl mb-1">{t.icon}</div>
          <p className="text-xs font-semibold">{t.label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
        </div>
      ))}
    </div>
  );
}

function WalletVisual() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-5 flex items-center gap-3">
        <Wallet className="h-6 w-6 text-primary" />
        <div>
          <p className="text-sm font-semibold">MetaMask / WalletConnect</p>
          <p className="text-xs text-muted-foreground">Any EVM wallet works</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" /> Your keys, your data. No custodian.
      </div>
    </div>
  );
}

const VISUAL_MAP: Record<string, React.ReactNode> = {
  circle: <CircleVisual />,
  fhe: <FheVisual />,
  wallet: <WalletVisual />,
  ready: <ReadyVisual />,
};

function OnboardingPage() {
  const [step, setStep] = useState(0);
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const navigate = useNavigate();

  // Skip onboarding if already completed
  useEffect(() => {
    const done = localStorage.getItem("kura_onboarded");
    if (done === "true") {
      navigate({ to: "/app" });
    }
  }, [navigate]);

  function completeOnboarding() {
    localStorage.setItem("kura_onboarded", "true");
    navigate({ to: "/app" });
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isWalletStep = current.id === 3;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
        <Logo />
        <button
          onClick={completeOnboarding}
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          Skip
        </button>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 pt-6">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`h-2 rounded-full transition-all ${i === step ? "w-6 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-border"}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex flex-col items-center text-center gap-6"
          >
            {/* Icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <current.icon className="h-7 w-7 text-primary" />
            </div>

            {/* Title */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary mb-2">
                Step {current.id} of {STEPS.length}
              </p>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                {current.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{current.subtitle}</p>
            </div>

            {/* Visual */}
            <div className="w-full py-2">
              {VISUAL_MAP[current.visual]}
            </div>

            {/* Body */}
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              {current.body}
            </p>

            {/* Wallet step: show connect button */}
            {isWalletStep && (
              <div className="w-full">
                {address ? (
                  <div className="flex items-center gap-2 justify-center px-4 py-3 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Wallet connected — {address.slice(0, 6)}…{address.slice(-4)}
                  </div>
                ) : (
                  <button
                    onClick={openConnectModal}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
                  >
                    <Wallet className="h-4 w-4" /> Connect Wallet
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="px-6 pb-8 flex items-center justify-between max-w-xl mx-auto w-full gap-4">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-5 py-2.5 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground disabled:opacity-30 hover:bg-white/[0.03] transition"
        >
          Back
        </button>

        {isLast ? (
          <button
            onClick={completeOnboarding}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
          >
            <Zap className="h-4 w-4" /> Enter KURA
          </button>
        ) : (
          <button
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
