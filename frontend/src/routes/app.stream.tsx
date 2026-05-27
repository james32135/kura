import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Zap, Loader2, CheckCircle2, ShieldCheck, XCircle, Wallet } from "lucide-react";
import { AppHeader, StatCard } from "@/components/app/AppPrimitives";
import { useAccount } from "wagmi";
import { useKuraStreamPay } from "@/hooks/useKuraStreamPay";
import { useConfidentialUSDC } from "@/hooks/useConfidentialUSDC";
import { useCircle } from "@/context/CircleContext";
import { formatUnits } from "viem";

export const Route = createFileRoute("/app/stream")({
  component: StreamPage,
});

function StreamPage() {
  const { address, isConnected } = useAccount();
  const { selectedCircleId, myCircles } = useCircle();
  const cId = selectedCircleId;
  const hasSelectedCircle = myCircles.some((circle) => circle.id === cId);
  const { loading: streamLoading, step: streamStep, streamPool, myPaid, createStream, collectStream, cancelStream } =
    useKuraStreamPay(cId);
  const {
    usdcBalance,
    isStreamPayOperator,
    wrapUsdc,
    setKuraStreamPayOperator,
    getEncryptedBalance,
    loading: usdcLoading,
    step: usdcStep,
  } = useConfidentialUSDC();

  const loading = streamLoading || usdcLoading;
  const step = streamStep || usdcStep;
  const streamOperatorSet = isStreamPayOperator === true;

  const [rateInput, setRateInput] = useState("0.001");
  const [blocksInput, setBlocksInput] = useState("10");
  const [wrapAmount, setWrapAmount] = useState("0.05");
  const [cusdcBalance, setCusdcBalance] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleWrap = useCallback(async () => {
    setError("");
    setTxHash("");
    try {
      const value = BigInt(Math.round(Number(wrapAmount) * 1e6));
      const hash = await wrapUsdc(value);
      setTxHash(hash as string);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [wrapAmount, wrapUsdc]);

  const handleAuthorize = useCallback(async () => {
    setError("");
    setTxHash("");
    try {
      const hash = await setKuraStreamPayOperator();
      setTxHash(hash as string);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [setKuraStreamPayOperator]);

  const handleRevealBalance = useCallback(async () => {
    setError("");
    try {
      const value = await getEncryptedBalance();
      setCusdcBalance(formatUnits(value, 6));
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [getEncryptedBalance]);

  const handleCreate = useCallback(async () => {
    setError("");
    setTxHash("");
    try {
      const rate = BigInt(Math.round(Number(rateInput) * 1e6));
      const blocks = BigInt(blocksInput);
      const hash = await createStream(rate, blocks);
      setTxHash(hash as string);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [rateInput, blocksInput, createStream]);

  const handleCollect = useCallback(async () => {
    if (!address) return;
    setError("");
    try {
      const hash = await collectStream(address as `0x${string}`);
      setTxHash(hash as string);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [address, collectStream]);

  const handleCancel = useCallback(async () => {
    setError("");
    try {
      const hash = await cancelStream();
      setTxHash(hash as string);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [cancelStream]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldCheck className="w-12 h-12 text-sky-400 opacity-60" />
        <p className="text-zinc-400">Connect your wallet to access streaming contributions.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <AppHeader
        eyebrow="Stream Pay"
        title="Per-Block Contributions"
        sub="Contribute per-block with encrypted rates — your payment cadence stays private."
      />

      {/* Pool stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Stream Pool (handle)"
          value={streamPool !== undefined ? `${streamPool.toString().slice(0, 10)}…` : "—"}
          icon={Zap}
        />
        <StatCard
          label="My Paid (handle)"
          value={myPaid !== undefined ? `${myPaid.toString().slice(0, 10)}…` : "—"}
          icon={ShieldCheck}
        />
        <StatCard
          label="Stream Authorized"
          value={streamOperatorSet ? "Yes" : "Not yet"}
          icon={ShieldCheck}
          accent={streamOperatorSet}
        />
        <StatCard
          label="Your USDC"
          value={`$${formatUnits(usdcBalance ?? 0n, 6)}`}
          icon={Wallet}
        />
      </div>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Prepare Stream Balance</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Wrap amount (USDC)</label>
            <input
              type="number"
              value={wrapAmount}
              onChange={e => setWrapAmount(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white"
              min="0.000001"
              step="0.01"
            />
          </div>
          <div className="rounded-lg bg-zinc-900/60 border border-white/5 px-3 py-2">
            <p className="text-xs text-zinc-500">cUSDC balance</p>
            <button
              onClick={handleRevealBalance}
              disabled={loading}
              className="mt-1 text-sm text-sky-300 hover:underline disabled:opacity-40"
            >
              {cusdcBalance === null ? "Reveal encrypted balance" : `$${cusdcBalance}`}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleWrap}
            disabled={loading || !wrapAmount}
            className="py-2.5 rounded-lg border border-sky-500/40 text-sky-300 text-sm hover:bg-sky-500/10 transition disabled:opacity-40"
          >
            {loading ? step : "Wrap USDC to cUSDC"}
          </button>
          <button
            onClick={handleAuthorize}
            disabled={loading || streamOperatorSet}
            className="py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {streamOperatorSet ? "Stream Pay Authorized" : loading ? step : "Authorize Stream Pay"}
          </button>
        </div>
      </section>

      {/* Create stream */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Create Stream</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Rate per block (USDC)</label>
            <input
              type="number"
              value={rateInput}
              onChange={e => setRateInput(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white"
              min="0.000001"
              step="0.01"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Max blocks</label>
            <input
              type="number"
              value={blocksInput}
              onChange={e => setBlocksInput(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white"
              min="1"
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={loading || !hasSelectedCircle || !streamOperatorSet || !rateInput || !blocksInput}
          className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? step : "Create Encrypted Stream"}
        </button>
      </section>

      {/* Collect / Cancel */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleCollect}
          disabled={loading || !hasSelectedCircle}
          className="py-2.5 rounded-lg border border-sky-500/40 text-sky-400 text-sm hover:bg-sky-500/10 transition disabled:opacity-40"
        >
          Collect Stream
        </button>
        <button
          onClick={handleCancel}
          disabled={loading || !hasSelectedCircle}
          className="py-2.5 rounded-lg border border-red-500/40 text-red-400 text-sm hover:bg-red-500/10 transition disabled:opacity-40"
        >
          Cancel &amp; Refund
        </button>
      </div>

      {/* Status */}
      {txHash && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Tx: <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">{txHash.slice(0, 18)}…</a></span>
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
