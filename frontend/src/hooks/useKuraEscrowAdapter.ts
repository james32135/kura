import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract, useReadContract, useAccount } from "wagmi";
import {
  KURA_ESCROW_ADAPTER_ADDRESS,
  KURA_ESCROW_ADAPTER_ABI,
} from "@/config/contracts";
import { getGasFees } from "@/lib/utils";

export function useKuraEscrowAdapter(circleId: bigint = 0n, round: bigint = 1n) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");

  // Get escrow ID for this circle/round
  const { data: escrowId, refetch: refetchEscrowId } = useReadContract({
    address: KURA_ESCROW_ADAPTER_ADDRESS,
    abi: KURA_ESCROW_ADAPTER_ABI,
    functionName: "getEscrowId",
    args: [circleId, round],
    query: { refetchInterval: 10_000 },
  });

  // Check if winner has claimed
  const { data: claimed, refetch: refetchClaimed } = useReadContract({
    address: KURA_ESCROW_ADAPTER_ADDRESS,
    abi: KURA_ESCROW_ADAPTER_ABI,
    functionName: "isClaimed",
    args: [circleId, round],
    query: { refetchInterval: 10_000 },
  });

  /// @notice Winner claims escrow as encrypted cUSDC (if credit condition met).
  const claimEscrow = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");
    setLoading(true);
    setStep("Claiming escrow (credit check)...");
    try {
      const fees = publicClient ? await getGasFees(publicClient) : {};
      const hash = await writeContractAsync({
        address: KURA_ESCROW_ADAPTER_ADDRESS,
        abi: KURA_ESCROW_ADAPTER_ABI,
        functionName: "claimEscrow",
        args: [circleId, round],
        gas: 5_000_000n,
        ...fees,
      });
      setStep("Escrow claimed! cUSDC received.");
      await refetchClaimed();
      return hash;
    } finally {
      setLoading(false);
    }
  }, [circleId, round, address, writeContractAsync, refetchClaimed]);

  /// @notice Winner claims and unwraps to plaintext USDC in one tx.
  const claimAndUnwrap = useCallback(
    async (recipient?: `0x${string}`) => {
      if (!address) throw new Error("Wallet not connected");
      setLoading(true);
      setStep("Claiming & unwrapping to USDC...");
      try {
        const fees = publicClient ? await getGasFees(publicClient) : {};
      const hash = await writeContractAsync({
          address: KURA_ESCROW_ADAPTER_ADDRESS,
          abi: KURA_ESCROW_ADAPTER_ABI,
          functionName: "claimAndUnwrap",
          args: [circleId, round, recipient ?? address],
          gas: 5_000_000n,
          ...fees,
        });
        setStep("Claimed & unwrapped! USDC received.");
        await refetchClaimed();
        return hash;
      } finally {
        setLoading(false);
      }
    },
    [circleId, round, address, writeContractAsync, refetchClaimed]
  );

  return {
    escrowId: escrowId as bigint | undefined,
    claimed: claimed as boolean | undefined,
    claimEscrow,
    claimAndUnwrap,
    loading,
    step,
    refetchEscrowId,
    refetchClaimed,
  };
}
