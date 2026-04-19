import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Gavel,
  Lock,
  Loader2,
  CheckCircle2,
  Info,
  Eye,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { AppHeader, StatCard, EncryptedValue, ProgressStepper } from "@/components/app/AppPrimitives";
import { useAccount } from "wagmi";
import { useKuraCircle } from "@/hooks/useKuraCircle";
import { useKuraBid } from "@/hooks/useKuraBid";
import { useCircle } from "@/context/CircleContext";
import { formatUnits } from "viem";

export const Route = createFileRoute("/app/bid")({
  component: BidPage,
});

function BiddingFlowDiagram() {
  return (
    <svg viewBox="0 0 540 80" className="w-full max-w-lg mx-auto" aria-label="Bidding flow: Your bid is encrypted, compared on-chain, winner revealed">
      {[
        { x: 10, label: "Your Bid" },
        { x: 145, label: "Encrypted" },
        { x: 280, label: "Compare" },
        { x: 415, label: "Winner" },
      ].map((item, i, arr) => (
        <g key={item.label}>
          <rect x={item.x} y={10} width="100" height="40" rx="12" fill="none" stroke="oklch(0.78 0.13 200)" strokeWidth="1.5" opacity={0.5} />
          <text x={item.x + 50} y={35} textAnchor="middle" className="fill-foreground text-[11px] font-medium">{item.label}</text>
          {i < arr.length - 1 && (
            <line x1={item.x + 105} y1={30} x2={arr[i + 1].x - 5} y2={30} stroke="oklch(0.78 0.13 200)" strokeWidth="1" opacity={0.3} strokeDasharray="4 3" />
          )}
        </g>
      ))}
      <text x={270} y={72} textAnchor="middle" className="fill-muted-foreground text-[8px]">All bids compared on encrypted data — losing bids never revealed</text>
    </svg>
  );
}

function BidPage() {
  const { address } = useAccount();
  const { selectedCircleId } = useCircle();
  const { circleInfo, userIsMember, getPoolBalance, loading: circleLoading, step: circleStep } = useKuraCircle(selectedCircleId);

  const info = circleInfo as readonly [string, bigint, bigint, bigint, bigint, boolean, bigint, boolean] | undefined;
  const circleActive = info?.[5] ?? false;
  const currentRound = info ? Number(info[3]) : 0;
  const currentRoundBigInt = info ? info[3] : 1n;

  const {
    userHasBid,
    roundResult,
    bidCount,
    isClosed,
    submitBid,
    loading,
    step,
  } = useKuraBid(selectedCircleId, currentRoundBigInt);

  const [amount, setAmount] = useState("");
  const [poolVal, setPoolVal] = useState<string | null>(null);

  const STEPS = ["Encrypting your bid", "Submitting sealed bid", "Verifying on-chain", "Bid sealed!"];

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleBid = useCallback(async () => {
    const val = BigInt(Math.round(Number(amount) * 1e6));
    await submitBid(val);
  }, [amount, submitBid]);

  const handleRevealPool = useCallback(async () => {
    try {
      const val = await getPoolBalance();
      if (val !== undefined) setPoolVal(formatUnits(val, 6));
    } catch (e) {
      console.error(e);
    }
  }, [getPoolBalance]);

  if (!mounted) return null;

  const isMember = userIsMember === true;
  const hasBid = userHasBid === true;
  const closed = isClosed === true;
  const bids = bidCount ? Number(bidCount) : 0;
  const result = roundResult as readonly [string, bigint] | undefined;
  const winner = result?.[0];
  const winningBid = result?.[1];

  const stepIdx = step.toLowerCase().includes("encrypt") ? 0
    : step.toLowerCase().includes("submit") || step.toLowerCase().includes("sealed") ? 1
    : step.toLowerCase().includes("verif") ? 2
    : step.toLowerCase().includes("done") || step.toLowerCase().includes("sealed!") ? 3
    : -1;

  return (
    <div className="space-y-8">
      <AppHeader
        eyebrow="Bid"
        title="Bid for the Pool"
        sub={circleActive ? `Round ${currentRound} — place your sealed bid` : "Waiting for round to start"}
      />

      {/* How bidding works */}
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="font-display text-sm font-semibold">How bidding works</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Bid the discount you are willing to accept on the pool. Your bid is encrypted — nobody can see it. The lowest bid wins the pool. Losing bids are permanently encrypted and never revealed.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <BiddingFlowDiagram />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Round" value={String(currentRound)} icon={Gavel} accent />
        <StatCard label="Bids Placed" value={String(bids)} icon={Lock} />
        <StatCard label="Status" value={closed ? "Closed" : "Open"} icon={closed ? CheckCircle2 : Gavel} accent={!closed} />
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Pool Balance</p>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          {poolVal !== null ? (
            <p className="mt-3 font-display text-2xl tabular-nums">${poolVal}</p>
          ) : (
            <button onClick={handleRevealPool} disabled={circleLoading} className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <Eye className="h-3.5 w-3.5" /> Reveal
            </button>
          )}
        </div>
      </div>

      {/* Already bid */}
      {hasBid && !closed && (
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-6 flex items-center gap-4">
          <CheckCircle2 className="h-8 w-8 text-primary shrink-0" />
          <div>
            <h3 className="font-display text-base font-semibold">Bid locked in</h3>
            <p className="text-xs text-muted-foreground mt-1">Your sealed bid has been recorded for round {currentRound}. It is permanently encrypted — never revealed unless you win.</p>
          </div>
        </div>
      )}

      {/* Round result */}
      {closed && winner && winner !== "0x0000000000000000000000000000000000000000" && (
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent p-6 space-y-3">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Round {currentRound} Winner
          </h3>
          <p className="font-mono text-sm">{winner.slice(0, 6)}...{winner.slice(-4)}</p>
          {winningBid && winningBid > 0n && (
            <p className="text-xs text-muted-foreground">
              Winning discount: ${formatUnits(winningBid, 6)} · <span className="text-primary">Verified on-chain</span>
            </p>
          )}
        </div>
      )}

      {/* Bid form */}
      {isMember && !hasBid && !closed && circleActive && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-5">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            Place your bid
          </h3>
          <p className="text-xs text-muted-foreground">
            Enter the discount you are willing to accept. Lower bids have a better chance of winning. Your bid is encrypted — no one can see it.
          </p>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Discount Amount (USDC)</label>
            <div className="mt-2 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-display">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5.00"
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-border/70 bg-background/60 pl-8 pr-4 py-3 font-display text-base outline-none focus:border-primary/60 transition"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Lower bid = better chance of winning</p>
          </div>

          <button
            onClick={handleBid}
            disabled={loading || !amount}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {loading ? step || "Processing..." : "Encrypt & Submit Bid"}
          </button>

          {loading && stepIdx >= 0 && <ProgressStepper stage={stepIdx} steps={STEPS} />}
        </div>
      )}

      {/* Not a member */}
      {!isMember && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">You need to join the circle first before bidding.</p>
        </div>
      )}
    </div>
  );
}
