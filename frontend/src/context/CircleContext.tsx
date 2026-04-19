import { createContext, useContext, useEffect, useState, useMemo, ReactNode, useCallback } from "react";
import { useAccount } from "wagmi";
import { useMyCircles, type MyCircle } from "@/hooks/useMyCircles";

type CircleContextValue = {
  selectedCircleId: bigint;
  setSelectedCircleId: (id: bigint) => void;
  myCircles: MyCircle[];
  loadingMyCircles: boolean;
  refetchMyCircles: () => void;
  circleCount: bigint;
};

const Ctx = createContext<CircleContextValue | null>(null);

const STORAGE_KEY = (addr?: string) => `kura.selectedCircleId.${(addr ?? "anon").toLowerCase()}`;

export function CircleProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const { circles, loading, refetch, circleCount } = useMyCircles(address);
  const [selectedCircleId, setSelectedRaw] = useState<bigint>(0n);

  // Load persisted selection per wallet
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY(address));
      if (saved !== null) setSelectedRaw(BigInt(saved));
      else setSelectedRaw(0n);
    } catch {
      setSelectedRaw(0n);
    }
  }, [address]);

  // If selected circle isn't in the user's set, fall back to first owned
  useEffect(() => {
    if (loading || circles.length === 0) return;
    const exists = circles.some((c) => c.id === selectedCircleId);
    if (!exists) setSelectedRaw(circles[0].id);
  }, [circles, selectedCircleId, loading]);

  const setSelectedCircleId = useCallback(
    (id: bigint) => {
      setSelectedRaw(id);
      try {
        window.localStorage.setItem(STORAGE_KEY(address), id.toString());
      } catch {}
    },
    [address]
  );

  const value = useMemo<CircleContextValue>(
    () => ({
      selectedCircleId,
      setSelectedCircleId,
      myCircles: circles,
      loadingMyCircles: loading,
      refetchMyCircles: refetch,
      circleCount: circleCount ?? 0n,
    }),
    [selectedCircleId, setSelectedCircleId, circles, loading, refetch, circleCount]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCircle() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCircle must be used inside <CircleProvider>");
  return ctx;
}
