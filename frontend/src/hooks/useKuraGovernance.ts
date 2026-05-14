import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract, useReadContract, useAccount } from "wagmi";
import { KURA_GOVERNANCE_ADDRESS, KURA_GOVERNANCE_ABI } from "@/config/contracts";
import { encryptBool } from "@/lib/fhe";

export type ProposalStatus = "Active" | "Passed" | "Failed" | "Cancelled";
const STATUS_LABELS: ProposalStatus[] = ["Active", "Passed", "Failed", "Cancelled"];

export interface Proposal {
  circleId: bigint;
  description: string;
  deadline: bigint;
  quorum: bigint;
  plainYesCount: bigint;
  plainTotalVotes: bigint;
  status: ProposalStatus;
  proposer: `0x${string}`;
}

export function useKuraGovernance() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");

  const { data: proposalCount } = useReadContract({
    address: KURA_GOVERNANCE_ADDRESS || undefined,
    abi: KURA_GOVERNANCE_ABI,
    functionName: "proposalCount",
    query: { enabled: !!KURA_GOVERNANCE_ADDRESS, refetchInterval: 10_000 },
  });

  /** Create a governance proposal */
  const createProposal = useCallback(async (
    circleId: bigint,
    description: string,
    durationSeconds: bigint,
    quorum: bigint
  ) => {
    if (!address) throw new Error("Wallet not connected");
    if (!KURA_GOVERNANCE_ADDRESS) throw new Error("KuraGovernance not deployed yet");
    setLoading(true);
    setStep("Creating proposal...");
    try {
      const hash = await writeContractAsync({
        address: KURA_GOVERNANCE_ADDRESS,
        abi: KURA_GOVERNANCE_ABI,
        functionName: "createProposal",
        args: [circleId, description, durationSeconds, quorum],
      });
      setStep("Proposal created");
      return hash;
    } finally {
      setLoading(false);
    }
  }, [address, writeContractAsync]);

  /** Submit an encrypted vote (true = yes, false = no) */
  const submitVote = useCallback(async (proposalId: bigint, vote: boolean) => {
    if (!publicClient || !walletClient || !address) throw new Error("Wallet not connected");
    if (!KURA_GOVERNANCE_ADDRESS) throw new Error("KuraGovernance not deployed yet");
    setLoading(true);
    setStep("Encrypting vote...");
    try {
      const encVote = await encryptBool(publicClient, walletClient, vote, setStep);
      setStep("Submitting vote...");
      const hash = await writeContractAsync({
        address: KURA_GOVERNANCE_ADDRESS,
        abi: KURA_GOVERNANCE_ABI,
        functionName: "submitVote",
        args: [proposalId, { ctHash: BigInt(encVote.ctHash), signature: encVote.signature }],
      });
      setStep("Vote submitted");
      return hash;
    } finally {
      setLoading(false);
    }
  }, [publicClient, walletClient, address, writeContractAsync]);

  /** Fetch proposal details */
  const getProposal = useCallback(async (proposalId: bigint): Promise<Proposal> => {
    if (!publicClient) throw new Error("Not connected");
    if (!KURA_GOVERNANCE_ADDRESS) throw new Error("KuraGovernance not deployed yet");
    const r = await publicClient.readContract({
      address: KURA_GOVERNANCE_ADDRESS,
      abi: KURA_GOVERNANCE_ABI,
      functionName: "getProposal",
      args: [proposalId],
    }) as [bigint, string, bigint, bigint, bigint, bigint, number, `0x${string}`];

    return {
      circleId: r[0],
      description: r[1],
      deadline: r[2],
      quorum: r[3],
      plainYesCount: r[4],
      plainTotalVotes: r[5],
      status: STATUS_LABELS[r[6]] ?? "Active",
      proposer: r[7],
    };
  }, [publicClient]);

  /** Check if connected address has voted on a proposal */
  const hasVoted = useCallback(async (proposalId: bigint): Promise<boolean> => {
    if (!publicClient || !address) throw new Error("Not connected");
    if (!KURA_GOVERNANCE_ADDRESS) throw new Error("KuraGovernance not deployed yet");
    const voted = await publicClient.readContract({
      address: KURA_GOVERNANCE_ADDRESS,
      abi: KURA_GOVERNANCE_ABI,
      functionName: "hasVoted",
      args: [proposalId, address],
    });
    return voted as boolean;
  }, [publicClient, address]);

  /** Cancel a proposal (proposer only) */
  const cancelProposal = useCallback(async (proposalId: bigint) => {
    if (!address) throw new Error("Wallet not connected");
    if (!KURA_GOVERNANCE_ADDRESS) throw new Error("KuraGovernance not deployed yet");
    setLoading(true);
    setStep("Cancelling proposal...");
    try {
      const hash = await writeContractAsync({
        address: KURA_GOVERNANCE_ADDRESS,
        abi: KURA_GOVERNANCE_ABI,
        functionName: "cancelProposal",
        args: [proposalId],
      });
      setStep("Cancelled");
      return hash;
    } finally {
      setLoading(false);
    }
  }, [address, writeContractAsync]);

  return {
    loading,
    step,
    proposalCount: proposalCount as bigint | undefined,
    createProposal,
    submitVote,
    getProposal,
    hasVoted,
    cancelProposal,
  };
}
