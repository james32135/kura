import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { Globe, Users, ArrowRight, Search, Crown, CheckCircle2, Plus, Loader2, RefreshCw } from "lucide-react";
import { KURA_CIRCLE_ADDRESS, KURA_CIRCLE_ABI } from "@/config/contracts";
import { AppHeader } from "@/components/app/AppPrimitives";
import type { CircleInfoTuple } from "@/hooks/useMyCircles";
import { useCircle } from "@/context/CircleContext";

export const Route = createFileRoute("/app/browse")({
  head: () => ({
    meta: [
      { title: "Browse Circles — KURA" },
      { name: "description", content: "Discover and join open savings circles." },
    ],
  }),
  component: BrowseCircles,
});

const TIER_LABELS = ["🌐 Open", "🥉 Bronze+", "🥈 Silver+", "🥇 Gold+", "💎 Diamond+"];
const STATUS_FILTERS = ["All", "Open", "Active", "Completed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type CircleCardData = {
  id: bigint;
  info: CircleInfoTuple;
  minTier: number;
  memberCount: number;
  maxMembers: number;
  round: number;
  total: number;
  active: boolean;
  completed: boolean;
  isFull: boolean;
  status: string;
};

function BrowseCircles() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const { setSelectedCircleId } = useCircle();

  const { data: circleCountRaw, isLoading: countLoading, refetch: refetchCount } = useReadContract({
    address: KURA_CIRCLE_ADDRESS,
    abi: KURA_CIRCLE_ABI,
    functionName: "circleCount",
    query: { refetchInterval: 20_000 },
  });

  const circleCount = (circleCountRaw as bigint | undefined) ?? 0n;
  const ids = useMemo(() => {
    const arr: bigint[] = [];
    for (let i = 0n; i < circleCount; i++) arr.push(i);
    return arr;
  }, [circleCount]);

  const infoContracts = useMemo(
    () =>
      ids.map((id) => ({
        address: KURA_CIRCLE_ADDRESS,
        abi: KURA_CIRCLE_ABI,
        functionName: "getCircleInfo" as const,
        args: [id] as const,
      })),
    [ids]
  );

  const minTierContracts = useMemo(
    () =>
      ids.map((id) => ({
        address: KURA_CIRCLE_ADDRESS,
        abi: KURA_CIRCLE_ABI,
        functionName: "getMinCreditTier" as const,
        args: [id] as const,
      })),
    [ids]
  );

  const { data: infoData, isLoading: infoLoading, refetch: refetchInfo } = useReadContracts({
    contracts: infoContracts,
    allowFailure: true,
    query: { enabled: ids.length > 0, refetchInterval: 20_000 },
  });

  const { data: tierData, isLoading: tierLoading, refetch: refetchTier } = useReadContracts({
    contracts: minTierContracts,
    allowFailure: true,
    query: { enabled: ids.length > 0, refetchInterval: 30_000 },
  });

  const circles = useMemo((): CircleCardData[] => {
    if (!infoData) return [];
    const result: CircleCardData[] = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const info = infoData[i]?.result as CircleInfoTuple | undefined;
      const minTier = (tierData?.[i]?.result as number | undefined) ?? 0;
      if (!info || info[0] === "0x0000000000000000000000000000000000000000") continue;
      const memberCount = Number(info[1]);
      const maxMembers = Number(info[2]);
      const round = Number(info[3]);
      const total = Number(info[6]);
      const active = info[5] === true;
      const completed = info[7] === true;
      const isFull = memberCount >= maxMembers;
      const status = completed ? "Completed" : active ? "Active" : "Open";
      result.push({ id, info, minTier, memberCount, maxMembers, round, total, active, completed, isFull, status });
    }
    return result;
  }, [ids, infoData, tierData]);

  const filtered = useMemo(() => {
    return circles.filter((c) => {
      if (statusFilter !== "All" && c.status !== statusFilter) return false;
      if (search.trim()) {
        const id = c.id.toString();
        if (!id.includes(search.trim())) return false;
      }
      return true;
    });
  }, [circles, statusFilter, search]);

  const loading = countLoading || infoLoading || tierLoading;

  function refetch() {
    refetchCount();
    refetchInfo();
    refetchTier();
  }

  return (
    <div className="space-y-8">
      <AppHeader
        eyebrow="Discover"
        title="Browse Circles"
        sub="Find open savings circles to join across the protocol"
      />

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-xl border border-border/40 bg-card/40 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="h-3 w-3" /> Total Circles
          </div>
          <p className="mt-1 font-display text-xl tabular-nums">{circleCount.toString()}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/40 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3 w-3" /> Open to Join
          </div>
          <p className="mt-1 font-display text-xl tabular-nums text-primary">
            {circles.filter((c) => c.status === "Open" && !c.isFull).length}
          </p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/40 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </div>
          <p className="mt-1 font-display text-xl tabular-nums">
            {circles.filter((c) => c.completed).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by circle ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border/60 bg-background/40 text-sm focus:border-primary/50 focus:outline-none transition"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${
                statusFilter === f
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/60 bg-background/30 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={refetch}
            disabled={loading}
            className="px-3 py-2 rounded-xl text-xs border border-border/60 bg-background/30 text-muted-foreground hover:text-foreground hover:border-border transition"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Circle grid */}
      {loading && circles.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-16 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-3" /> Loading circles from the chain…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-16 text-center">
          <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          {circles.length === 0 ? (
            <>
              <p className="text-sm text-muted-foreground">No circles exist on-chain yet.</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Be the first — create one from{" "}
                <Link to="/app/circles" className="text-primary hover:underline">
                  My Circles
                </Link>
                .
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">No circles match your filter.</p>
              <button
                onClick={() => { setSearch(""); setStatusFilter("All"); }}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <CircleCard
              key={c.id.toString()}
              circle={c}
              onSelect={() => setSelectedCircleId(c.id)}
            />
          ))}
        </div>
      )}

      {/* Create CTA */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent p-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-semibold">Start your own circle</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Become an admin. Set reputation gates. Encrypted from day one.
          </p>
        </div>
        <Link
          to="/app/circles"
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Create
        </Link>
      </div>
    </div>
  );
}

