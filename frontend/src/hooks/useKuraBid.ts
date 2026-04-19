import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract, useReadContract, useAccount } from "wagmi";
import { KURA_BID_ADDRESS, KURA_BID_ABI } from "@/config/contracts";
import { encryptUint64, decryptForTx } from "@/lib/fhe";
import { getGasFees } from "@/lib/utils";

export function useKuraBid(circleId: bigint = 0n, round: bigint = 1n) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");

  // Has current user bid this round
  const { data: userHasBid, refetch: refetchHasBid } = useReadContract({
    address: KURA_BID_ADDRESS,
    abi: KURA_BID_ABI,
    functionName: "hasBid",
    args: address ? [circleId, round, address] : undefined,
    query: { refetchInterval: 5_000 },
  });

  // Round result
  const { data: roundResult, refetch: refetchResult } = useReadContract({
    address: KURA_BID_ADDRESS,
    abi: KURA_BID_ABI,
    functionName: "getRoundResult",
    args: [circleId, round],
    query: { refetchInterval: 5_000 },
  });

  // Bid count
  const { data: bidCount, refetch: refetchBidCount } = useReadContract({
    address: KURA_BID_ADDRESS,
    abi: KURA_BID_ABI,
    functionName: "getRoundBidCount",
    args: [circleId, round],
    query: { refetchInterval: 5_000 },
  });

  // Is round closed
  const { data: isClosed, refetch: refetchClosed } = useReadContract({
    address: KURA_BID_ADDRESS,
    abi: KURA_BID_ABI,
    functionName: "roundClosed",
    args: [circleId, round],
    query: { refetchInterval: 5_000 },
  });

  const submitBid = useCallback(
    async (discountAmount: bigint) => {
      if (!publicClient || !walletClient) throw new Error("Wallet not connected");
      setLoading(true);
      setStep("Encrypting bid...");
      try {
        const encrypted = await encryptUint64(publicClient, walletClient, discountAmount, setStep);
        setStep("Submitting sealed bid...");
        const fees = await getGasFees(publicClient);
        const hash = await writeContractAsync({
          address: KURA_BID_ADDRESS,
          abi: KURA_BID_ABI,
          functionName: "submitBid",
          args: [circleId, round, encrypted],
          gas: 5_000_000n,
          ...fees,
        });
        // Verify tx actually succeeded on-chain
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          throw new Error(`Bid transaction reverted on-chain (gasUsed: ${receipt.gasUsed})`);
        }
        setStep("Bid sealed!");
        await refetchHasBid();
        await refetchBidCount();
        return hash;
      } finally {
        setLoading(false);
      }
    },
    [circleId, round, publicClient, walletClient, writeContractAsync, refetchHasBid, refetchBidCount]
  );

  const closeRound = useCallback(async () => {
    if (!publicClient) throw new Error("Wallet not connected");
    setLoading(true);
    setStep("Closing round...");
    try {
      const fees = await getGasFees(publicClient);
      const hash = await writeContractAsync({
        address: KURA_BID_ADDRESS,
        abi: KURA_BID_ABI,
        functionName: "closeRound",
        args: [circleId, round],
        gas: 5_000_000n,
        ...fees,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        throw new Error(`closeRound reverted on-chain (gasUsed: ${receipt.gasUsed})`);
      }
      setStep("Round closed!");
      await refetchClosed();
      return hash;
    } finally {
      setLoading(false);
    }
  }, [circleId, round, publicClient, writeContractAsync, refetchClosed]);

  const resolveRound = useCallback(
    async (winnerAddress: `0x${string}`) => {
      if (!publicClient || !walletClient) throw new Error("Wallet not connected");
      setLoading(true);
      setStep("Fetching lowest bid handle...");
      try {
        const handle = await publicClient.readContract({
          address: KURA_BID_ADDRESS,
          abi: KURA_BID_ABI,
          functionName: "getLowestBidHandle",
          args: [circleId, round],
        });

        setStep("Decrypting winning bid...");
        const result = await decryptForTx(publicClient, walletClient, handle as `0x${string}`, setStep);
        const { decryptedValue, signature } = result as { decryptedValue: bigint; signature: `0x${string}` };

        setStep("Settling round on-chain with verified proof...");
        const fees = await getGasFees(publicClient);
        const hash = await writeContractAsync({
          address: KURA_BID_ADDRESS,
          abi: KURA_BID_ABI,
          functionName: "settleRound",
          args: [circleId, round, winnerAddress, decryptedValue, signature],
          gas: 5_000_000n,
          ...fees,
        });
        setStep("Round resolved!");
        await Promise.all([refetchResult(), refetchClosed()]);
        return hash;
      } finally {
        setLoading(false);
      }
    },
    [circleId, round, publicClient, walletClient, writeContractAsync, refetchResult]
  );

  return {
    userHasBid,
    roundResult,
    bidCount,
    isClosed,
    submitBid,
    closeRound,
    resolveRound,
    loading,
    step,
    refetchHasBid,
    refetchResult,
    refetchBidCount,
    refetchClosed,
  };
}
