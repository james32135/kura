import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract, useReadContract, useAccount } from "wagmi";
import { KURA_MEMBER_REGISTRY_ADDRESS, KURA_MEMBER_REGISTRY_ABI } from "@/config/contracts";

export function useKuraMemberRegistry(circleId?: bigint) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");

  const { data: memberCount } = useReadContract({
    address: KURA_MEMBER_REGISTRY_ADDRESS || undefined,
    abi: KURA_MEMBER_REGISTRY_ABI,
    functionName: "getMemberCount",
    args: circleId !== undefined ? [circleId] : undefined,
    query: { enabled: !!KURA_MEMBER_REGISTRY_ADDRESS && circleId !== undefined, refetchInterval: 10_000 },
  });

  /** Grant self-read access to your own encrypted membership slot */
  const allowSelf = useCallback(async (slotIndex: bigint) => {
    if (!address || !walletClient || circleId === undefined) throw new Error("Wallet not connected");
    if (!KURA_MEMBER_REGISTRY_ADDRESS) throw new Error("KuraMemberRegistry not deployed yet");
    setLoading(true);
    setStep("Granting self access to membership slot...");
    try {
      const hash = await writeContractAsync({
        address: KURA_MEMBER_REGISTRY_ADDRESS,
        abi: KURA_MEMBER_REGISTRY_ABI,
        functionName: "allowMemberSelf",
        args: [circleId, slotIndex],
      });
      setStep("Done");
      return hash;
    } finally {
      setLoading(false);
    }
  }, [address, walletClient, circleId, writeContractAsync]);

  /** Read an encrypted member slot handle (requires prior allowMemberSelf call) */
  const getEncMemberSlot = useCallback(async (slotIndex: bigint) => {
    if (!publicClient || circleId === undefined) throw new Error("Not connected");
    if (!KURA_MEMBER_REGISTRY_ADDRESS) throw new Error("KuraMemberRegistry not deployed yet");
    const handle = await publicClient.readContract({
      address: KURA_MEMBER_REGISTRY_ADDRESS,
      abi: KURA_MEMBER_REGISTRY_ABI,
      functionName: "getEncMemberSlot",
      args: [circleId, slotIndex],
    });
    return handle as bigint;
  }, [publicClient, circleId]);

  return {
    loading,
    step,
    memberCount: memberCount as bigint | undefined,
    allowSelf,
    getEncMemberSlot,
  };
}