function CircleCard({ circle: c, onSelect }: { circle: CircleCardData; onSelect: () => void }) {
  const canJoin = c.status === "Open" && !c.isFull;
  const fillPct = c.maxMembers > 0 ? Math.round((c.memberCount / c.maxMembers) * 100) : 0;

  return (
    <div className="group relative rounded-2xl border border-border/60 bg-card/60 p-5 transition hover:border-primary/40 overflow-hidden">
      {/* Top glow on hover */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Circle</p>
          <h3 className="font-display text-3xl tabular-nums flex items-center gap-2 mt-0.5">
            #{c.id.toString()}
            {c.completed && <CheckCircle2 className="h-4 w-4 text-primary" />}
            {c.info[0] !== "0x0000000000000000000000000000000000000000" && (
              <span title="Has admin">
                <Crown className="h-4 w-4 text-muted-foreground/40" />
              </span>
            )}
          </h3>
        </div>
        <StatusBadge status={c.status} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="rounded-lg border border-border/40 bg-background/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Members</p>
          <p className="font-display tabular-nums mt-0.5">{c.memberCount} / {c.maxMembers}</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Round</p>
          <p className="font-display tabular-nums mt-0.5">{c.round} / {c.total}</p>
        </div>
      </div>

      {/* Member fill bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5 text-[10px] text-muted-foreground font-mono">
          <span>Capacity</span>
          <span>{fillPct}% full</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${fillPct >= 100 ? "bg-muted-foreground" : "bg-primary/70"}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* Reputation gate */}
      {c.minTier > 0 && (
        <div className="mb-4 flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/40 bg-background/20 text-[10px] text-muted-foreground">
          <span>Min tier:</span>
          <span className="text-foreground font-medium">{TIER_LABELS[c.minTier] ?? `Tier ${c.minTier}`}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {canJoin ? (
          <Link
            to="/app/circles"
            onClick={onSelect}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 transition text-xs font-medium"
          >
            Join Circle <ArrowRight className="h-3 w-3" />
          </Link>
        ) : (
          <Link
            to="/app"
            onClick={onSelect}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-border/60 hover:border-border text-muted-foreground hover:text-foreground transition text-xs font-medium"
          >
            View <ArrowRight className="h-3 w-3" />
          </Link>
        )}
        <button
          onClick={onSelect}
          className="px-3 py-2.5 rounded-xl border border-border/60 hover:border-primary/40 hover:text-foreground text-muted-foreground transition text-xs"
          title="Select as active circle"
        >
          Select
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Open: "border-primary/40 bg-primary/10 text-primary",
    Active: "border-warm/40 bg-warm/10 text-warm",
    Completed: "border-border bg-background/60 text-muted-foreground",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-widest border ${map[status] ?? map.Completed}`}>
      {status}
    </span>
  );
}
