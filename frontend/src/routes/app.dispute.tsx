import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { AlertTriangle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { AppHeader, StatCard } from "@/components/app/AppPrimitives";
import { useAccount } from "wagmi";
import { useKuraDispute } from "@/hooks/useKuraDispute";
import { useCircle } from "@/context/CircleContext";

export const Route = createFileRoute("/app/dispute")({
  component: DisputePage,
});

function DisputePage() {
  const { isConnected } = useAccount();
  const { selectedCircleId } = useCircle();
  const cId = selectedCircleId;
  const { loading, step, disputeCount, raiseDispute, resolveDispute, getDisputeStatus } =
    useKuraDispute();

  const [round, setRound] = useState("0");
  const [amount, setAmount] = useState("0");
  const [lookupId, setLookupId] = useState("");
  const [disputeInfo, setDisputeInfo] = useState<any>(null);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleRaise = useCallback(async () => {
    setError("");
    if (!cId) { setError("Select a circle first"); return; }
    try {
      const hash = await raiseDispute(cId, BigInt(round), BigInt(Math.round(Number(amount) * 1e6)));
      setTxHash(hash as string);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [cId, round, amount, raiseDispute]);

  const handleLookup = useCallback(async () => {
    setError("");
    try {
      const info = await getDisputeStatus(BigInt(lookupId));
      setDisputeInfo(info);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [lookupId, getDisputeStatus]);

  const handleResolve = useCallback(async (approve: boolean) => {
    setError("");
    if (!lookupId) return;
    try {
      const hash = await resolveDispute(BigInt(lookupId), approve);
      setTxHash(hash as string);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [lookupId, resolveDispute]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 opacity-60" />
        <p className="text-zinc-400">Connect your wallet to manage disputes.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <AppHeader
        icon={<AlertTriangle className="w-7 h-7 text-amber-400" />}
        title="Dispute Resolution"
        subtitle="Raise disputes with encrypted claimed amounts. Admins resolve blind — they never see the amount you claimed."
      />

      <StatCard label="Total Disputes" value={disputeCount?.toString() ?? "—"} />

      {/* Raise dispute */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Raise Dispute</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Round</label>
            <input type="number" value={round} onChange={e => setRound(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white" min="0" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Claimed amount (USDC)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white" min="0" step="0.01" />
          </div>
        </div>
        <p className="text-xs text-zinc-500">Your claimed amount is encrypted on-chain. The admin resolves without seeing the value.</p>
        <button onClick={handleRaise} disabled={loading || !cId}
          className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition disabled:opacity-40 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          {loading ? step : "Raise Dispute (Encrypted)"}
        </button>
      </section>

      {/* Lookup dispute */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Lookup / Resolve</h2>
        <div className="flex gap-2">
          <input type="number" placeholder="Dispute ID" value={lookupId} onChange={e => setLookupId(e.target.value)}
            className="flex-1 rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white" />
          <button onClick={handleLookup} disabled={loading || !lookupId}
            className="px-4 py-2 rounded-lg border border-white/10 text-zinc-300 text-sm hover:bg-white/5 transition">
            Lookup
          </button>
        </div>
        {disputeInfo && (
          <div className="space-y-2 text-sm text-zinc-300">
            <p><span className="text-zinc-500">Status:</span> {disputeInfo.status}</p>
            <p><span className="text-zinc-500">Circle:</span> {disputeInfo.circleId.toString()}</p>
            <p><span className="text-zinc-500">Round:</span> {disputeInfo.round.toString()}</p>
            <p><span className="text-zinc-500">Claimant:</span> {disputeInfo.claimant}</p>
            {disputeInfo.status === "Open" && (
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleResolve(true)} disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-40">
                  Approve
                </button>
                <button onClick={() => handleResolve(false)} disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm disabled:opacity-40">
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </section>

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
