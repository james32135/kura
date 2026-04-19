import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract, useReadContract, useAccount } from "wagmi";
import { KURA_CREDIT_ADDRESS, KURA_CREDIT_ABI } from "@/config/contracts";
import { decryptForView, encryptUint64 } from "@/lib/fhe";
import { getGasFees } from "@/lib/utils";

export const CREDIT_TIERS = ["None", "Bronze", "Silver", "Gold", "Diamond"] as const;
export type CreditTier = typeof CREDIT_TIERS[number];

export function useKuraCredit(memberAddress?: `0x${string}`) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");

  const targetAddress = memberAddress ?? address;

  // Public contribution count
  const { data: contributionCount, refetch: refetchContribCount } = useReadContract({
    address: KURA_CREDIT_ADDRESS,
    abi: KURA_CREDIT_ABI,
    functionName: "contributionCount",
    args: targetAddress ? [targetAddress] : undefined,
    query: { refetchInterval: 8_000 },
  });

  // Circles completed
  const { data: circlesCompleted, refetch: refetchCirclesCompleted } = useReadContract({
    address: KURA_CREDIT_ADDRESS,
    abi: KURA_CREDIT_ABI,
    functionName: "circlesCompleted",
    args: targetAddress ? [targetAddress] : undefined,
    query: { refetchInterval: 10_000 },
  });

  // Full credit stats (tier, on-time, late payments)
  const { data: creditStats, refetch: refetchStats } = useReadContract({
    address: KURA_CREDIT_ADDRESS,
    abi: KURA_CREDIT_ABI,
    functionName: "getCreditStats",
    args: targetAddress ? [targetAddress] : undefined,
    query: { refetchInterval: 8_000 },
  });

  const getMyScore = useCallback(async () => {
    if (!publicClient || !walletClient || !address) throw new Error("Wallet not connected");
    setLoading(true);
    setStep("Fetching score handle...");
    try {
      const handle = await publicClient.readContract({
        address: KURA_CREDIT_ADDRESS,
        abi: KURA_CREDIT_ABI,
        functionName: "getMyScore",
        account: address,
      });
      setStep("Signing permit...");
      const value = await decryptForView(publicClient, walletClient, handle as `0x${string}`, setStep);
      setStep("Score revealed!");
      return value;
    } finally {
      setLoading(false);
    }
  }, [publicClient, walletClient, address]);

  const verifyCreditworthiness = useCallback(
    async (member: `0x${string}`, threshold: bigint) => {
      if (!publicClient || !walletClient) throw new Error("Wallet not connected");
      setLoading(true);
      setStep("Encrypting threshold...");
      try {
        const encrypted = await encryptUint64(publicClient, walletClient, threshold, setStep);
        setStep("Verifying creditworthiness...");
        const fees = await getGasFees(publicClient);
        const hash = await writeContractAsync({
          address: KURA_CREDIT_ADDRESS,
          abi: KURA_CREDIT_ABI,
          functionName: "verifyCreditworthiness",
          args: [member, encrypted],
          gas: 5_000_000n,
          ...fees,
        });
        setStep("Verification complete!");
        await Promise.all([refetchStats(), refetchContribCount(), refetchCirclesCompleted()]);
        return hash;
      } finally {
        setLoading(false);
      }
    },
    [publicClient, walletClient, writeContractAsync]
  );

  // Parse credit stats tuple
  const stats = creditStats as readonly [bigint, bigint, bigint, bigint, bigint] | undefined;
  const tier = stats ? Number(stats[4]) : 0;
  const tierName: CreditTier = CREDIT_TIERS[tier] ?? "None";

  return {
    contributionCount,
    circlesCompleted,
    creditStats: stats,
    tier,
    tierName,
    getMyScore,
    verifyCreditworthiness,
    loading,
    step,
    refetchStats,
  };
}
