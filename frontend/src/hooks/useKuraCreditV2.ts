import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract, useAccount } from "wagmi";
import { KURA_CREDIT_V2_ADDRESS, KURA_CREDIT_V2_ABI } from "@/config/contracts";
import { decryptForView, decryptForView_uint8 } from "@/lib/fhe";

export const TIER_LABELS = ["None", "Bronze", "Silver", "Gold", "Diamond"] as const;

export function useKuraCreditV2() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");

  /** Get my weighted credit score (decrypted, for display) */
  const getMyScore = useCallback(async () => {
    if (!publicClient || !walletClient || !address) throw new Error("Wallet not connected");
    if (!KURA_CREDIT_V2_ADDRESS) throw new Error("KuraCreditV2 not deployed yet");
    setLoading(true);
    setStep("Fetching score handle...");
    try {
      const handle = await publicClient.readContract({
        address: KURA_CREDIT_V2_ADDRESS,
        abi: KURA_CREDIT_V2_ABI,
        functionName: "getMyScore",
        account: address,
      });
      setStep("Decrypting...");
      const value = await decryptForView(publicClient, walletClient, handle as bigint, setStep);
      setStep("Done");
      return value;
    } finally {
      setLoading(false);
    }
  }, [publicClient, walletClient, address]);

  /** Get encrypted tier handle, then decrypt as uint8 to get tier 0-4 */
  const getMyTier = useCallback(async () => {
    if (!publicClient || !walletClient || !address) throw new Error("Wallet not connected");
    if (!KURA_CREDIT_V2_ADDRESS) throw new Error("KuraCreditV2 not deployed yet");
    setLoading(true);
    setStep("Fetching tier...");
    try {
      const handle = await writeContractAsync({
        address: KURA_CREDIT_V2_ADDRESS,
        abi: KURA_CREDIT_V2_ABI,
        functionName: "getEncryptedTier",
        args: [address],
      });
      // getEncryptedTier returns handle via allowSender — read it back
      const rawHandle = await publicClient.readContract({
        address: KURA_CREDIT_V2_ADDRESS,
        abi: KURA_CREDIT_V2_ABI,
        functionName: "getMyScore",
        account: address,
      });
      setStep("Decrypting tier...");
      const tier = await decryptForView_uint8(publicClient, walletClient, rawHandle as bigint, setStep);
      setStep("Done");
      return tier; // 0-4
    } finally {
      setLoading(false);
    }
  }, [publicClient, walletClient, address, writeContractAsync]);

  return {
    loading,
    step,
    getMyScore,
    getMyTier,
    tierLabel: (tier: number) => TIER_LABELS[Math.min(tier, 4)],
  };
}
