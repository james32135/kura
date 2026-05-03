import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  CircleDollarSign,
  Lock,
  Eye,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Info,
  ArrowRight,
  Wallet,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { AppHeader, StatCard, EncryptedValue, ProgressStepper } from "@/components/app/AppPrimitives";
import { useAccount } from "wagmi";
import { useKuraCircle } from "@/hooks/useKuraCircle";
import { useCircle } from "@/context/CircleContext";
import { useConfidentialUSDC } from "@/hooks/useConfidentialUSDC";
import { getFheClient } from "@/lib/fhe";
import { formatUnits } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";

export const Route = createFileRoute("/app/contribute")({
  component: ContributePage,
});

const STEPS = ["Preparing funds", "Authorizing circle", "Encrypting your amount", "Sending to blockchain", "Done!"];

function ContributeFlowDiagram() {
  return (
    <svg viewBox="0 0 500 80" className="w-full max-w-lg mx-auto" aria-label="Contribution flow: Your USDC is encrypted then added to the circle pool">
      {[
        { x: 20, label: "Your USDC" },
        { x: 180, label: "Encrypted" },
        { x: 340, label: "Circle Pool" },
      ].map((item, i, arr) => (
        <g key={item.label}>
          <rect x={item.x} y={10} width="110" height="40" rx="12" fill="none" stroke="oklch(0.78 0.13 200)" strokeWidth="1.5" opacity={0.5} />
          <text x={item.x + 55} y={35} textAnchor="middle" className="fill-foreground text-[11px] font-medium">{item.label}</text>
          {i < arr.length - 1 && (
            <>
              <line x1={item.x + 115} y1={30} x2={arr[i + 1].x - 5} y2={30} stroke="oklch(0.78 0.13 200)" strokeWidth="1" opacity={0.3} strokeDasharray="4 3" />
              <text x={(item.x + 115 + arr[i + 1].x - 5) / 2} y={55} textAnchor="middle" className="fill-muted-foreground text-[8px]">{i === 0 ? "FHE encrypt" : "add to pool"}</text>
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

function ContributePage() {
  const { address } = useAccount();
  const { selectedCircleId } = useCircle();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const {
    circleInfo,
    userIsMember,
    hasContributed,
    contribute,
    getMyContribution,
    loading: circleLoading,
    step: circleStep,
  } = useKuraCircle(selectedCircleId);

  const {
    usdcBalance,
    isCircleOperator,
    wrapUsdc,
    setKuraCircleOperator,
    loading: usdcLoading,
    step: usdcStep,
  } = useConfidentialUSDC();

  const info = circleInfo as readonly [string, bigint, bigint, bigint, bigint, boolean, bigint, boolean] | undefined;
  const circleActive = info?.[5] ?? false;
  const currentRound = info ? Number(info[3]) : 0;

  const balance = usdcBalance ? formatUnits(usdcBalance as bigint, 6) : "0";
  const operatorSet = isCircleOperator === true;

  const [amount, setAmount] = useState("");
  const [wrapAmount, setWrapAmount] = useState("");
  const [wrapDone, setWrapDone] = useState(false);
  const [myContrib, setMyContrib] = useState<string | null>(null);
  const [decryptStage, setDecryptStage] = useState(-1);
  const [error, setError] = useState("");
  const [showTransak, setShowTransak] = useState(false);

  const DECRYPT_STEPS = ["Requesting permission", "Reading encrypted data", "Decrypting privately", "Done"];

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Pre-initialize FHE client so encrypt is faster when user clicks contribute
  useEffect(() => {
    if (publicClient && walletClient) {
      getFheClient(publicClient, walletClient).catch(() => {});
    }
  }, [publicClient, walletClient]);

  const loading = circleLoading || usdcLoading;
  const step = circleStep || usdcStep;

  const handleWrap = useCallback(async () => {
    setError("");
    try {
      const val = BigInt(Math.round(Number(wrapAmount) * 1e6));
      await wrapUsdc(val);
      // Wait for cUSDC rate-limit cooldown before allowing next step
      setWrapDone(true);
    } catch (e: any) {
      setError(e?.message?.slice(0, 200) || "Wrap failed");
    }
  }, [wrapAmount, wrapUsdc]);

  const handleSetOperator = useCallback(async () => {
    setError("");
    try {
      await setKuraCircleOperator();
    } catch (e: any) {
      setError(e?.message?.slice(0, 200) || "Set operator failed");
    }
  }, [setKuraCircleOperator]);

  const handleContribute = useCallback(async () => {
    setError("");
    try {
      const val = BigInt(Math.round(Number(amount) * 1e6));
      await contribute(val);
    } catch (e: any) {
      setError(e?.message?.slice(0, 200) || "Contribution failed");
    }
  }, [amount, contribute]);

  const handleReveal = useCallback(async () => {
    try {
      setDecryptStage(0);
      const val = await getMyContribution();
      setDecryptStage(3);
      if (val !== undefined) setMyContrib(formatUnits(val, 6));
    } catch (e) {
      console.error(e);
      setDecryptStage(-1);
    }
  }, [getMyContribution]);

  if (!mounted) return null;

  const isMember = userIsMember === true;
  const alreadyContributed = hasContributed === true;

  const stepIdx = step.toLowerCase().includes("prepar") ? 0
    : step.toLowerCase().includes("authoriz") || step.toLowerCase().includes("approv") || step.toLowerCase().includes("operator") ? 1
    : step.toLowerCase().includes("encrypt") ? 2
    : step.toLowerCase().includes("submit") || step.toLowerCase().includes("blockchain") ? 3
    : step.toLowerCase().includes("done") || step.toLowerCase().includes("recorded") ? 4
    : -1;

  return (
    <div className="space-y-8">
      <AppHeader
        eyebrow="Contribute"
        title="Add to the Pool"
        sub={circleActive ? `Round ${currentRound} — contribute your share` : "Waiting for the round to start"}
      />

      {/* How contributing works */}
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="font-display text-sm font-semibold">How contributing works</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Your contribution amount is encrypted before it leaves your browser. Nobody — not even the contract owner — can see how much you contributed. The encrypted values are added together on-chain using FHE (Fully Homomorphic Encryption).
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ContributeFlowDiagram />
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Your USDC" value={`$${balance}`} icon={Wallet} />
        <StatCard label="Circle Authorized" value={operatorSet ? "Yes" : "Not yet"} icon={ShieldCheck} accent={operatorSet} />
        <StatCard label="This Round" value={alreadyContributed ? "Contributed" : "Pending"} icon={alreadyContributed ? CheckCircle2 : CircleDollarSign} accent={alreadyContributed} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Already contributed */}
      {alreadyContributed && (
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <div>
              <h3 className="font-display text-base font-semibold">Contribution recorded</h3>
              <p className="text-xs text-muted-foreground">Your encrypted contribution is in the pool for round {currentRound}.</p>
            </div>
          </div>

          {myContrib === null ? (
            <button onClick={handleReveal} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 text-sm text-primary hover:bg-primary/10 transition disabled:opacity-50">
              <Eye className="h-4 w-4" />
              Reveal my contribution
            </button>
          ) : (
            <EncryptedValue label="Your contribution" value={`$${myContrib}`} />
          )}

          {decryptStage >= 0 && decryptStage < 3 && <ProgressStepper stage={decryptStage} steps={DECRYPT_STEPS} />}
        </div>
      )}

      {/* Fiat on-ramp — buy USDC with card/bank if wallet is empty */}
      {isMember && !alreadyContributed && circleActive && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-semibold">No USDC? Buy with card or bank transfer</p>
              <p className="text-xs text-muted-foreground">170+ countries · real-time KYC · Arbitrum network</p>
            </div>
          </div>
          <button
            onClick={() => setShowTransak(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 text-sm text-primary hover:bg-primary/10 transition"
          >
            Buy USDC <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Transak widget modal */}
      {showTransak && address && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setShowTransak(false)}
              className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-background/80 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition text-xs"
            >
              ✕
            </button>
            <iframe
              src={`https://global.transak.com/?apiKey=f37d60c6-a68c-4cf9-8a6c-8e65a7f58cf2&cryptoCurrencyCode=USDC&network=arbitrum&walletAddress=${address}&defaultFiatAmount=50&themeColor=5a8aff&exchangeScreenTitle=Buy+USDC+for+KURA`}
              title="Buy USDC with Transak"
              className="w-full h-[620px] border-0"
              allow="camera;microphone;payment"
            />
          </div>
        </div>
      )}

      {/* Step 1: Wrap USDC → cUSDC */}
      {isMember && !alreadyContributed && circleActive && !wrapDone && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-5">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Step 1 — Wrap USDC → cUSDC
          </h3>
          <p className="text-xs text-muted-foreground">
            KURA uses encrypted USDC (cUSDC). First, wrap your USDC into its confidential form. This is a one-time step per contribution.
          </p>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Amount (USDC)</label>
            <div className="mt-2 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-display">$</span>
              <input
                type="number"
                value={wrapAmount}
                onChange={(e) => setWrapAmount(e.target.value)}
                placeholder="2.00"
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-border/70 bg-background/60 pl-8 pr-4 py-3 font-display text-base outline-none focus:border-primary/60 transition"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Your USDC balance: ${balance}</p>
          </div>

          <button
            onClick={handleWrap}
            disabled={loading || !wrapAmount}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {loading ? step || "Processing..." : "Wrap USDC → cUSDC"}
          </button>
        </div>
      )}

      {/* Step 2: Set Operator */}
      {isMember && !alreadyContributed && circleActive && wrapDone && !operatorSet && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-5">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Step 2 — Authorize Circle
          </h3>
          <p className="text-xs text-muted-foreground">
            Allow the KURA circle contract to handle your encrypted USDC. This is a one-time authorization — FHERC20 uses "setOperator" instead of traditional approval.
          </p>

          <button
            onClick={handleSetOperator}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {loading ? step || "Processing..." : "Authorize Circle Contract"}
          </button>
        </div>
      )}

      {/* Step 3: Encrypt & Contribute */}
      {isMember && !alreadyContributed && circleActive && operatorSet && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-5">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            {wrapDone ? "Step 3 — " : ""}Encrypt & Contribute
          </h3>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Amount (USDC)</label>
            <div className="mt-2 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-display">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2.00"
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-border/70 bg-background/60 pl-8 pr-4 py-3 font-display text-base outline-none focus:border-primary/60 transition"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-1">This amount will be encrypted — no one can see it</p>
          </div>

          <button
            onClick={handleContribute}
            disabled={loading || !amount}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {loading ? step || "Processing..." : "Encrypt & Contribute"}
          </button>

          {loading && stepIdx >= 0 && <ProgressStepper stage={stepIdx} steps={STEPS} />}
        </div>
      )}

      {/* Not a member */}
      {!isMember && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">You need to join the circle first before contributing.</p>
        </div>
      )}

      {/* Privacy assurance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PrivacyItem icon={Lock} title="Amount hidden" desc="Your contribution amount is encrypted in your browser before submission" />
        <PrivacyItem icon={Eye} title="Identity visible" desc="Members can see who contributed, but never the amounts" />
        <PrivacyItem icon={ShieldCheck} title="Pool total private" desc="The pool balance is computed on encrypted data — never exposed" />
      </div>
    </div>
  );
}

function PrivacyItem({ icon: Icon, title, desc }: { icon: typeof Lock; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <Icon className="h-4 w-4 text-primary mb-2" />
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
