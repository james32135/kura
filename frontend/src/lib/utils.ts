import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PublicClient } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Fetch current gas fees with a 50% buffer for Arb Sepolia's tight pricing. */
export async function getGasFees(publicClient: PublicClient) {
  const block = await publicClient.getBlock({ blockTag: "latest" });
  const baseFee = block.baseFeePerGas ?? 100_000_000n;
  const maxFee = baseFee * 3n;
  // Priority fee must be less than maxFeePerGas
  const priority = maxFee / 4n;
  return {
    maxFeePerGas: maxFee < 1_000_000n ? 1_000_000n : maxFee,
    maxPriorityFeePerGas: priority < 1n ? 1n : priority,
  };
}
