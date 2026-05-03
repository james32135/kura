import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Lock,
  Eye,
  Loader2,
  CheckCircle2,
  Info,
  Star,
  Award,
  TrendingUp,
  Layers,
  Hash,
} from "lucide-react";
import { AppHeader, StatCard, EncryptedValue, ProgressStepper } from "@/components/app/AppPrimitives";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useKuraCredit, CREDIT_TIERS } from "@/hooks/useKuraCredit";
import { useMyCircles } from "@/hooks/useMyCircles";
import { useCircle } from "@/context/CircleContext";
import { decryptForView } from "@/lib/fhe";
import { useReadContract } from "wagmi";

export const Route = createFileRoute("/app/credit")({
  component: CreditPage,
});

function ScoringDiagram() {
  return (
    <svg viewBox="0 0 520 80" className="w-full max-w-lg mx-auto" aria-label="Scoring: Contribute on time earns points, complete circle earns bonus, score stays encrypted">
      {[
        { x: 10, label: "Contribute", sub: "+1 point" },
        { x: 175, label: "Complete circle", sub: "+5 points" },
        { x: 355, label: "Encrypted Score", sub: "Private" },
      ].map((item, i, arr) => (
        <g key={item.label}>
          <rect x={item.x} y={8} width="130" height="40" rx="12" fill="none" stroke="oklch(0.78 0.13 200)" strokeWidth="1.5" opacity={0.5} />
          <text x={item.x + 65} y={28} textAnchor="middle" className="fill-foreground text-[10px] font-medium">{item.label}</text>
          <text x={item.x + 65} y={40} textAnchor="middle" className="fill-primary text-[9px]">{item.sub}</text>
          {i < arr.length - 1 && (
            <line x1={item.x + 135} y1={28} x2={arr[i + 1].x - 5} y2={28} stroke="oklch(0.78 0.13 200)" strokeWidth="1" opacity={0.3} strokeDasharray="4 3" />
          )}
        </g>
      ))}
      <text x={260} y={70} textAnchor="middle" className="fill-muted-foreground text-[8px]">Score verified on-chain without revealing it (FHE comparison)</text>
    </svg>
  );
}

