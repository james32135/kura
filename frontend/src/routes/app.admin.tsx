import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Play,
  ShieldAlert,
  Loader2,
  Users,
  Clock,
  Hash,
  ArrowRight,
  CheckCircle2,
  Info,
  Zap,
  CircleSlash,
  Plus,
} from "lucide-react";
import { AppHeader, StatCard } from "@/components/app/AppPrimitives";
import { useAccount } from "wagmi";
import { useKuraCircle } from "@/hooks/useKuraCircle";
import { useKuraBid } from "@/hooks/useKuraBid";
import { useAutoSettler, type StepLog } from "@/hooks/useAutoSettler";
import { useCircle } from "@/context/CircleContext";

export const Route = createFileRoute("/app/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { address } = useAccount();
  const { selectedCircleId, myCircles } = useCircle();
  const {
    circleInfo,
    members,
    startRound,
    loading,
    step,
    refetchCircle,
  } = useKuraCircle(selectedCircleId);

  const info = circleInfo as readonly [string, bigint, bigint, bigint, bigint, boolean, bigint, boolean] | undefined;
  const adminAddr = info?.[0] ?? "0x0000000000000000000000000000000000000000";
  const maxMembers = info ? Number(info[2]) : 0;
  const totalRounds = info ? Number(info[6]) : 0;
  const currentRound = info ? Number(info[3]) : 0;
  const circleActive = info?.[5] ?? false;
  const circleCompleted = info?.[7] === true;
  const noCircleYet = adminAddr === "0x0000000000000000000000000000000000000000";

  const isAdmin = address?.toLowerCase() === adminAddr?.toLowerCase();
  const memberList = (members as string[]) ?? [];

  const currentRoundBigInt = info ? info[3] : 1n;
  const { isClosed } = useKuraBid(selectedCircleId, currentRoundBigInt);
  const closed = isClosed === true;

  const auto = useAutoSettler(selectedCircleId);
  const [manualWinner, setManualWinner] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advanceErr, setAdvanceErr] = useState<string | null>(null);

  const [maxMem, setMaxMem] = useState("5");
  const [roundDur, setRoundDur] = useState("604800");
  const [rounds, setRounds] = useState("5");
  const [minContrib, setMinContrib] = useState("10");
  // suppress "unused" warnings while keeping local state available for future inline create UI
  void maxMem; void setMaxMem; void roundDur; void setRoundDur;
  void rounds; void setRounds; void minContrib; void setMinContrib;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (!noCircleYet && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="font-display text-xl font-semibold">Admin access required</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          Only the circle creator can manage settings, start rounds, and close rounds. Connect with the admin wallet to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppHeader
        eyebrow="Admin"
        title="Manage Circle"
        sub={noCircleYet ? "Create a new savings circle to get started." : "Manage your circle settings and rounds."}
      />

      {noCircleYet ? (
        <NoCircleSelected count={myCircles.length} />
      ) : (
        <>
          {/* Circle overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Circle" value={`#${selectedCircleId.toString()}`} icon={Hash} accent />
            <StatCard label="Members" value={`${memberList.length} / ${maxMembers}`} icon={Users} />
            <StatCard label="Round" value={`${currentRound} / ${totalRounds}`} icon={Hash} />
            <StatCard label="Status" value={circleCompleted ? "Completed" : circleActive ? "Active" : "Inactive"} icon={circleCompleted ? CheckCircle2 : circleActive ? CheckCircle2 : Clock} accent={circleActive || circleCompleted} />
          </div>

          {/* Members list */}
          <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40">
              <h3 className="font-display text-lg font-semibold">Members</h3>
              <p className="text-xs text-muted-foreground mt-1">Everyone who joined this circle</p>
            </div>
            {memberList.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">No members yet. Share the circle link to invite people.</p>
            ) : (
              <ul>
                {memberList.map((m, i) => (
                  <li key={m} className="flex items-center gap-3 px-6 py-3 border-b border-border/40 last:border-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-warm/30 flex items-center justify-center text-xs font-mono">{i + 1}</div>
                    <span className="font-mono text-sm">{m.slice(0, 6)}...{m.slice(-4)}</span>
                    {m.toLowerCase() === adminAddr.toLowerCase() && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest border border-primary/30 text-primary bg-primary/10">Admin</span>
                    )}
                    {m.toLowerCase() === address?.toLowerCase() && m.toLowerCase() !== adminAddr.toLowerCase() && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest border border-primary/30 text-primary bg-primary/10">You</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Round lifecycle: one-click Advance Round + start round */}
          {circleActive && !circleCompleted && (
            <RoundLifecycleCard
              currentRound={currentRound}
              totalRounds={totalRounds}
              closed={closed}
              startRound={startRound}
              startLoading={loading}
              startStep={step}
              auto={auto}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              manualWinner={manualWinner}
              setManualWinner={setManualWinner}
              advanceErr={advanceErr}
              setAdvanceErr={setAdvanceErr}
              refetchCircle={refetchCircle}
            />
          )}

          {/* Circle completed banner */}
          {circleCompleted && (
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-display text-lg font-semibold">Circle Completed</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    All {totalRounds} rounds have finished. Every member earned +5 encrypted credit points. Members can now use their reputation in other circles.
                  </p>
                  <Link to="/app/circles" className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                    Create a new circle <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Participation */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
            <h3 className="font-display text-lg font-semibold">Participation</h3>
            <p className="text-sm text-muted-foreground mt-1">Overview of member activity in the current circle.</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Active Members</p>
                <p className="mt-2 font-display text-xl">{memberList.length}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Max Capacity</p>
                <p className="mt-2 font-display text-xl">{maxMembers}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NoCircleSelected({ count }: { count: number }) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-8 text-center">
      <CircleSlash className="h-10 w-10 text-primary/60 mx-auto mb-4" />
      <h3 className="font-display text-lg font-semibold">
        {count === 0 ? "No circle selected" : "Select a circle to manage"}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        {count === 0
          ? "Head to My Circles to create a new savings circle or join an existing one."
          : "Pick a circle you administer from the sidebar, or create a new one."}
      </p>
      <Link
        to="/app/circles"
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 transition text-sm font-medium"
      >
        <Plus className="h-4 w-4" /> Go to My Circles
      </Link>
    </div>
  );
}

function RoundLifecycleCard({
  currentRound,
  totalRounds,
  closed,
  startRound,
  startLoading,
  startStep,
  auto,
  showAdvanced,
  setShowAdvanced,
  manualWinner,
  setManualWinner,
  advanceErr,
  setAdvanceErr,
  refetchCircle,
}: {
  currentRound: number;
  totalRounds: number;
  closed: boolean;
  startRound: () => Promise<unknown>;
  startLoading: boolean;
  startStep: string;
  auto: ReturnType<typeof useAutoSettler>;
  showAdvanced: boolean;
  setShowAdvanced: (b: boolean) => void;
  manualWinner: string;
  setManualWinner: (s: string) => void;
  advanceErr: string | null;
  setAdvanceErr: (s: string | null) => void;
  refetchCircle: () => void;
}) {
  const noRoundYet = currentRound === 0;
  // After bidding closes, "Advance Round" runs the rest of the lifecycle in one click
  const showAdvance = !noRoundYet && closed;

  async function runAdvance() {
    setAdvanceErr(null);
    try {
      const winner = manualWinner && manualWinner.startsWith("0x") ? (manualWinner as `0x${string}`) : undefined;
      await auto.advanceRound(winner);
      await refetchCircle();
    } catch (e: any) {
      setAdvanceErr(e?.shortMessage ?? e?.message ?? "Failed to advance");
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Round Lifecycle
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {noRoundYet
              ? "No round has started yet. Click below to kick off round 1."
              : closed
                ? `Round ${currentRound} bidding closed. One click to settle, pay out, and start the next round.`
                : `Round ${currentRound} of ${totalRounds} is open for contributions and bids.`}
          </p>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
        >
          {showAdvanced ? "Hide" : "Advanced"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Start Round (used to kick off rounds 1..N when no round is active or after a settled round if AdvanceRound didn't auto-start) */}
        {(noRoundYet || (currentRound < totalRounds && !closed && !auto.running)) && (
          <button
            onClick={() => startRound()}
            disabled={startLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {startLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {currentRound === 0 ? "Start Round 1" : `Start Round ${currentRound + 1}`}
          </button>
        )}

        {/* One-click Advance — closes (if needed), settles, transfers pool, advances to next round */}
        {showAdvance && (
          <button
            onClick={runAdvance}
            disabled={auto.running}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-50 shadow-[0_0_20px_oklch(0.78_0.13_200_/_0.25)]"
          >
            {auto.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {auto.running ? "Running…" : "Advance Round"}
          </button>
        )}
      </div>

      {/* Manual winner input (used as fallback if encrypted winner detection unavailable) */}
      {showAdvance && (
        <div className="rounded-xl border border-border/40 bg-background/30 p-3 space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Winner Address (optional — auto-detected from encrypted bidder if KuraBid v2)
          </label>
          <input
            value={manualWinner}
            onChange={(e) => setManualWinner(e.target.value)}
            placeholder="0x… (leave blank to auto-detect)"
            className="w-full px-3 py-2 rounded-lg border border-border/60 bg-background/40 text-xs font-mono focus:border-primary/50 focus:outline-none transition"
          />
        </div>
      )}

      {/* Live timeline */}
      {auto.logs.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-background/40 p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Progress</p>
          {auto.logs.map((entry, i) => (
            <TimelineRow key={i} entry={entry} />
          ))}
        </div>
      )}

      {advanceErr && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] px-4 py-3 text-xs text-destructive">
          {advanceErr}
        </div>
      )}

      {startStep && startLoading && (
        <p className="text-xs font-mono text-primary animate-pulse">{startStep}</p>
      )}

      {/* Help section */}
      <div className="rounded-lg border border-border/40 bg-background/20 p-3 flex gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
        <p>
          <strong>Advance Round</strong> closes bidding (if open), decrypts the lowest bid, transfers the encrypted pool to the
          winner, and starts the next round — all from one button. Each step is a separate wallet confirmation.
        </p>
      </div>
    </div>
  );
}

function TimelineRow({ entry }: { entry: StepLog }) {
  const color =
    entry.status === "done"
      ? "text-primary"
      : entry.status === "running"
        ? "text-warm"
        : entry.status === "skipped"
          ? "text-muted-foreground"
          : entry.status === "error"
            ? "text-destructive"
            : "text-muted-foreground";
  const icon =
    entry.status === "done" ? (
      <CheckCircle2 className="h-3.5 w-3.5" />
    ) : entry.status === "running" ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    ) : entry.status === "error" ? (
      <Info className="h-3.5 w-3.5" />
    ) : (
      <Clock className="h-3.5 w-3.5" />
    );
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={`mt-0.5 ${color}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-wider">
          <span className={color}>{entry.step.replace(/-/g, " ")}</span>
          {entry.txHash && (
            <a
              href={`https://sepolia.arbiscan.io/tx/${entry.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="ml-2 text-muted-foreground hover:text-primary transition"
            >
              ↗ tx
            </a>
          )}
        </p>
        {entry.message && <p className="text-[11px] text-muted-foreground">{entry.message}</p>}
      </div>
    </div>
  );
}
