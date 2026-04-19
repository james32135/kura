import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract, useReadContract, useAccount } from "wagmi";
import { KURA_CIRCLE_ADDRESS, KURA_CIRCLE_ABI } from "@/config/contracts";
import { encryptUint64, decryptForView } from "@/lib/fhe";
import { getGasFees } from "@/lib/utils";

export function useKuraCircle(circleId: bigint = 0n) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");

  // Read circle info
  const { data: circleInfo, refetch: refetchCircle } = useReadContract({
    address: KURA_CIRCLE_ADDRESS,
    abi: KURA_CIRCLE_ABI,
    functionName: "getCircleInfo",
    args: [circleId],
    query: { refetchInterval: 5_000 },
  });

  // Read members
  const { data: members, refetch: refetchMembers } = useReadContract({
    address: KURA_CIRCLE_ADDRESS,
    abi: KURA_CIRCLE_ABI,
    functionName: "getMembers",
    args: [circleId],
    query: { refetchInterval: 8_000 },
  });

  // Read circle count
  const { data: circleCount } = useReadContract({
    address: KURA_CIRCLE_ADDRESS,
    abi: KURA_CIRCLE_ABI,
    functionName: "circleCount",
    query: { refetchInterval: 10_000 },
  });

  // Check if current user is member
  const { data: userIsMember, refetch: refetchIsMember } = useReadContract({
    address: KURA_CIRCLE_ADDRESS,
    abi: KURA_CIRCLE_ABI,
    functionName: "isMember",
    args: address ? [circleId, address] : undefined,
    query: { refetchInterval: 5_000 },
  });

  // Contribution count for current round
  const currentRound = circleInfo ? (circleInfo as any)[3] : 0n;
  const { data: contributionCount, refetch: refetchContribCount } = useReadContract({
    address: KURA_CIRCLE_ADDRESS,
    abi: KURA_CIRCLE_ABI,
    functionName: "getContributionCount",
    args: [circleId, currentRound],
    query: { refetchInterval: 5_000 },
  });

  // Has current user contributed this round
  const { data: hasContributed, refetch: refetchHasContributed } = useReadContract({
    address: KURA_CIRCLE_ADDRESS,
    abi: KURA_CIRCLE_ABI,
    functionName: "hasContributed",
    args: address ? [circleId, currentRound, address] : undefined,
    query: { refetchInterval: 5_000 },
  });

  const createCircle = useCallback(
    async (maxMembers: number, roundDuration: number, totalRounds: number, minContribution: bigint) => {
      if (!publicClient || !walletClient) throw new Error("Wallet not connected");
      setLoading(true);
      setStep("Encrypting minimum contribution...");
      try {
        const encrypted = await encryptUint64(publicClient, walletClient, minContribution, setStep);
        setStep("Submitting transaction...");
        const fees = await getGasFees(publicClient);
        const hash = await writeContractAsync({
          address: KURA_CIRCLE_ADDRESS,
          abi: KURA_CIRCLE_ABI,
          functionName: "createCircle",
          args: [BigInt(maxMembers), BigInt(roundDuration), BigInt(totalRounds), encrypted],
          gas: 5_000_000n,
          ...fees,
        });
        setStep("Confirmed!");
        await refetchCircle();
        return hash;
      } finally {
        setLoading(false);
      }
    },
    [publicClient, walletClient, writeContractAsync, refetchCircle]
  );

  const joinCircle = useCallback(async () => {
    if (!publicClient) throw new Error("Wallet not connected");
    setLoading(true);
    setStep("Joining circle...");
    try {
      const fees = await getGasFees(publicClient);
      const hash = await writeContractAsync({
        address: KURA_CIRCLE_ADDRESS,
        abi: KURA_CIRCLE_ABI,
        functionName: "joinCircle",
        args: [circleId],
        gas: 1_000_000n,
        ...fees,
      });
      setStep("Joined!");
      await Promise.all([refetchMembers(), refetchIsMember(), refetchCircle()]);
      return hash;
    } finally {
      setLoading(false);
    }
  }, [circleId, publicClient, writeContractAsync, refetchMembers, refetchIsMember, refetchCircle]);

  const startRound = useCallback(async () => {
    if (!publicClient) throw new Error("Wallet not connected");
    setLoading(true);
    setStep("Starting round...");
    try {
      const fees = await getGasFees(publicClient);
      const hash = await writeContractAsync({
        address: KURA_CIRCLE_ADDRESS,
        abi: KURA_CIRCLE_ABI,
        functionName: "startRound",
        args: [circleId],
        gas: 1_000_000n,
        ...fees,
      });
      setStep("Round started!");
      await Promise.all([refetchCircle(), refetchContribCount(), refetchHasContributed()]);
      return hash;
    } finally {
      setLoading(false);
    }
  }, [circleId, publicClient, writeContractAsync, refetchCircle, refetchContribCount, refetchHasContributed]);

  const contribute = useCallback(
    async (amount: bigint) => {
      if (!publicClient || !walletClient) throw new Error("Wallet not connected");
      setLoading(true);
      setStep("Encrypting contribution...");
      try {
        const encrypted = await encryptUint64(publicClient, walletClient, amount, setStep);
        console.log("[contribute] encrypted struct:", JSON.stringify(encrypted, (_, v) => typeof v === "bigint" ? v.toString() : v));

        // Simulate before sending — avoid burning gas on rate-limited reverts
        const txArgs = {
          address: KURA_CIRCLE_ADDRESS,
          abi: KURA_CIRCLE_ABI,
          functionName: "contribute",
          args: [circleId, encrypted],
          account: address,
        } as const;

        // Wait until simulation passes (up to ~60s)
        for (let wait = 0; wait < 8; wait++) {
          try {
            setStep(wait > 0 ? `Waiting for rate-limit cooldown (${wait}/8)...` : "Verifying transaction...");
            await publicClient.simulateContract(txArgs);
            break; // simulation passed
          } catch (simErr: any) {
            if (wait >= 7) throw new Error("Transaction would revert — cUSDC rate limit may still be active. Please wait ~30s and try again.");
            const delay = wait < 2 ? 5000 : 8000;
            setStep(`Rate limited — waiting ${Math.round(delay / 1000)}s (${wait + 1}/8)...`);
            await new Promise(r => setTimeout(r, delay));
          }
        }

        // Simulation passed — send the real transaction (one wallet popup)
        setStep("Submitting to blockchain...");
        const fees = await getGasFees(publicClient);
        const hash = await writeContractAsync({
          address: KURA_CIRCLE_ADDRESS,
          abi: KURA_CIRCLE_ABI,
          functionName: "contribute",
          args: [circleId, encrypted],
          gas: 5_000_000n,
          ...fees,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log("[contribute] receipt:", { status: receipt.status, gasUsed: receipt.gasUsed.toString() });
        if (receipt.status === "reverted") {
          throw new Error(`Transaction reverted on-chain (gasUsed: ${receipt.gasUsed}).`);
        }
        setStep("Contribution recorded!");
        await Promise.all([refetchCircle(), refetchContribCount(), refetchHasContributed()]);
        return hash;
      } finally {
        setLoading(false);
      }
    },
    [circleId, publicClient, walletClient, writeContractAsync, refetchCircle, refetchContribCount, refetchHasContributed, address]
  );

  const getMyContribution = useCallback(async () => {
    if (!publicClient || !walletClient) throw new Error("Wallet not connected");
    setLoading(true);
    setStep("Fetching handle...");
    try {
      const handle = await publicClient.readContract({
        address: KURA_CIRCLE_ADDRESS,
        abi: KURA_CIRCLE_ABI,
        functionName: "getMyContribution",
        args: [circleId],
        account: address,
      });
      setStep("Decrypting...");
      const value = await decryptForView(publicClient, walletClient, handle as `0x${string}`, setStep);
      setStep("Revealed!");
      return value;
    } finally {
      setLoading(false);
    }
  }, [circleId, publicClient, walletClient, address]);

  const getPoolBalance = useCallback(async () => {
    if (!publicClient || !walletClient) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      const handle = await publicClient.readContract({
        address: KURA_CIRCLE_ADDRESS,
        abi: KURA_CIRCLE_ABI,
        functionName: "getPoolBalance",
        args: [circleId],
        account: address,
      });
      const value = await decryptForView(publicClient, walletClient, handle as `0x${string}`, setStep);
      return value;
    } finally {
      setLoading(false);
    }
  }, [circleId, publicClient, walletClient, address]);

  /// @notice Admin transfers encrypted pool balance to round winner.
  /// Reads the encrypted pool handle, then calls transferPool. The contract
  /// will mark the circle complete and boost credit if this was the last round.
  const transferPool = useCallback(async (winner: `0x${string}`) => {
    if (!publicClient) throw new Error("Wallet not connected");
    setLoading(true);
    setStep("Reading encrypted pool handle...");
    try {
      const handle = await publicClient.readContract({
        address: KURA_CIRCLE_ADDRESS,
        abi: KURA_CIRCLE_ABI,
        functionName: "getPoolBalanceHandle",
        args: [circleId],
      });
      setStep("Transferring encrypted pool to winner...");
      const fees = await getGasFees(publicClient);
      const hash = await writeContractAsync({
        address: KURA_CIRCLE_ADDRESS,
        abi: KURA_CIRCLE_ABI,
        functionName: "transferPool",
        args: [circleId, winner, handle as `0x${string}`],
        gas: 5_000_000n,
        ...fees,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") throw new Error(`transferPool reverted (gasUsed: ${receipt.gasUsed})`);
      setStep("Pool transferred to winner!");
      await refetchCircle();
      return hash;
    } finally {
      setLoading(false);
    }
  }, [circleId, publicClient, writeContractAsync, refetchCircle]);

  return {
    circleInfo,
    members,
    circleCount,
    userIsMember,
    contributionCount,
    hasContributed,
    createCircle,
    joinCircle,
    startRound,
    contribute,
    getMyContribution,
    getPoolBalance,
    transferPool,
    loading,
    step,
    refetchCircle,
    refetchMembers,
    refetchContribCount,
    refetchHasContributed,
    refetchIsMember,
  };
}
