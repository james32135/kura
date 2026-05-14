import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract, useReadContract, useAccount } from "wagmi";
import { KURA_STREAM_PAY_ADDRESS, KURA_STREAM_PAY_ABI } from "@/config/contracts";
import { encryptUint64 } from "@/lib/fhe";

export function useKuraStreamPay(circleId?: bigint) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");

  const { data: streamPool } = useReadContract({
    address: KURA_STREAM_PAY_ADDRESS || undefined,
    abi: KURA_STREAM_PAY_ABI,
    functionName: "getStreamPool",
    args: circleId !== undefined ? [circleId] : undefined,
    query: { enabled: !!KURA_STREAM_PAY_ADDRESS && circleId !== undefined, refetchInterval: 8_000 },
  });

  const { data: myPaid } = useReadContract({
    address: KURA_STREAM_PAY_ADDRESS || undefined,
    abi: KURA_STREAM_PAY_ABI,
    functionName: "getMyPaid",
    args: circleId !== undefined ? [circleId] : undefined,
    query: { enabled: !!KURA_STREAM_PAY_ADDRESS && circleId !== undefined && !!address, refetchInterval: 8_000 },
  });

  /** Create a per-block stream for a circle */
  const createStream = useCallback(async (ratePerBlock: bigint, maxBlocks: bigint) => {
    if (!publicClient || !walletClient || !address || circleId === undefined) {
      throw new Error("Wallet not connected");
    }
    if (!KURA_STREAM_PAY_ADDRESS) throw new Error("KuraStreamPay not deployed yet");
    setLoading(true);
    setStep("Encrypting rate per block...");
    try {
      const encRate = await encryptUint64(publicClient, walletClient, ratePerBlock, setStep);
      setStep("Creating stream...");
      const hash = await writeContractAsync({
        address: KURA_STREAM_PAY_ADDRESS,
        abi: KURA_STREAM_PAY_ABI,
        functionName: "createStream",
        args: [circleId, { ctHash: BigInt(encRate.ctHash), signature: encRate.signature }, maxBlocks],
      });
      setStep("Stream created");
      return hash;
    } finally {
      setLoading(false);
    }
  }, [publicClient, walletClient, address, circleId, writeContractAsync]);

  /** Collect accrued stream payment for a member */
  const collectStream = useCallback(async (member: `0x${string}`) => {
    if (!address || circleId === undefined) throw new Error("Wallet not connected");
    if (!KURA_STREAM_PAY_ADDRESS) throw new Error("KuraStreamPay not deployed yet");
    setLoading(true);
    setStep("Collecting stream...");
    try {
      const hash = await writeContractAsync({
        address: KURA_STREAM_PAY_ADDRESS,
        abi: KURA_STREAM_PAY_ABI,
        functionName: "collectStream",
        args: [circleId, member],
      });
      setStep("Done");
      return hash;
    } finally {
      setLoading(false);
    }
  }, [address, circleId, writeContractAsync]);

  /** Cancel active stream and get refund of remaining locked balance */
  const cancelStream = useCallback(async () => {
    if (!address || circleId === undefined) throw new Error("Wallet not connected");
    if (!KURA_STREAM_PAY_ADDRESS) throw new Error("KuraStreamPay not deployed yet");
    setLoading(true);
    setStep("Cancelling stream...");
    try {
      const hash = await writeContractAsync({
        address: KURA_STREAM_PAY_ADDRESS,
        abi: KURA_STREAM_PAY_ABI,
        functionName: "cancelStream",
        args: [circleId],
      });
      setStep("Stream cancelled");
      return hash;
    } finally {
      setLoading(false);
    }
  }, [address, circleId, writeContractAsync]);

  return {
    loading,
    step,
    streamPool: streamPool as bigint | undefined,
    myPaid: myPaid as bigint | undefined,
    createStream,
    collectStream,
    cancelStream,
  };
}
