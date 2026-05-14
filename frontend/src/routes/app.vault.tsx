import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Database, Loader2, CheckCircle2, XCircle, Users } from "lucide-react";
import { AppHeader, StatCard } from "@/components/app/AppPrimitives";
import { useAccount } from "wagmi";
import { useKuraMemberRegistry } from "@/hooks/useKuraMemberRegistry";
import { useCircle } from "@/context/CircleContext";

export const Route = createFileRoute("/app/vault")({
  component: VaultPage,
});

function VaultPage() {
  const { isConnected } = useAccount();
  const { selectedCircleId } = useCircle();
  const cId = selectedCircleId;
  const { loading, step, memberCount, allowSelf, getEncMemberSlot } =
    useKuraMemberRegistry(cId);

  const [slotInput, setSlotInput] = useState("0");
  const [slotHandle, setSlotHandle] = useState<string>("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleAllowSelf = useCallback(async () => {
    setError("");
    try {
      const hash = await allowSelf(BigInt(slotInput));
      setTxHash(hash as string);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [slotInput, allowSelf]);

  const handleGetSlot = useCallback(async () => {
    setError("");
    try {
      const handle = await getEncMemberSlot(BigInt(slotInput));
      setSlotHandle(handle.toString());
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [slotInput, getEncMemberSlot]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Database className="w-12 h-12 text-sky-400 opacity-60" />
        <p className="text-zinc-400">Connect your wallet to inspect the member registry.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <AppHeader
        icon={<Database className="w-7 h-7 text-sky-400" />}
        title="Member Registry"
        subtitle="Encrypted membership slots — member addresses are stored as FHE-encrypted eaddress values. No public enumeration."
      />

      <StatCard
        label="Members in Circle"
        value={memberCount?.toString() ?? "—"}
      />

      {/* Slot inspector */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Slot Access</h2>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Slot index</label>
          <input
            type="number"
            value={slotInput}
            onChange={e => setSlotInput(e.target.value)}
            className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white"
            min="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleAllowSelf}
            disabled={loading || !cId}
            className="py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            {loading ? step : "Allow Self Read"}
          </button>
          <button
            onClick={handleGetSlot}
            disabled={loading || !cId}
            className="py-2.5 rounded-lg border border-sky-500/40 text-sky-300 text-sm hover:bg-sky-500/10 transition disabled:opacity-40"
          >
            Get Slot Handle
          </button>
        </div>

        {slotHandle && (
          <div className="rounded-lg bg-zinc-900/60 border border-white/5 p-3">
            <p className="text-xs text-zinc-500 mb-1">Encrypted slot handle</p>
            <p className="font-mono text-xs text-sky-300 break-all">{slotHandle}</p>
            <p className="text-xs text-zinc-600 mt-1">This is the FHE ciphertext handle for the member at slot {slotInput}. Use your FHE client to decrypt.</p>
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
