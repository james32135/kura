import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Clock,
  Hash,
  Lock,
  Eye,
  ArrowRight,
  CircleDollarSign,
  Gavel,
  Shield,
  Loader2,
  UserPlus,
  CheckCircle2,
  Info,
} from "lucide-react";
import { AppHeader, StatCard, MemberRow, EncryptedValue, ProgressStepper } from "@/components/app/AppPrimitives";
import { useAccount } from "wagmi";
import { useKuraCircle } from "@/hooks/useKuraCircle";
import { useCircle } from "@/context/CircleContext";
import { formatUnits } from "viem";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function HowItWorksDiagram() {
  return (
    <svg viewBox="0 0 600 100" className="w-full max-w-2xl mx-auto" aria-label="How KURA works: Join, Contribute, Bid, Winner">
      {[
        { x: 30, label: "Join", sub: "Connect wallet", icon: "M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" },
        { x: 180, label: "Contribute", sub: "Add to pool", icon: "M12 2v20m10-10H2" },
        { x: 330, label: "Bid", sub: "Sealed bid", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" },
        { x: 480, label: "Winner", sub: "Lowest wins", icon: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
      ].map((item, i, arr) => (
        <g key={item.label}>
          <circle cx={item.x + 40} cy={30} r="20" fill="none" stroke="oklch(0.78 0.13 200)" strokeWidth="1.5" opacity={0.6} />
          <path d={item.icon} transform={`translate(${item.x + 28}, 18) scale(1)`} fill="none" stroke="oklch(0.78 0.13 200)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x={item.x + 40} y={68} textAnchor="middle" className="fill-foreground text-[11px] font-medium">{item.label}</text>
          <text x={item.x + 40} y={82} textAnchor="middle" className="fill-muted-foreground text-[9px]">{item.sub}</text>
          {i < arr.length - 1 && (
            <line x1={item.x + 65} y1={30} x2={arr[i + 1].x + 15} y2={30} stroke="oklch(0.78 0.13 200)" strokeWidth="1" opacity={0.3} strokeDasharray="4 3" />
          )}
        </g>
      ))}
    </svg>
  );
}

function DashboardPage() {
  const { address } = useAccount();
  const { selectedCircleId } = useCircle();
  const {
    circleInfo,
    members,
    userIsMember,
    hasContributed,
    contributionCount,
    joinCircle,
    getPoolBalance,
    getMyContribution,
    loading,
    step,
  } = useKuraCircle(selectedCircleId);

  const info = circleInfo as readonly [string, bigint, bigint, bigint, bigint, boolean, bigint, boolean] | undefined;
  const adminAddr = info?.[0] ?? "0x0000000000000000000000000000000000000000";
  const maxMembers = info ? Number(info[2]) : 0;
  const totalRounds = info ? Number(info[6]) : 0;
  const currentRound = info ? Number(info[3]) : 0;
  const circleActive = info?.[5] ?? false;
  const circleCompleted = info?.[7] === true;
  const noCircle = adminAddr === "0x0000000000000000000000000000000000000000";
  const isAdmin = address?.toLowerCase() === adminAddr?.toLowerCase();

  const statusLabel = circleCompleted ? "Completed" : circleActive ? "Active" : "Waiting";

  const memberList = (members as string[]) ?? [];
  const isMember = userIsMember === true;
  const contribCount = contributionCount ? Number(contributionCount) : 0;

  const [poolVal, setPoolVal] = useState<string | null>(null);
  const [myContrib, setMyContrib] = useState<string | null>(null);
  const [decryptStage, setDecryptStage] = useState(-1);

  const DECRYPT_STEPS = ["Requesting permission", "Reading encrypted data", "Decrypting privately", "Done"];

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleDecryptPool = useCallback(async () => {
    try {
      setDecryptStage(0);
      const val = await getPoolBalance();
      setDecryptStage(3);
      if (val !== undefined) setPoolVal(formatUnits(val, 6));
    } catch (e) {
      console.error(e);
      setDecryptStage(-1);
    }
  }, [getPoolBalance]);

  const handleDecryptContrib = useCallback(async () => {
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

  if (noCircle) {
    return (
      <div className="space-y-8">
        <AppHeader eyebrow="Dashboard" title="Welcome to KURA" sub="No circle has been created yet." />
        <HowItWorksDiagram />
        <div className="rounded-2xl border border-border/60 bg-card/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">An admin needs to create a circle before you can participate.</p>
          <p className="mt-2 text-xs text-muted-foreground/60">If you are the admin, go to Manage Circle to set one up.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppHeader
        eyebrow="Dashboard"
        title="Circle Overview"
        sub={circleCompleted ? `All ${totalRounds} rounds completed` : circleActive ? `Round ${currentRound} of ${totalRounds} is active` : "Circle is not active yet"}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Members" value={`${memberList.length} / ${maxMembers}`} icon={Users} />
        <StatCard label="Round" value={`${currentRound} / ${totalRounds}`} icon={Hash} />
        <StatCard label="Contributions" value={`${contribCount} / ${memberList.length}`} icon={CircleDollarSign} />
        <StatCard label="Status" value={statusLabel} icon={circleCompleted ? CheckCircle2 : circleActive ? CheckCircle2 : Clock} accent={circleActive || circleCompleted} />
      </div>

      {/* Join section */}
      {!isMember && (
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-6 text-center space-y-4">
          <UserPlus className="h-8 w-8 text-primary mx-auto" />
          <h3 className="font-display text-lg font-semibold">Join this circle</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Connect your wallet and join to start contributing and bidding for the pool.
          </p>
          <button
            onClick={() => joinCircle()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {loading ? step || "Joining..." : "Join Circle"}
          </button>
        </div>
      )}

      {/* Pool hero — admin only (contract restricts getPoolBalance to admin) */}
      {isMember && isAdmin && (
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Pool Balance
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Only you can see your amount</p>
            </div>
            {poolVal === null ? (
              <button onClick={handleDecryptPool} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 text-sm text-primary hover:bg-primary/10 transition disabled:opacity-50">
                <Eye className="h-4 w-4" />
                Reveal Pool
              </button>
            ) : (
              <span className="font-display text-2xl tabular-nums">${poolVal}</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/50">Hidden from everyone. Only revealed to you with your wallet signature.</p>

          {decryptStage >= 0 && decryptStage < 3 && <ProgressStepper stage={decryptStage} steps={DECRYPT_STEPS} />}
        </div>
      )}

      {/* My contribution */}
      {isMember && hasContributed && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Your Contribution</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Encrypted on-chain — only you can decrypt</p>
            </div>
            {myContrib === null ? (
              <button onClick={handleDecryptContrib} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 text-sm text-primary hover:bg-primary/10 transition disabled:opacity-50">
                <Eye className="h-4 w-4" />
                Reveal
              </button>
            ) : (
              <EncryptedValue label="Your contribution" value={`$${myContrib}`} />
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      {isMember && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction to="/app/contribute" icon={CircleDollarSign} label="Contribute" desc="Add funds to the pool" done={hasContributed === true} />
          <QuickAction to="/app/bid" icon={Gavel} label="Bid for Pool" desc="Place your sealed bid" />
          <QuickAction to="/app/credit" icon={Shield} label="Reputation" desc="View your trust score" />
        </div>
      )}

      {/* How it works diagram */}
      <div className="space-y-3">
        <h3 className="font-display text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4" /> How it works
        </h3>
        <HowItWorksDiagram />
      </div>

      {/* Members */}
      <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">Members</h3>
            <p className="text-xs text-muted-foreground mt-1">You can see who participated, but all amounts stay private</p>
          </div>
        </div>
        {memberList.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <ul>
            {memberList.map((m) => (
              <MemberRow key={m} addr={`${m.slice(0, 6)}...${m.slice(-4)}`} status={hasContributed ? "contributed" : "pending"} you={m.toLowerCase() === address?.toLowerCase()} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, desc, done }: { to: string; icon: typeof CircleDollarSign; label: string; desc: string; done?: boolean }) {
  return (
    <Link to={to} className="group rounded-2xl border border-border/60 bg-card/60 p-5 hover:border-primary/30 hover:bg-primary/[0.03] transition">
      <div className="flex items-center justify-between mb-3">
        <Icon className="h-5 w-5 text-primary" />
        {done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />}
      </div>
      <h4 className="font-display text-sm font-semibold">{label}</h4>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </Link>
  );
}
