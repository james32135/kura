import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { ShieldCheck, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { AppHeader, StatCard } from "@/components/app/AppPrimitives";
import { useAccount } from "wagmi";
import { useKuraPrivacyVault } from "@/hooks/useKuraPrivacyVault";
import { useCircle } from "@/context/CircleContext";

export const Route = createFileRoute("/app/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  const { isConnected } = useAccount();
  const { selectedCircleId } = useCircle();
  const cId = selectedCircleId;
  const { loading, step, isPrivate, hasAccess, metadataCounts, initVault, grantAccess } =
    useKuraPrivacyVault(cId);

  const [memberInput, setMemberInput] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [initPrivate, setInitPrivate] = useState(true);

  const handleInit = useCallback(async () => {
    setError("");
    try {
      const hash = await initVault(initPrivate);
      setTxHash(hash as string);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [initVault, initPrivate]);

  const handleGrant = useCallback(async () => {
    setError("");
    if (!memberInput.startsWith("0x")) {
      setError("Enter a valid 0x address");
      return;
    }
    try {
      const hash = await grantAccess(memberInput as `0x${string}`);
      setTxHash(hash as string);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [memberInput, grantAccess]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldCheck className="w-12 h-12 text-violet-400 opacity-60" />
        <p className="text-zinc-400">Connect your wallet to manage circle privacy settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <AppHeader
        icon={<ShieldCheck className="w-7 h-7 text-violet-400" />}
        title="Privacy Vault"
        subtitle="Store and control access to encrypted circle metadata. Only members you authorize can read circle names and descriptions."
      />

      {/* Status */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Privacy Mode"
          value={isPrivate === undefined ? "—" : isPrivate ? "Private" : "Public"}
        />
        <StatCard
          label="Your Access"
          value={hasAccess === undefined ? "—" : hasAccess ? "Granted" : "None"}
        />
        <StatCard
          label="Metadata Chunks"
          value={metadataCounts ? `${metadataCounts[0]}n / ${metadataCounts[1]}d` : "—"}
          encrypted
        />
      </div>

      {/* Init vault */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Initialize Vault</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setInitPrivate(v => !v)}
            className={`w-11 h-6 rounded-full transition-colors ${initPrivate ? "bg-violet-500" : "bg-zinc-700"} relative`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${initPrivate ? "left-5" : "left-0.5"}`} />
          </div>
          <span className="text-sm text-zinc-300">Private circle metadata</span>
          {initPrivate ? <EyeOff className="w-4 h-4 text-violet-400" /> : <Eye className="w-4 h-4 text-zinc-400" />}
        </label>
        <button
          onClick={handleInit}
          disabled={loading || !cId}
          className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {loading ? step : "Initialize Vault"}
        </button>
      </section>

      {/* Grant access */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Grant Read Access</h2>
        <input
          type="text"
          placeholder="0xMember address..."
          value={memberInput}
          onChange={e => setMemberInput(e.target.value)}
          className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
        />
        <button
          onClick={handleGrant}
          disabled={loading || !cId || !memberInput}
          className="w-full py-2.5 rounded-lg border border-violet-500/40 text-violet-300 text-sm hover:bg-violet-500/10 transition disabled:opacity-40"
        >
          {loading ? step : "Grant Access"}
        </button>
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
