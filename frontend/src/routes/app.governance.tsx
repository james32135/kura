import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { Vote, Loader2, CheckCircle2, XCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { AppHeader, StatCard } from "@/components/app/AppPrimitives";
import { useAccount } from "wagmi";
import { useKuraGovernance, type Proposal } from "@/hooks/useKuraGovernance";
import { useCircle } from "@/context/CircleContext";

export const Route = createFileRoute("/app/governance")({
  component: GovernancePage,
});

function GovernancePage() {
  const { isConnected } = useAccount();
  const { selectedCircleId } = useCircle();
  const cId = selectedCircleId;
  const { loading, step, proposalCount, createProposal, submitVote, getProposal, hasVoted, cancelProposal } =
    useKuraGovernance();

  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("86400");
  const [quorum, setQuorum] = useState("3");
  const [proposals, setProposals] = useState<Array<{ id: bigint; data: Proposal; voted: boolean }>>([]);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  // Load proposals
  useEffect(() => {
    if (!proposalCount) return;
    const loadProposals = async () => {
      const list = [];
      for (let i = 0n; i < proposalCount; i++) {
        try {
          const data = await getProposal(i);
          const voted = await hasVoted(i);
          list.push({ id: i, data, voted });
        } catch {}
      }
      setProposals(list.reverse());
    };
    loadProposals();
  }, [proposalCount, getProposal, hasVoted]);

  const handleCreate = useCallback(async () => {
    setError("");
    if (!cId) { setError("Select a circle first"); return; }
    if (!description) { setError("Enter a proposal description"); return; }
    try {
      const hash = await createProposal(cId, description, BigInt(duration), BigInt(quorum));
      setTxHash(hash as string);
      setDescription("");
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [cId, description, duration, quorum, createProposal]);

  const handleVote = useCallback(async (proposalId: bigint, vote: boolean) => {
    setError("");
    try {
      const hash = await submitVote(proposalId, vote);
      setTxHash(hash as string);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [submitVote]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Vote className="w-12 h-12 text-emerald-400 opacity-60" />
        <p className="text-zinc-400">Connect your wallet to participate in governance.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <AppHeader
        icon={<Vote className="w-7 h-7 text-emerald-400" />}
        title="Governance"
        subtitle="Vote privately with encrypted ballots. Individual votes stay hidden — only the final tally is revealed."
      />

      <StatCard label="Total Proposals" value={proposalCount?.toString() ?? "—"} />

      {/* Create proposal */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">New Proposal</h2>
        <textarea
          rows={3}
          placeholder="Proposal description..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-600 resize-none"
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Duration (seconds)</label>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Quorum (min voters)</label>
            <input type="number" value={quorum} onChange={e => setQuorum(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white" min="1" />
          </div>
        </div>
        <button onClick={handleCreate} disabled={loading || !cId || !description}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-40 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Vote className="w-4 h-4" />}
          {loading ? step : "Create Proposal"}
        </button>
      </section>

      {/* Active proposals */}
      {proposals.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Proposals</h2>
          {proposals.map(({ id, data, voted }) => (
            <div key={id.toString()} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-zinc-200">{data.description}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  data.status === "Active" ? "bg-emerald-500/20 text-emerald-400" :
                  data.status === "Passed" ? "bg-sky-500/20 text-sky-400" :
                  "bg-zinc-700 text-zinc-400"
                }`}>{data.status}</span>
              </div>
              <p className="text-xs text-zinc-500">
                Circle {data.circleId.toString()} · Quorum {data.quorum.toString()} ·{" "}
                {data.plainTotalVotes > 0n ? `${data.plainYesCount}/${data.plainTotalVotes} yes` : "Votes encrypted"}
              </p>
              {data.status === "Active" && !voted && (
                <div className="flex gap-2">
                  <button onClick={() => handleVote(id, true)} disabled={loading}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-600/30 transition flex items-center justify-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5" /> Yes
                  </button>
                  <button onClick={() => handleVote(id, false)} disabled={loading}
                    className="flex-1 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-600/30 transition flex items-center justify-center gap-1.5">
                    <ThumbsDown className="w-3.5 h-3.5" /> No
                  </button>
                </div>
              )}
              {voted && (
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Vote submitted (encrypted)
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {txHash && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">{txHash.slice(0, 18)}…</a>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
