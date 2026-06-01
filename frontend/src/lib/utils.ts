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

/** Pull a human-readable revert reason from viem/wagmi contract errors. */
export function formatContractError(err: unknown): string {
  if (!err || typeof err !== "object") return String(err);
  const e = err as {
    shortMessage?: string;
    message?: string;
    cause?: { shortMessage?: string; message?: string; reason?: string };
    details?: string;
  };
  const reason =
    e.cause?.reason ??
    e.details ??
    e.cause?.shortMessage ??
    e.shortMessage ??
    e.message ??
    "Transaction failed";
  if (reason.includes("Only admin")) return "Only the circle admin can view the encrypted pool balance.";
  if (reason.includes("Not a member")) return "You must join this circle before voting.";
  if (reason.includes("Already voted")) return "You have already voted on this proposal.";
  if (reason.includes("Voting ended")) return "The voting period for this proposal has ended.";
  if (reason.includes("Proposal not active")) return "This proposal is no longer active.";
  return reason.split("\n")[0];
}
