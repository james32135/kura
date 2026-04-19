import { useState, useCallback, useMemo } from "react";
import { usePublicClient, useWalletClient, useWriteContract, useReadContract } from "wagmi";
import { toast } from "sonner";
import {
  KURA_CIRCLE_ADDRESS,
  KURA_CIRCLE_ABI,
  KURA_BID_ADDRESS,
  KURA_BID_ABI,
} from "@/config/contracts";
import { decryptForTx } from "@/lib/fhe";
import { getGasFees } from "@/lib/utils";

export type AutoStep =
  | "idle"
  | "close-round"
  | "find-winner"
  | "settle-round"
  | "transfer-pool"
  | "start-next-round"
  | "complete";

export type StepLog = { step: AutoStep; status: "pending" | "running" | "done" | "skipped" | "error"; message?: string; txHash?: `0x${string}` };

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

/// One-click "Advance Round" orchestrator.
/// Detects current state and runs only the steps that haven't been done.
/// Steps require sequential admin wallet confirmations (no on-chain bundling
/// — contracts use msg.sender admin checks).
export function useAutoSettler(circleId: bigint) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<StepLog[]>([]);
  const [currentStep, setCurrentStep] = useState<AutoStep>("idle");

  // Read current circle state
  const { data: circleInfo, refetch: refetchCircle } = useReadContract({
    address: KURA_CIRCLE_ADDRESS,
    abi: KURA_CIRCLE_ABI,
    functionName: "getCircleInfo",
    args: [circleId],
    query: { refetchInterval: 5_000 },
  });

  const info = circleInfo as readonly [string, bigint, bigint, bigint, bigint, boolean, bigint, boolean] | undefined;
  const currentRound = info?.[3] ?? 0n;
  const totalRounds = info?.[6] ?? 0n;
  const completed = info?.[7] === true;

  // Round-specific state for currentRound
  const { data: roundClosed, refetch: refetchClosed } = useReadContract({
    address: KURA_BID_ADDRESS,
    abi: KURA_BID_ABI,
    functionName: "roundClosed",
    args: currentRound > 0n ? [circleId, currentRound] : undefined,
    query: { refetchInterval: 5_000, enabled: currentRound > 0n },
  });

  const { data: roundResult, refetch: refetchResult } = useReadContract({
    address: KURA_BID_ADDRESS,
    abi: KURA_BID_ABI,
    functionName: "getRoundResult",
    args: currentRound > 0n ? [circleId, currentRound] : undefined,
    query: { refetchInterval: 5_000, enabled: currentRound > 0n },
  });

  const result = roundResult as readonly [string, bigint, bigint, boolean] | undefined;
  const resolved = result?.[3] === true;
  const winnerOnChain = result?.[0] && result[0] !== ZERO_ADDR ? (result[0] as `0x${string}`) : null;

  // Compute next step based on chain state
  const nextStep = useMemo<AutoStep>(() => {
    if (completed) return "complete";
    if (currentRound === 0n) return "idle"; // need to start a round first
    if (!roundClosed) return "close-round";
    if (!resolved) return "find-winner";
    // resolved — check if pool transferred (we can't easily tell without checking event/receivedPool)
    // For idempotency, settleRound already happened. Next is transferPool.
    // After transferPool succeeds, the contract auto-completes if last round.
    // If not last round, admin needs to start next round.
    return "transfer-pool"; // user may also need start-next-round after this
  }, [completed, currentRound, roundClosed, resolved]);

  const log = useCallback((entry: StepLog) => {
    setLogs((l) => [...l, entry]);
  }, []);

  const updateLast = useCallback((patch: Partial<StepLog>) => {
    setLogs((l) => {
      if (l.length === 0) return l;
      const copy = l.slice();
      copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
      return copy;
    });
  }, []);

  /// Run the full advance flow with optional manual winner address.
  /// If winnerAddress is null, attempts to auto-detect via getLowestBidderEncHandle.
  /// Falls back to throwing if not provided and contract doesn't support handle.
  const advanceRound = useCallback(
    async (manualWinner?: `0x${string}`) => {
      if (!publicClient || !walletClient) throw new Error("Wallet not connected");
      if (!info) throw new Error("Circle info not loaded");
      if (completed) throw new Error("Circle already completed");
      if (currentRound === 0n) throw new Error("No round started — click Start Round first");

      setRunning(true);
      setLogs([]);
      const toastId = toast.loading("Advancing round…", { description: "Step 1 of up to 4" });
      try {
        // STEP 1 — Close round if needed
        if (!roundClosed) {
          setCurrentStep("close-round");
          log({ step: "close-round", status: "running", message: "Closing bidding for the round…" });
          const fees = await getGasFees(publicClient);
          const hash = await writeContractAsync({
            address: KURA_BID_ADDRESS,
            abi: KURA_BID_ABI,
            functionName: "closeRound",
            args: [circleId, currentRound],
            gas: 5_000_000n,
            ...fees,
          });
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status === "reverted") throw new Error("closeRound reverted");
          updateLast({ status: "done", txHash: hash, message: "Bidding closed." });
          await refetchClosed();
        } else {
          log({ step: "close-round", status: "skipped", message: "Already closed." });
        }

        // STEP 2 — Resolve winner if not resolved yet
        let winnerAddr: `0x${string}` | null = winnerOnChain;
        if (!resolved) {
          setCurrentStep("find-winner");
          log({ step: "find-winner", status: "running", message: "Finding winner…" });

          // Try auto-detect via encrypted bidder handle (KuraBid v2). Fall back to manual.
          let autoWinner: `0x${string}` | null = null;
          try {
            const winnerHandle = (await publicClient.readContract({
              address: KURA_BID_ADDRESS,
              abi: KURA_BID_ABI,
              functionName: "getLowestBidderEncHandle",
              args: [circleId, currentRound],
            })) as `0x${string}` | bigint;
            const handleBig = typeof winnerHandle === "string" ? BigInt(winnerHandle) : winnerHandle;
            if (handleBig !== 0n) {
              const dec = (await decryptForTx(publicClient, walletClient, handleBig)) as { decryptedValue: bigint };
              const addrBig = dec.decryptedValue;
              autoWinner = (`0x${addrBig.toString(16).padStart(40, "0")}`) as `0x${string}`;
            }
          } catch (e: any) {
            console.log("[autosettler] winner auto-detect not available, using manual:", e?.message);
          }

          winnerAddr = autoWinner ?? manualWinner ?? null;
          if (!winnerAddr) {
            updateLast({ status: "error", message: "Need winner address (contract doesn't expose encrypted bidder)." });
            throw new Error("Winner address required — please enter it manually.");
          }

          updateLast({ message: `Winner: ${winnerAddr.slice(0, 6)}…${winnerAddr.slice(-4)}` });

          setCurrentStep("settle-round");
          log({ step: "settle-round", status: "running", message: "Decrypting winning bid + settling…" });

          const bidHandle = (await publicClient.readContract({
            address: KURA_BID_ADDRESS,
            abi: KURA_BID_ABI,
            functionName: "getLowestBidHandle",
            args: [circleId, currentRound],
          })) as `0x${string}`;
          const bidDec = (await decryptForTx(publicClient, walletClient, bidHandle)) as { decryptedValue: bigint; signature: `0x${string}` };

          const fees = await getGasFees(publicClient);
          const hash = await writeContractAsync({
            address: KURA_BID_ADDRESS,
            abi: KURA_BID_ABI,
            functionName: "settleRound",
            args: [circleId, currentRound, winnerAddr, bidDec.decryptedValue, bidDec.signature],
            gas: 5_000_000n,
            ...fees,
          });
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status === "reverted") throw new Error("settleRound reverted");
          updateLast({ status: "done", txHash: hash, message: "Round resolved." });
          await refetchResult();
        } else {
          log({ step: "settle-round", status: "skipped", message: "Already resolved." });
        }

        if (!winnerAddr) throw new Error("Missing winner after settlement");

        // STEP 3 — Transfer pool
        setCurrentStep("transfer-pool");
        log({ step: "transfer-pool", status: "running", message: "Transferring encrypted pool to winner…" });
        const poolHandle = (await publicClient.readContract({
          address: KURA_CIRCLE_ADDRESS,
          abi: KURA_CIRCLE_ABI,
          functionName: "getPoolBalanceHandle",
          args: [circleId],
        })) as `0x${string}`;

        let transferHash: `0x${string}` | undefined;
        try {
          const fees = await getGasFees(publicClient);
          transferHash = await writeContractAsync({
            address: KURA_CIRCLE_ADDRESS,
            abi: KURA_CIRCLE_ABI,
            functionName: "transferPool",
            args: [circleId, winnerAddr, poolHandle],
            gas: 5_000_000n,
            ...fees,
          });
          const receipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });
          if (receipt.status === "reverted") throw new Error("transferPool reverted");
          updateLast({ status: "done", txHash: transferHash, message: "Pool transferred. +5 credit to all members if final round." });
        } catch (e: any) {
          // Skip if already received (idempotent)
          if (String(e?.message ?? "").includes("Already received")) {
            updateLast({ status: "skipped", message: "Pool already transferred." });
          } else {
            throw e;
          }
        }

        await refetchCircle();

        // STEP 4 — Start next round if not the last one
        const isLastRound = currentRound >= totalRounds;
        if (!isLastRound) {
          setCurrentStep("start-next-round");
          log({ step: "start-next-round", status: "running", message: `Starting round ${(currentRound + 1n).toString()}…` });
          const fees = await getGasFees(publicClient);
          const hash = await writeContractAsync({
            address: KURA_CIRCLE_ADDRESS,
            abi: KURA_CIRCLE_ABI,
            functionName: "startRound",
            args: [circleId],
            gas: 1_000_000n,
            ...fees,
          });
          await publicClient.waitForTransactionReceipt({ hash });
          updateLast({ status: "done", txHash: hash, message: `Round ${(currentRound + 1n).toString()} started.` });
          await refetchCircle();
        } else {
          log({ step: "complete", status: "done", message: "🎉 All rounds complete. Circle settled." });
        }

        setCurrentStep("complete");
        toast.success("Round advanced", {
          id: toastId,
          description: currentRound >= totalRounds ? "Circle complete — credit boosted for all members." : `Round ${(currentRound + 1n).toString()} is now open.`,
        });
      } catch (e: any) {
        updateLast({ status: "error", message: e?.shortMessage ?? e?.message ?? "Unknown error" });
        toast.error("Advance failed", { id: toastId, description: e?.shortMessage ?? e?.message ?? "Unknown error" });
        throw e;
      } finally {
        setRunning(false);
      }
    },
    [publicClient, walletClient, writeContractAsync, info, completed, currentRound, totalRounds, roundClosed, resolved, winnerOnChain, circleId, log, updateLast, refetchClosed, refetchResult, refetchCircle]
  );

  return {
    advanceRound,
    nextStep,
    running,
    logs,
    currentStep,
    canAdvance: !completed && currentRound > 0n,
  };
}
