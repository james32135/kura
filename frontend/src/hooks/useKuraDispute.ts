import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract, useReadContract, useAccount } from "wagmi";
import { KURA_DISPUTE_RESOLUTION_ADDRESS, KURA_DISPUTE_RESOLUTION_ABI } from "@/config/contracts";
import { encryptUint64 } from "@/lib/fhe";

export type DisputeStatus = "Open" | "Approved" | "Rejected";

const STATUS_LABELS: DisputeStatus[] = ["Open", "Approved", "Rejected"];

export function useKuraDispute() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");

  const { data: disputeCount } = useReadContract({
    address: KURA_DISPUTE_RESOLUTION_ADDRESS || undefined,
    abi: KURA_DISPUTE_RESOLUTION_ABI,
    functionName: "disputeCount",
    query: { enabled: !!KURA_DISPUTE_RESOLUTION_ADDRESS, refetchInterval: 10_000 },
  });

  /** Raise a dispute with an encrypted claimed amount */
  const raiseDispute = useCallback(async (
    circleId: bigint,
    round: bigint,
    claimedAmount: bigint
  ) => {
    if (!publicClient || !walletClient || !address) throw new Error("Wallet not connected");
    if (!KURA_DISPUTE_RESOLUTION_ADDRESS) throw new Error("KuraDisputeResolution not deployed yet");
    setLoading(true);
    setStep("Encrypting claimed amount...");
    try {
      const encAmount = await encryptUint64(publicClient, walletClient, claimedAmount, setStep);
      setStep("Submitting dispute...");
      const hash = await writeContractAsync({
        address: KURA_DISPUTE_RESOLUTION_ADDRESS,
        abi: KURA_DISPUTE_RESOLUTION_ABI,
        functionName: "raiseDispute",
        args: [circleId, round, { ctHash: BigInt(encAmount.ctHash), signature: encAmount.signature }],
      });
      setStep("Dispute raised");
      return hash;
    } finally {
      setLoading(false);
    }
  }, [publicClient, walletClient, address, writeContractAsync]);

  /** Resolve dispute (admin only) */
  const resolveDispute = useCallback(async (disputeId: bigint, approve: boolean) => {
    if (!address) throw new Error("Wallet not connected");
    if (!KURA_DISPUTE_RESOLUTION_ADDRESS) throw new Error("KuraDisputeResolution not deployed yet");
    setLoading(true);
    setStep(approve ? "Approving dispute..." : "Rejecting dispute...");
    try {
      const hash = await writeContractAsync({
        address: KURA_DISPUTE_RESOLUTION_ADDRESS,
        abi: KURA_DISPUTE_RESOLUTION_ABI,
        functionName: "resolveDispute",
        args: [disputeId, approve],
      });
      setStep("Done");
      return hash;
    } finally {
      setLoading(false);
    }
  }, [address, writeContractAsync]);

  /** Get dispute info */
  const getDisputeStatus = useCallback(async (disputeId: bigint) => {
    if (!publicClient) throw new Error("Not connected");
    if (!KURA_DISPUTE_RESOLUTION_ADDRESS) throw new Error("KuraDisputeResolution not deployed yet");
    const result = await publicClient.readContract({
      address: KURA_DISPUTE_RESOLUTION_ADDRESS,
      abi: KURA_DISPUTE_RESOLUTION_ABI,
      functionName: "getDisputeStatus",
      args: [disputeId],
    }) as [number, bigint, bigint, `0x${string}`, bigint];

    return {
      status: STATUS_LABELS[result[0]] ?? "Open",
      circleId: result[1],
      round: result[2],
      claimant: result[3],
      createdAt: result[4],
    };
  }, [publicClient]);

  return {
    loading,
    step,
    disputeCount: disputeCount as bigint | undefined,
    raiseDispute,
    resolveDispute,
    getDisputeStatus,
  };
}
