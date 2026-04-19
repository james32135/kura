import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { KURA_CIRCLE_ADDRESS, KURA_CIRCLE_ABI } from "@/config/contracts";

export type CircleInfoTuple = readonly [
  string, // admin
  bigint, // memberCount
  bigint, // maxMembers
  bigint, // currentRound
  bigint, // roundDeadline
  boolean, // active
  bigint, // totalRounds
  boolean // completed
];

export type MyCircle = {
  id: bigint;
  info: CircleInfoTuple;
  isAdmin: boolean;
  completed: boolean;
};

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

/// Enumerates all circles a wallet is a member of by multicalling
/// `isMember(i, addr)` and `getCircleInfo(i)` for i in [0, circleCount).
/// Cheap on-chain (multicall batched), refetches every 15s.
export function useMyCircles(address?: `0x${string}`) {
  const { data: circleCountRaw, refetch: refetchCount } = useReadContract({
    address: KURA_CIRCLE_ADDRESS,
    abi: KURA_CIRCLE_ABI,
    functionName: "circleCount",
    query: { refetchInterval: 15_000 },
  });

  const circleCount = (circleCountRaw as bigint | undefined) ?? 0n;
  const ids = useMemo(() => {
    const arr: bigint[] = [];
    for (let i = 0n; i < circleCount; i++) arr.push(i);
    return arr;
  }, [circleCount]);

  // Multicall isMember(i, addr) for every circle
  const memberContracts = useMemo(
    () =>
      address
        ? ids.map((id) => ({
            address: KURA_CIRCLE_ADDRESS,
            abi: KURA_CIRCLE_ABI,
            functionName: "isMember" as const,
            args: [id, address] as const,
          }))
        : [],
    [ids, address]
  );

  const infoContracts = useMemo(
    () =>
      ids.map((id) => ({
        address: KURA_CIRCLE_ADDRESS,
        abi: KURA_CIRCLE_ABI,
        functionName: "getCircleInfo" as const,
        args: [id] as const,
      })),
    [ids]
  );

  const { data: memberData, refetch: refetchMembers, isLoading: loadingMembers } = useReadContracts({
    contracts: memberContracts,
    allowFailure: true,
    query: { enabled: !!address && ids.length > 0, refetchInterval: 15_000 },
  });

  const { data: infoData, refetch: refetchInfo, isLoading: loadingInfo } = useReadContracts({
    contracts: infoContracts,
    allowFailure: true,
    query: { enabled: ids.length > 0, refetchInterval: 15_000 },
  });

  const circles = useMemo<MyCircle[]>(() => {
    if (!address || !memberData || !infoData) return [];
    const out: MyCircle[] = [];
    for (let i = 0; i < ids.length; i++) {
      const isMem = memberData[i]?.result === true;
      if (!isMem) continue;
      const info = infoData[i]?.result as CircleInfoTuple | undefined;
      if (!info || info[0] === ZERO_ADDR) continue;
      out.push({
        id: ids[i],
        info,
        isAdmin: info[0].toLowerCase() === address.toLowerCase(),
        completed: info[7] === true,
      });
    }
    return out;
  }, [address, memberData, infoData, ids]);

  const refetch = () => {
    refetchCount();
    refetchMembers();
    refetchInfo();
  };

  return {
    circles,
    circleCount,
    loading: loadingMembers || loadingInfo,
    refetch,
  };
}
