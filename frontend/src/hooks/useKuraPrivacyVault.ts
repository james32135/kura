import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract, useReadContract, useAccount } from "wagmi";
import { KURA_PRIVACY_VAULT_ADDRESS, KURA_PRIVACY_VAULT_ABI } from "@/config/contracts";

export function useKuraPrivacyVault(circleId?: bigint) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");

  const { data: isPrivate, refetch: refetchPrivacy } = useReadContract({
    address: KURA_PRIVACY_VAULT_ADDRESS || undefined,
    abi: KURA_PRIVACY_VAULT_ABI,
    functionName: "isPrivateCircle",
    args: circleId !== undefined ? [circleId] : undefined,
    query: { enabled: !!KURA_PRIVACY_VAULT_ADDRESS && circleId !== undefined, refetchInterval: 15_000 },
  });

  const { data: hasAccess } = useReadContract({
    address: KURA_PRIVACY_VAULT_ADDRESS || undefined,
    abi: KURA_PRIVACY_VAULT_ABI,
    functionName: "hasAccess",
    args: circleId !== undefined && address ? [circleId, address] : undefined,
    query: { enabled: !!KURA_PRIVACY_VAULT_ADDRESS && circleId !== undefined && !!address, refetchInterval: 10_000 },
  });

  const { data: metadataCounts } = useReadContract({
    address: KURA_PRIVACY_VAULT_ADDRESS || undefined,
    abi: KURA_PRIVACY_VAULT_ABI,
    functionName: "getMetadataCounts",
    args: circleId !== undefined ? [circleId] : undefined,
    query: { enabled: !!KURA_PRIVACY_VAULT_ADDRESS && circleId !== undefined },
  });

  /** Initialize vault for a circle (admin only) */
  const initVault = useCallback(async (isPrivateCircle: boolean) => {
    if (!address || circleId === undefined) throw new Error("Wallet not connected");
    if (!KURA_PRIVACY_VAULT_ADDRESS) throw new Error("KuraPrivacyVault not deployed yet");
    setLoading(true);
    setStep("Initializing vault...");
    try {
      const hash = await writeContractAsync({
        address: KURA_PRIVACY_VAULT_ADDRESS,
        abi: KURA_PRIVACY_VAULT_ABI,
        functionName: "initVault",
        args: [circleId, isPrivateCircle],
      });
      setStep("Done");
      await refetchPrivacy();
      return hash;
    } finally {
      setLoading(false);
    }
  }, [address, circleId, writeContractAsync, refetchPrivacy]);

  /** Grant member read access to encrypted metadata */
  const grantAccess = useCallback(async (member: `0x${string}`) => {
    if (!address || circleId === undefined) throw new Error("Wallet not connected");
    if (!KURA_PRIVACY_VAULT_ADDRESS) throw new Error("KuraPrivacyVault not deployed yet");
    setLoading(true);
    setStep("Granting metadata access...");
    try {
      const hash = await writeContractAsync({
        address: KURA_PRIVACY_VAULT_ADDRESS,
        abi: KURA_PRIVACY_VAULT_ABI,
        functionName: "allowMemberToRead",
        args: [circleId, member],
      });
      setStep("Done");
      return hash;
    } finally {
      setLoading(false);
    }
  }, [address, circleId, writeContractAsync]);

  /** Get name handles (requires hasAccess) */
  const getNameHandles = useCallback(async (): Promise<bigint[]> => {
    if (!publicClient || circleId === undefined) throw new Error("Not connected");
    if (!KURA_PRIVACY_VAULT_ADDRESS) throw new Error("KuraPrivacyVault not deployed yet");
    const handles = await publicClient.readContract({
      address: KURA_PRIVACY_VAULT_ADDRESS,
      abi: KURA_PRIVACY_VAULT_ABI,
      functionName: "getNameHandles",
      args: [circleId],
    });
    return handles as bigint[];
  }, [publicClient, circleId]);

  return {
    loading,
    step,
    isPrivate: isPrivate as boolean | undefined,
    hasAccess: hasAccess as boolean | undefined,
    metadataCounts: metadataCounts as readonly [bigint, bigint] | undefined,
    initVault,
    grantAccess,
    getNameHandles,
  };
}
