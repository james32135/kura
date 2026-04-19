import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract, useReadContract, useAccount } from "wagmi";
import { parseUnits } from "viem";
import {
  CUSDC_ADDRESS, CUSDC_ABI,
  USDC_ADDRESS, USDC_ABI,
  KURA_CIRCLE_ADDRESS,
} from "@/config/contracts";
import { decryptForView } from "@/lib/fhe";
import { getGasFees } from "@/lib/utils";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// cUSDC uses setOperator instead of approve — max uint48 = ~year 2106
const OPERATOR_UNTIL_MAX = 281474976710655; // max uint48

export function useConfidentialUSDC() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");

  // USDC plaintext balance
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { refetchInterval: 5_000 },
  });

  // USDC allowance for cUSDC wrap contract
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "allowance",
    args: address ? [address, CUSDC_ADDRESS] : undefined,
    query: { refetchInterval: 5_000 },
  });

  // Check if KuraCircle is operator on cUSDC for current user
  const { data: isCircleOperator, refetch: refetchOperator } = useReadContract({
    address: CUSDC_ADDRESS,
    abi: CUSDC_ABI,
    functionName: "isOperator",
    args: address ? [address, KURA_CIRCLE_ADDRESS] : undefined,
    query: { refetchInterval: 5_000 },
  });

  /// @notice Approve USDC spend for cUSDC wrap contract
  const approveUsdc = useCallback(
    async (amount: bigint) => {
      if (!address) throw new Error("Wallet not connected");
      setLoading(true);
      setStep("Approving USDC...");
      try {
        const fees = publicClient ? await getGasFees(publicClient) : {};
        const hash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: "approve",
          args: [CUSDC_ADDRESS, amount],
          gas: 100_000n,
          ...fees,
        });
        setStep("Approved!");
        await refetchAllowance();
        return hash;
      } finally {
        setLoading(false);
      }
    },
    [address, writeContractAsync, refetchAllowance]
  );

  /// @notice Wrap USDC → cUSDC (encrypted). Pulls USDC from caller.
  const wrapUsdc = useCallback(
    async (amountUsdc: bigint) => {
      if (!address) throw new Error("Wallet not connected");
      setLoading(true);
      setStep("Checking USDC allowance...");
      try {
        const fees = publicClient ? await getGasFees(publicClient) : {};
        // Ensure sufficient allowance first
        const currentAllowance = (usdcAllowance as bigint) ?? 0n;
        if (currentAllowance < amountUsdc) {
          setStep("Approving USDC...");
          await writeContractAsync({
            address: USDC_ADDRESS,
            abi: USDC_ABI,
            functionName: "approve",
            args: [CUSDC_ADDRESS, amountUsdc],
            gas: 500_000n,
            ...fees,
          });
          await refetchAllowance();
          // Wait after approve to avoid cUSDC rate limit
          setStep("Waiting for rate limit cooldown...");
          await delay(4000);
        }
        // Retry wrap up to 3 times with backoff (testnet cUSDC rate-limits)
        let lastErr: any;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            setStep(attempt > 0 ? `Retrying wrap (${attempt + 1}/3)...` : "Wrapping USDC → cUSDC...");
            const freshFees = publicClient ? await getGasFees(publicClient) : {};
            const hash = await writeContractAsync({
              address: CUSDC_ADDRESS,
              abi: CUSDC_ABI,
              functionName: "wrap",
              args: [address, amountUsdc],
              gas: 1_000_000n,
              ...freshFees,
            });
            setStep("Wrapped! cUSDC received (encrypted).");
            await refetchUsdcBalance();
            return hash;
          } catch (err: any) {
            lastErr = err;
            const msg = (err?.message || "").toLowerCase();
            if (msg.includes("rate limit")) {
              const wait = 5000 * (attempt + 1);
              setStep(`Rate limited — retrying in ${wait / 1000}s...`);
              await delay(wait);
            } else {
              throw err; // non-rate-limit error, don't retry
            }
          }
        }
        throw lastErr; // all retries exhausted
      } finally {
        setLoading(false);
      }
    },
    [address, usdcAllowance, writeContractAsync, refetchAllowance, refetchUsdcBalance, publicClient]
  );

  /// @notice Unwrap cUSDC → USDC (2-phase async).
  /// Phase 1: unwrap() burns cUSDC and queues FHE decrypt.
  /// Phase 2: claimUnwrapped(ctHash) once decrypt resolves.
  const unwrapCusdc = useCallback(
    async (amount: bigint) => {
      if (!address) throw new Error("Wallet not connected");
      setLoading(true);
      setStep("Unwrapping cUSDC → USDC (phase 1)...");
      try {
        const fees = publicClient ? await getGasFees(publicClient) : {};
        const hash = await writeContractAsync({
          address: CUSDC_ADDRESS,
          abi: CUSDC_ABI,
          functionName: "unwrap",
          args: [address, amount],
          gas: 1_000_000n,
          ...fees,
        });
        setStep("Unwrap queued. Wait for FHE decrypt, then claim.");
        return hash;
      } finally {
        setLoading(false);
      }
    },
    [address, writeContractAsync]
  );

  /// @notice Phase 2: claim plaintext USDC after decrypt resolves.
  const claimUnwrapped = useCallback(
    async (ctHash: bigint) => {
      if (!address) throw new Error("Wallet not connected");
      setLoading(true);
      setStep("Claiming unwrapped USDC...");
      try {
        const fees = publicClient ? await getGasFees(publicClient) : {};
        const hash = await writeContractAsync({
          address: CUSDC_ADDRESS,
          abi: CUSDC_ABI,
          functionName: "claimUnwrapped",
          args: [ctHash],
          gas: 500_000n,
          ...fees,
        });
        setStep("USDC claimed!");
        await refetchUsdcBalance();
        return hash;
      } finally {
        setLoading(false);
      }
    },
    [address, writeContractAsync, refetchUsdcBalance]
  );

  /// @notice Set KuraCircle as operator on cUSDC (replaces approve for FHERC20).
  /// Must be called before contributing to a circle.
  const setKuraCircleOperator = useCallback(
    async () => {
      if (!address) throw new Error("Wallet not connected");
      setLoading(true);
      setStep("Setting KuraCircle as operator on cUSDC...");
      try {
        let lastErr: any;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            setStep(attempt > 0 ? `Retrying set operator (${attempt + 1}/3)...` : "Setting KuraCircle as operator on cUSDC...");
            const fees = publicClient ? await getGasFees(publicClient) : {};
            const hash = await writeContractAsync({
              address: CUSDC_ADDRESS,
              abi: CUSDC_ABI,
              functionName: "setOperator",
              args: [KURA_CIRCLE_ADDRESS, OPERATOR_UNTIL_MAX],
              gas: 500_000n,
              ...fees,
            });
            setStep("Operator set! Ready to contribute.");
            await refetchOperator();
            return hash;
          } catch (err: any) {
            lastErr = err;
            const msg = (err?.message || "").toLowerCase();
            if (msg.includes("rate limit")) {
              const wait = 5000 * (attempt + 1);
              setStep(`Rate limited — retrying in ${wait / 1000}s...`);
              await delay(wait);
            } else {
              throw err;
            }
          }
        }
        throw lastErr;
      } finally {
        setLoading(false);
      }
    },
    [address, writeContractAsync, refetchOperator, publicClient]
  );

  /// @notice View own encrypted cUSDC balance (decrypt with FHE).
  const getEncryptedBalance = useCallback(
    async () => {
      if (!publicClient || !walletClient || !address) throw new Error("Wallet not connected");
      setLoading(true);
      setStep("Fetching cUSDC balance handle...");
      try {
        const handle = await publicClient.readContract({
          address: CUSDC_ADDRESS,
          abi: CUSDC_ABI,
          functionName: "confidentialBalanceOf",
          args: [address],
          account: address,
        });
        setStep("Decrypting balance...");
        const value = await decryptForView(
          publicClient,
          walletClient,
          ("0x" + (handle as bigint).toString(16).padStart(64, "0")) as `0x${string}`,
          setStep
        );
        setStep("Balance revealed!");
        return value;
      } finally {
        setLoading(false);
      }
    },
    [publicClient, walletClient, address]
  );

  return {
    usdcBalance: usdcBalance as bigint | undefined,
    usdcAllowance: usdcAllowance as bigint | undefined,
    isCircleOperator: isCircleOperator as boolean | undefined,
    approveUsdc,
    wrapUsdc,
    unwrapCusdc,
    claimUnwrapped,
    setKuraCircleOperator,
    getEncryptedBalance,
    loading,
    step,
    refetchUsdcBalance,
    refetchOperator,
  };
}
