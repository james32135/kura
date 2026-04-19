import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { KURA_CIRCLE_ADDRESS, KURA_CIRCLE_ABI, KURA_BID_ADDRESS, KURA_BID_ABI } from "@/config/contracts";

/**
 * EncryptedOrb — animated SVG orb that pulses encrypted ciphertext fragments.
 * Used as the hero visual for encrypted state across the dashboard.
 */
export function EncryptedOrb({ size = 220, label = "ciphertext" }: { size?: number; label?: string }) {
  const [hash, setHash] = useState("0xa9f3b21e7c54...");

  // Cycle through fake ciphertext fragments to feel "live"
  useEffect(() => {
    const chars = "0123456789abcdef";
    const id = setInterval(() => {
      let h = "0x";
      for (let i = 0; i < 12; i++) h += chars[Math.floor(Math.random() * 16)];
      setHash(h + "...");
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 220 220" width={size} height={size} className="absolute inset-0">
        <defs>
          <radialGradient id="orbCore" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="oklch(0.92 0.10 200 / 0.55)" />
            <stop offset="55%" stopColor="oklch(0.62 0.18 230 / 0.18)" />
            <stop offset="100%" stopColor="oklch(0.62 0.18 230 / 0)" />
          </radialGradient>
          <linearGradient id="orbRing" x1="0" x2="1">
            <stop offset="0%" stopColor="oklch(0.92 0.10 200)" />
            <stop offset="100%" stopColor="oklch(0.62 0.18 230)" />
          </linearGradient>
        </defs>

        {/* Glow */}
        <circle cx="110" cy="110" r="90" fill="url(#orbCore)" />

        {/* Outer rotating ring */}
        <motion.g
          style={{ transformOrigin: "110px 110px" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        >
          <circle cx="110" cy="110" r="92" fill="none" stroke="url(#orbRing)" strokeWidth="0.8" strokeDasharray="2 6" opacity="0.5" />
          <circle cx="110" cy="18" r="2.4" fill="oklch(0.92 0.10 200)" />
        </motion.g>

        {/* Mid ring */}
        <motion.g
          style={{ transformOrigin: "110px 110px" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          <circle cx="110" cy="110" r="74" fill="none" stroke="url(#orbRing)" strokeWidth="0.6" strokeDasharray="1 4" opacity="0.55" />
          <circle cx="184" cy="110" r="1.8" fill="oklch(0.92 0.10 200)" opacity="0.7" />
          <circle cx="36" cy="110" r="1.8" fill="oklch(0.92 0.10 200)" opacity="0.7" />
        </motion.g>

        {/* Inner pulsing orb */}
        <motion.circle
          cx="110"
          cy="110"
          r="46"
          fill="oklch(0.16 0.02 220)"
          stroke="url(#orbRing)"
          strokeWidth="1.2"
          animate={{ r: [46, 49, 46] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Inner halo */}
        <motion.circle
          cx="110"
          cy="110"
          r="56"
          fill="none"
          stroke="oklch(0.78 0.13 200)"
          strokeWidth="0.5"
          opacity={0.4}
          animate={{ r: [50, 70, 50], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }}
        />

        {/* Lock glyph */}
        <g transform="translate(96, 92)" stroke="oklch(0.92 0.10 200)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="12" width="24" height="18" rx="3" fill="oklch(0.78 0.13 200 / 0.08)" />
          <path d="M7 12 V8 a7 7 0 0 1 14 0 V12" />
          <circle cx="14" cy="22" r="2" fill="oklch(0.92 0.10 200)" stroke="none" />
        </g>

        {/* Floating fragments */}
        {[
          { x: 30, y: 50, t: "private" },
          { x: 178, y: 60, t: "hidden" },
          { x: 24, y: 170, t: "0x9af2..b3c5" },
          { x: 180, y: 174, t: "encrypted" },
        ].map((f, i) => (
          <motion.text
            key={i}
            x={f.x}
            y={f.y}
            className="font-mono"
            style={{ fontSize: 8, fill: "oklch(0.66 0.02 220)" }}
            animate={{ opacity: [0.3, 0.9, 0.3], y: [f.y, f.y - 4, f.y] }}
            transition={{ duration: 4, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {f.t}
          </motion.text>
        ))}
      </svg>

      {/* Live hash readout */}
      <div className="relative z-10 mt-[180px] text-center pointer-events-none">
        <motion.p
          key={hash}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-mono text-[10px] text-muted-foreground tracking-wider"
        >
          {hash}
        </motion.p>
        <p className="text-[9px] uppercase tracking-[0.3em] text-primary mt-1">{label}</p>
      </div>
    </div>
  );
}

/**
 * LiveActivityFeed — shows recent real on-chain events from KuraCircle and KuraBid contracts.
 */
export function LiveActivityFeed() {
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<Array<{ id: number; t: string; addr: string; kind: "contribute" | "bid" | "join" | "round" }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    async function fetchEvents() {
      try {
        const blockNumber = await publicClient!.getBlockNumber();
        const fromBlock = blockNumber > 5000n ? blockNumber - 5000n : 0n;

        const [circleLogs, bidLogs] = await Promise.all([
          publicClient!.getLogs({
            address: KURA_CIRCLE_ADDRESS,
            fromBlock,
            toBlock: "latest",
          }),
          publicClient!.getLogs({
            address: KURA_BID_ADDRESS,
            fromBlock,
            toBlock: "latest",
          }),
        ]);

        // Parse event signatures to identify event types
        const CONTRIB_SIG = "0x" + "ContributionMade".length.toString(16); // fallback
        const allLogs = [...circleLogs, ...bidLogs]
          .sort((a, b) => Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n)))
          .slice(0, 10);

        const now = Math.floor(Date.now() / 1000);
        const parsed: typeof events = [];

        for (const log of allLogs) {
          const topic0 = log.topics[0] ?? "";
          const addr = log.address;
          const shortAddr = `${addr.slice(0, 6)}…${addr.slice(-4)}`;

          // Determine event type from topic hash
          let kind: "contribute" | "bid" | "join" | "round" = "contribute";
          // MemberJoined topic
          if (topic0 === "0x" + "b8f1b14c7cdf51cb72b81e04de0f78a20da9c318b51a1760f4baa71786e1ed4a") kind = "join";
          // BidSubmitted topic
          else if (log.address.toLowerCase() === KURA_BID_ADDRESS.toLowerCase()) kind = "bid";
          // RoundStarted
          else if (topic0.startsWith("0x")) kind = log.topics.length >= 2 ? "contribute" : "round";

          let timeAgo = "recent";
          if (log.blockNumber) {
            const blocksDiff = Number(blockNumber - log.blockNumber);
            const secondsAgo = blocksDiff * 2; // ~2s per block on Arb
            if (secondsAgo < 60) timeAgo = `${secondsAgo}s`;
            else if (secondsAgo < 3600) timeAgo = `${Math.floor(secondsAgo / 60)}m`;
            else timeAgo = `${Math.floor(secondsAgo / 3600)}h`;
          }

          // Extract address from event data if available
          let eventAddr = shortAddr;
          if (log.data && log.data.length >= 66) {
            const addrFromData = "0x" + log.data.slice(26, 66);
            if (addrFromData.length === 42) {
              eventAddr = `${addrFromData.slice(0, 6)}…${addrFromData.slice(-4)}`;
            }
          }

          parsed.push({
            id: Number(log.blockNumber ?? 0n) * 1000 + parsed.length,
            t: timeAgo,
            addr: eventAddr,
            kind,
          });
        }

        if (!cancelled) {
          setEvents(parsed.length > 0 ? parsed.slice(0, 5) : []);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    }

    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // refresh every 30s
    return () => { cancelled = true; clearInterval(interval); };
  }, [publicClient]);

  const labels: Record<string, { l: string; c: string }> = {
    contribute: { l: "encrypted contribution", c: "text-primary" },
    bid: { l: "sealed bid", c: "text-warm" },
    join: { l: "joined circle", c: "text-muted-foreground" },
    round: { l: "round started", c: "text-primary" },
  };

  if (loaded && events.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        No on-chain events yet. Create a circle to get started.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((e, i) => (
        <motion.li
          key={e.id}
          initial={i === 0 ? { opacity: 0, x: -12 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40 bg-background/40"
        >
          <span className="relative flex h-2 w-2">
            {i === 0 && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${i === 0 ? "bg-primary" : "bg-muted-foreground/40"}`} />
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">{e.addr}</span>
          <span className={`text-[11px] ${labels[e.kind].c}`}>{labels[e.kind].l}</span>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/70">{e.t}</span>
        </motion.li>
      ))}
    </ul>
  );
}

/**
 * RoundProgressRing — circular progress ring with encrypted-pool aesthetic.
 */
export function RoundProgressRing({
  current,
  total,
  size = 140,
}: {
  current: number;
  total: number;
  size?: number;
}) {
  const r = 60;
  const c = 2 * Math.PI * r;
  const safeTot = total > 0 ? total : 1;
  const pct = Math.min(1, Math.max(0, current / safeTot));

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 140 140" width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringP" x1="0" x2="1">
            <stop offset="0%" stopColor="oklch(0.92 0.10 200)" />
            <stop offset="100%" stopColor="oklch(0.62 0.18 230)" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={r} stroke="oklch(0.96 0.005 220 / 0.08)" strokeWidth="6" fill="none" />
        <motion.circle
          cx="70"
          cy="70"
          r="60"
          stroke="url(#ringP)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-3xl tabular-nums">{current}<span className="text-muted-foreground text-base">/{total}</span></p>
        <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mt-0.5">Round</p>
      </div>
    </div>
  );
}

/**
 * CipherWave — full-width animated wave of "encrypted" bars to suggest live FHE traffic.
 */
export function CipherWave({ bars = 48, height = 56 }: { bars?: number; height?: number }) {
  return (
    <div className="flex items-end justify-between gap-[2px] w-full" style={{ height }}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className="flex-1 rounded-full bg-gradient-to-t from-primary/30 to-primary/80"
          animate={{ height: [`${20 + (i * 7) % 60}%`, `${30 + (i * 13) % 70}%`, `${20 + (i * 7) % 60}%`] }}
          transition={{
            duration: 2.4 + (i % 5) * 0.3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: (i % 8) * 0.08,
          }}
        />
      ))}
    </div>
  );
}