function CreditPage() {
  const { address } = useAccount();
  const { circles: myCircles } = useMyCircles();
  const { selectedCircleId } = useCircle();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const {
    contributionCount,
    circlesCompleted,
    creditStats,
    tier,
    tierName,
    getMyScore,
    verifyCreditworthiness,
    loading,
    step,
  } = useKuraCredit();

  const [score, setScore] = useState<string | null>(null);
  const [decryptStage, setDecryptStage] = useState(-1);
  const [verifyAddr, setVerifyAddr] = useState("");
  const [verifyThreshold, setVerifyThreshold] = useState("");
  const [roundPos, setRoundPos] = useState<string | null>(null);
  const [roundPosLoading, setRoundPosLoading] = useState(false);
  const [roundPosStep, setRoundPosStep] = useState("");

  const DECRYPT_STEPS = ["Requesting permission", "Reading encrypted score", "Decrypting privately", "Done"];

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleRevealScore = useCallback(async () => {
    try {
      setDecryptStage(0);
      const val = await getMyScore();
      setDecryptStage(3);
      if (val !== undefined) setScore(String(Number(val)));
    } catch (e) {
      console.error(e);
      setDecryptStage(-1);
    }
  }, [getMyScore]);

  // Round order position reveal — reads euint8 handle then decrypts locally
  const ROUND_ORDER_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`; // updated on redeploy
  const ROUND_ORDER_ABI = [
    { name: "getMyPositionHandle", type: "function", stateMutability: "view", inputs: [{ name: "circleId", type: "uint256" }], outputs: [{ name: "", type: "bytes32" }] },
    { name: "orderAssigned", type: "function", stateMutability: "view", inputs: [{ name: "circleId", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  ] as const;

  const { data: orderAssigned } = useReadContract({
    address: ROUND_ORDER_ADDRESS,
    abi: ROUND_ORDER_ABI,
    functionName: "orderAssigned",
    args: [selectedCircleId],
    query: { enabled: ROUND_ORDER_ADDRESS !== "0x0000000000000000000000000000000000000000" },
  });

  const handleRevealRoundPosition = useCallback(async () => {
    if (!publicClient || !walletClient || !address) return;
    setRoundPosLoading(true);
    setRoundPosStep("Reading position handle...");
    try {
      const handle = await publicClient.readContract({
        address: ROUND_ORDER_ADDRESS,
        abi: ROUND_ORDER_ABI,
        functionName: "getMyPositionHandle",
        args: [selectedCircleId],
        account: address,
      }) as `0x${string}`;
      setRoundPosStep("Decrypting position privately...");
      const pos = await decryptForView(publicClient, walletClient, handle, setRoundPosStep);
      setRoundPos(String(Number(pos)));
      setRoundPosStep("Revealed!");
    } catch (e) {
      console.error(e);
      setRoundPosStep("Failed to reveal");
    } finally {
      setRoundPosLoading(false);
    }
  }, [publicClient, walletClient, address, selectedCircleId]);

  const handleVerify = useCallback(async () => {
    if (!verifyAddr || !verifyThreshold) return;
    await verifyCreditworthiness(verifyAddr as `0x${string}`, BigInt(verifyThreshold));
  }, [verifyAddr, verifyThreshold, verifyCreditworthiness]);

  if (!mounted) return null;

  const contributions = contributionCount ? Number(contributionCount) : 0;
  const completed = circlesCompleted ? Number(circlesCompleted) : 0;
  const stats = creditStats as readonly [bigint, bigint, bigint, bigint, bigint] | undefined;
  const onTime = stats ? Number(stats[1]) : 0;
  const late = stats ? Number(stats[2]) : 0;

  return (
    <div className="space-y-8">
      <AppHeader
        eyebrow="Reputation"
        title="Your Trust Score"
        sub="Your activity builds a private reputation — verifiable but never exposed"
      />

      {/* How reputation works */}
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="font-display text-sm font-semibold">How your reputation works</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Every on-time contribution earns you points. Completing a full circle earns a bonus. Your score is encrypted on-chain — only you can reveal it. Other circles can verify if your score meets their minimum without seeing the actual number.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ScoringDiagram />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Circles I'm in" value={String(myCircles.length)} icon={Layers} accent={myCircles.length > 0} />
        <StatCard label="Contributions" value={String(contributions)} icon={TrendingUp} />
        <StatCard label="Circles Completed" value={String(completed)} icon={Award} />
        <StatCard label="On-time" value={String(onTime)} icon={CheckCircle2} accent={onTime > 0} />
        <StatCard label="Tier" value={tierName} icon={Star} accent={tier > 0} />
      </div>

      {/* Score reveal */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Your Encrypted Score
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Only you can decrypt this — requires your wallet signature</p>
          </div>
          {score === null ? (
            <button onClick={handleRevealScore} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 text-sm text-primary hover:bg-primary/10 transition disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              {loading ? step || "Decrypting..." : "Reveal Score"}
            </button>
          ) : (
            <div className="text-right">
              <p className="font-display text-3xl tabular-nums text-primary">{score}</p>
              <p className="text-[10px] text-muted-foreground">points</p>
            </div>
          )}
        </div>
        {decryptStage >= 0 && decryptStage < 3 && <ProgressStepper stage={decryptStage} steps={DECRYPT_STEPS} />}
      </div>

      {/* Round Position Reveal — encrypted fair ordering */}
      {orderAssigned && (
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Hash className="h-3 w-3" /> Your Payout Round Position
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Assigned by encrypted randomness — no one chose this for you</p>
            </div>
            {roundPos === null ? (
              <button
                onClick={handleRevealRoundPosition}
                disabled={roundPosLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 text-sm text-primary hover:bg-primary/10 transition disabled:opacity-50"
              >
                {roundPosLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                {roundPosLoading ? roundPosStep || "Decrypting..." : "Reveal My Turn"}
              </button>
            ) : (
              <div className="text-right">
                <p className="font-display text-3xl tabular-nums text-primary">#{roundPos}</p>
                <p className="text-[10px] text-muted-foreground">your payout round</p>
              </div>
            )}
          </div>
          {roundPosLoading && <ProgressStepper stage={0} steps={["Reading handle", "Decrypting position", "Done"]} />}
          <div className="rounded-xl border border-border/40 bg-background/30 px-4 py-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="text-primary font-semibold">How this works:</span> When the circle was created, every member received an encrypted position number using <span className="font-mono text-xs">FHE.randomCiphertext()</span>. Only you can see your position — others cannot see when you're due to receive the pool.
            </p>
          </div>
        </div>
      )}

      {/* Tier roadmap */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          Tier Roadmap
        </h3>
        <div className="space-y-3">
          {CREDIT_TIERS.map((t, i) => {
            const isCurrent = i === tier;
            const thresholds = [0, 5, 15, 30, 60];
            const descriptions = [
              "Starting tier — join a circle to begin",
              "Complete a few contributions",
              "Consistent contributor",
              "Trusted circle member",
              "Elite member — maximum trust",
            ];
            return (
              <div key={t} className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${isCurrent ? "border-primary/30 bg-primary/[0.05]" : "border-border/40 bg-background/30"}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-mono ${isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isCurrent ? "text-primary" : ""}`}>{t}</span>
                    {isCurrent && <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest border border-primary/30 text-primary bg-primary/10">Current</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{descriptions[i]} · {thresholds[i]}+ points</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Privacy-preserving verification */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-5">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Privacy-preserving Verification
        </h3>
        <p className="text-xs text-muted-foreground">
          Check if a member meets a minimum score — without revealing their actual score. The comparison happens entirely on encrypted data.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Member Address</label>
            <input
              value={verifyAddr}
              onChange={(e) => setVerifyAddr(e.target.value)}
              placeholder="0x..."
              className="mt-2 w-full rounded-xl border border-border/70 bg-background/60 px-4 py-3 font-mono text-sm outline-none focus:border-primary/60 transition"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Minimum Score Required</label>
            <input
              type="number"
              value={verifyThreshold}
              onChange={(e) => setVerifyThreshold(e.target.value)}
              placeholder="10"
              className="mt-2 w-full rounded-xl border border-border/70 bg-background/60 px-4 py-3 font-display text-base outline-none focus:border-primary/60 transition"
            />
          </div>
        </div>
        <button
          onClick={handleVerify}
          disabled={loading || !verifyAddr || !verifyThreshold}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          {loading ? step || "Verifying..." : "Verify Score"}
        </button>
        {step && !loading && (
          <p className="text-xs font-mono text-primary">{step}</p>
        )}
      </div>

      {/* Activity summary */}
      {(onTime > 0 || late > 0) && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <h3 className="font-display text-lg font-semibold">Activity Summary</h3>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border/50 bg-background/40 p-4 text-center">
              <p className="font-display text-xl text-primary">{onTime}</p>
              <p className="text-[10px] text-muted-foreground mt-1">On-time</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/40 p-4 text-center">
              <p className="font-display text-xl">{late}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Late</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/40 p-4 text-center">
              <p className="font-display text-xl">{completed}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Completed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
