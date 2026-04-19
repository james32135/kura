import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  UserPlus,
  Crown,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Info,
  Users,
  Hash,
} from "lucide-react";
import { AppHeader } from "@/components/app/AppPrimitives";
import { useAccount } from "wagmi";
import { useCircle } from "@/context/CircleContext";
import { useKuraCircle } from "@/hooks/useKuraCircle";
import { parseUnits } from "viem";

export const Route = createFileRoute("/app/circles")({
  component: MyCirclesPage,
});

function MyCirclesPage() {
  const { address } = useAccount();
  const { myCircles, loadingMyCircles, refetchMyCircles, setSelectedCircleId, selectedCircleId, circleCount } = useCircle();
  const { createCircle, joinCircle, loading, step } = useKuraCircle(0n); // circleId only used for joinCircle below

  const [maxMem, setMaxMem] = useState("5");
  const [roundDur, setRoundDur] = useState("604800");
  const [rounds, setRounds] = useState("5");
  const [minContrib, setMinContrib] = useState("10");
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const [joinId, setJoinId] = useState("");
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  async function handleCreate() {
    setCreateErr(null);
    setCreateMsg(null);
    try {
      const minRaw = parseUnits(minContrib, 6); // cUSDC has 6 decimals
      await createCircle(Number(maxMem), Number(roundDur), Number(rounds), minRaw);
      setCreateMsg("Circle created! Refreshing your list…");
      setTimeout(() => refetchMyCircles(), 2000);
    } catch (e: any) {
      setCreateErr(e?.shortMessage ?? e?.message ?? "Failed to create");
    }
  }

  // Direct joinCircle taking an id from input — bypass the hook's hardcoded circleId
  // by using a per-instance hook below
  return (
    <div className="space-y-8">
      <AppHeader
        eyebrow="Circles"
        title="My Circles"
        sub={`Create new savings circles or join existing ones. Total circles in protocol: ${circleCount.toString()}`}
      />

      {!address && (
        <div className="rounded-2xl border border-warm/30 bg-warm/[0.04] p-5 text-sm text-muted-foreground">
          Connect your wallet to see your circles.
        </div>
      )}

      {/* My Circles grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Your Circles
            <span className="font-mono text-xs text-muted-foreground">({myCircles.length})</span>
          </h2>
          <button
            onClick={refetchMyCircles}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            Refresh
          </button>
        </div>

        {loadingMyCircles && myCircles.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-10 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Scanning circles…
          </div>
        ) : myCircles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-10 text-center">
            <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">You haven't joined any circles yet.</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Create your own below or join one with its ID.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myCircles.map((c) => {
              const round = Number(c.info[3]);
              const total = Number(c.info[6]);
              const memberCount = Number(c.info[1]);
              const maxMembers = Number(c.info[2]);
              const status = c.completed ? "Completed" : c.info[5] ? "Active" : "Waiting";
              const isSelected = c.id === selectedCircleId;
              return (
                <div
                  key={c.id.toString()}
                  className={`rounded-2xl border p-5 transition ${
                    isSelected
                      ? "border-primary/50 bg-gradient-to-br from-primary/[0.08] to-transparent"
                      : "border-border/60 bg-card/60 hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Circle
                      </p>
                      <h3 className="font-display text-2xl tabular-nums flex items-center gap-2">
                        #{c.id.toString()}
                        {c.isAdmin && <Crown className="h-4 w-4 text-primary" />}
                        {c.completed && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </h3>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-widest border ${
                        c.completed
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : c.info[5]
                            ? "border-warm/40 bg-warm/10 text-warm"
                            : "border-border bg-background/60 text-muted-foreground"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="rounded-lg border border-border/40 bg-background/30 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Round</p>
                      <p className="font-display tabular-nums mt-0.5">
                        {round} / {total}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/30 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Members</p>
                      <p className="font-display tabular-nums mt-0.5">
                        {memberCount} / {maxMembers}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedCircleId(c.id)}
                      disabled={isSelected}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium border border-border/60 hover:border-primary/40 disabled:opacity-50 disabled:cursor-default transition"
                    >
                      {isSelected ? "✓ Selected" : "Select"}
                    </button>
                    <Link
                      to="/app"
                      onClick={() => setSelectedCircleId(c.id)}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-primary/10 hover:bg-primary/15 text-primary border border-primary/30 transition flex items-center justify-center gap-1"
                    >
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Join by ID */}
      <section className="rounded-2xl border border-border/60 bg-card/60 p-6">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-1">
          <UserPlus className="h-4 w-4 text-primary" /> Join an Existing Circle
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Paste a circle ID to join it. Anyone can join an open circle until it reaches max members.
        </p>
        <JoinCircleForm
          joinId={joinId}
          setJoinId={setJoinId}
          joining={joining}
          setJoining={setJoining}
          setJoinMsg={setJoinMsg}
          setJoinErr={setJoinErr}
          refetchMyCircles={refetchMyCircles}
        />
        {joinMsg && <p className="mt-3 text-xs text-primary">{joinMsg}</p>}
        {joinErr && <p className="mt-3 text-xs text-destructive">{joinErr}</p>}
      </section>

      {/* Create Circle */}
      <section className="rounded-2xl border border-border/60 bg-card/60 p-6">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-1">
          <Plus className="h-4 w-4 text-primary" /> Create a New Circle
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          You'll become the admin. The minimum contribution is encrypted — only members can verify they meet it.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Max Members" value={maxMem} onChange={setMaxMem} type="number" hint="Total participants (e.g. 5)" />
          <Field label="Total Rounds" value={rounds} onChange={setRounds} type="number" hint="Usually = max members" />
          <Field
            label="Round Duration (seconds)"
            value={roundDur}
            onChange={setRoundDur}
            type="number"
            hint="604800 = 1 week, 86400 = 1 day, 3600 = 1 hour"
          />
          <Field
            label="Min Contribution (USDC)"
            value={minContrib}
            onChange={setMinContrib}
            type="text"
            hint="Encrypted on-chain"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="mt-4 w-full md:w-auto px-5 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 disabled:opacity-50 text-primary border border-primary/30 transition inline-flex items-center gap-2 text-sm font-medium"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create Circle
        </button>
        {step && loading && <p className="mt-2 text-xs text-muted-foreground font-mono">{step}</p>}
        {createMsg && <p className="mt-3 text-xs text-primary">{createMsg}</p>}
        {createErr && <p className="mt-3 text-xs text-destructive">{createErr}</p>}
        <div className="mt-4 rounded-lg border border-border/40 bg-background/30 p-3 flex gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
          <p>
            After creating, you (the admin) will see "Manage Circle" in the sidebar. From there you can start rounds
            and click <strong>Advance Round</strong> to settle each round in one click.
          </p>
        </div>
      </section>

      {/* Stats footer */}
      <section className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-xl border border-border/40 bg-card/40 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Hash className="h-3 w-3" /> Total Protocol Circles
          </div>
          <p className="mt-1 font-display text-lg tabular-nums">{circleCount.toString()}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/40 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3 w-3" /> Your Memberships
          </div>
          <p className="mt-1 font-display text-lg tabular-nums">{myCircles.length}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/40 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Crown className="h-3 w-3" /> Circles You Admin
          </div>
          <p className="mt-1 font-display text-lg tabular-nums">{myCircles.filter((c) => c.isAdmin).length}</p>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-border/60 bg-background/40 text-sm font-mono focus:border-primary/50 focus:outline-none transition"
      />
      {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
    </label>
  );
}

function JoinCircleForm({
  joinId,
  setJoinId,
  joining,
  setJoining,
  setJoinMsg,
  setJoinErr,
  refetchMyCircles,
}: {
  joinId: string;
  setJoinId: (s: string) => void;
  joining: boolean;
  setJoining: (b: boolean) => void;
  setJoinMsg: (s: string | null) => void;
  setJoinErr: (s: string | null) => void;
  refetchMyCircles: () => void;
}) {
  // Use a hook instance keyed to the entered ID so joinCircle targets it
  const idBig = (() => {
    try {
      return BigInt(joinId || "0");
    } catch {
      return 0n;
    }
  })();
  const { joinCircle, step, loading } = useKuraCircle(idBig);

  async function handleJoin() {
    setJoinMsg(null);
    setJoinErr(null);
    if (!joinId.trim()) {
      setJoinErr("Enter a circle ID");
      return;
    }
    setJoining(true);
    try {
      await joinCircle();
      setJoinMsg(`Joined circle #${joinId}! Refreshing…`);
      setJoinId("");
      setTimeout(() => refetchMyCircles(), 2000);
    } catch (e: any) {
      setJoinErr(e?.shortMessage ?? e?.message ?? "Failed to join");
    } finally {
      setJoining(false);
    }
  }

  const busy = joining || loading;
  return (
    <div className="flex flex-col md:flex-row gap-2">
      <input
        type="number"
        placeholder="Circle ID (e.g. 0)"
        value={joinId}
        onChange={(e) => setJoinId(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg border border-border/60 bg-background/40 text-sm font-mono focus:border-primary/50 focus:outline-none transition"
      />
      <button
        onClick={handleJoin}
        disabled={busy}
        className="px-5 py-2 rounded-lg bg-primary/15 hover:bg-primary/25 disabled:opacity-50 text-primary border border-primary/30 transition inline-flex items-center gap-2 text-sm font-medium"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Join
      </button>
      {busy && step && <p className="md:ml-2 text-xs text-muted-foreground font-mono self-center">{step}</p>}
    </div>
  );
}
