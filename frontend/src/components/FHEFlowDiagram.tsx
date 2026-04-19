import { motion } from "framer-motion";
import { Reveal } from "./Reveal";

/**
 * Animated SVG diagram showing the KURA FHE pipeline:
 * Members → Encrypt (lock) → Pool (FHE.add) → Sealed Bid (FHE.min) → Credit (FHE.gte)
 * Pure SVG with stroke-dash + radial pulse animations.
 */
export function FHEFlowDiagram() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

      <div className="relative max-w-7xl mx-auto">
        <Reveal>
          <div className="inline-flex items-center gap-2">
            <span className="h-px w-8 bg-primary" />
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
              The Cipher Pipeline
            </span>
          </div>
          <h2 className="mt-4 font-display font-semibold text-4xl md:text-6xl tracking-tight max-w-3xl">
            One protocol. <span className="text-gradient-accent">Five encrypted moves.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground leading-relaxed">
            Watch a single round flow through the protocol. Every value travels as ciphertext,
            every comparison happens on encrypted data, every decision is verified without
            ever revealing a number.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-16 relative rounded-3xl border border-border/60 bg-gradient-to-b from-surface/40 to-background/20 p-6 md:p-12 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <FlowSvg />
          </div>
        </Reveal>

        {/* Legend */}
        <div className="mt-10 grid sm:grid-cols-3 gap-3">
          {[
            { c: "FHE.add()", t: "Sums encrypted contributions into the pool ciphertext." },
            { c: "FHE.min()", t: "Picks the lowest sealed bid without ever decrypting losers." },
            { c: "FHE.gte()", t: "Compares encrypted credit to a threshold — pass / fail only." },
          ].map((x, i) => (
            <Reveal key={x.c} delay={0.25 + i * 0.06}>
              <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
                <p className="font-mono text-sm text-primary">{x.c}</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{x.t}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FlowSvg() {
  // Node layout
  const nodes = [
    { id: "m1", x: 60, y: 80, label: "Member A" },
    { id: "m2", x: 60, y: 200, label: "Member B" },
    { id: "m3", x: 60, y: 320, label: "Member C" },
    { id: "enc", x: 280, y: 200, label: "Encrypt" },
    { id: "pool", x: 500, y: 200, label: "FHE.add" },
    { id: "bid", x: 720, y: 200, label: "FHE.min" },
    { id: "credit", x: 940, y: 200, label: "FHE.gte" },
  ] as const;

  const edges: Array<[string, string, number]> = [
    ["m1", "enc", 0],
    ["m2", "enc", 0.2],
    ["m3", "enc", 0.4],
    ["enc", "pool", 0.7],
    ["pool", "bid", 1.1],
    ["bid", "credit", 1.5],
  ];

  const N = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox="0 0 1040 400"
        className="w-full min-w-[820px] h-auto"
        fill="none"
      >
        <defs>
          <linearGradient id="edge" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="oklch(0.78 0.13 200 / 0)" />
            <stop offset="50%" stopColor="oklch(0.78 0.13 200 / 0.9)" />
            <stop offset="100%" stopColor="oklch(0.78 0.13 200 / 0)" />
          </linearGradient>
          <linearGradient id="ringGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="oklch(0.92 0.10 200)" />
            <stop offset="100%" stopColor="oklch(0.62 0.18 230)" />
          </linearGradient>
          <radialGradient id="nodeGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="oklch(0.78 0.13 200 / 0.7)" />
            <stop offset="100%" stopColor="oklch(0.78 0.13 200 / 0)" />
          </radialGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Edges with traveling pulse */}
        {edges.map(([from, to, delay], i) => {
          const a = N[from];
          const b = N[to];
          return (
            <g key={`${from}-${to}-${i}`}>
              {/* Static line */}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="oklch(0.78 0.13 200 / 0.18)"
                strokeWidth={1.2}
                strokeDasharray="4 6"
              />
              {/* Animated dash flow */}
              <motion.line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="url(#edge)"
                strokeWidth={1.6}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
              />
              {/* Traveling packet */}
              <motion.circle
                r={3}
                fill="oklch(0.92 0.10 200)"
                initial={{ cx: a.x, cy: a.y, opacity: 0 }}
                animate={{
                  cx: [a.x, b.x],
                  cy: [a.y, b.y],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 1.8,
                  delay: 1.5 + delay,
                  repeat: Infinity,
                  repeatDelay: 1.5,
                  ease: "easeInOut",
                }}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n, i) => (
          <g key={n.id}>
            {/* Outer pulse halo */}
            <motion.circle
              cx={n.x}
              cy={n.y}
              r={32}
              fill="url(#nodeGlow)"
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.1 * i }}
            />

            {/* Rotating ring (only for FHE op nodes) */}
            {(n.id === "enc" || n.id === "pool" || n.id === "bid" || n.id === "credit") && (
              <motion.circle
                cx={n.x}
                cy={n.y}
                r={28}
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth={0.8}
                strokeDasharray="3 5"
                opacity={0.5}
                style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                animate={{ rotate: n.id === "bid" ? -360 : 360 }}
                transition={{ duration: 14 + i * 2, repeat: Infinity, ease: "linear" }}
              />
            )}

            {/* Node disk */}
            <motion.circle
              cx={n.x}
              cy={n.y}
              r={22}
              fill="oklch(0.16 0.02 220)"
              stroke="oklch(0.78 0.13 200 / 0.6)"
              strokeWidth={1.2}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Icon glyph */}
            <NodeGlyph id={n.id} cx={n.x} cy={n.y} />

            {/* Label */}
            <text
              x={n.x}
              y={n.y + 48}
              textAnchor="middle"
              className="font-mono"
              style={{ fontSize: 10, fill: "oklch(0.96 0.005 220 / 0.85)", letterSpacing: "0.12em", textTransform: "uppercase" }}
            >
              {n.label}
            </text>

            {/* Sub-label for ops */}
            {(n.id === "enc" || n.id === "pool" || n.id === "bid" || n.id === "credit") && (
              <text
                x={n.x}
                y={n.y + 62}
                textAnchor="middle"
                style={{ fontSize: 8, fill: "oklch(0.78 0.13 200)", letterSpacing: "0.18em" }}
              >
                CIPHERTEXT
              </text>
            )}
          </g>
        ))}

        {/* Decorative floating ciphertext fragments */}
        {[
          { x: 380, y: 70, t: "0xa9f3..2c1" },
          { x: 620, y: 70, t: "0x71b5..ff8" },
          { x: 860, y: 70, t: "0xc04e..a3d" },
          { x: 380, y: 340, t: "FHE.add(c1,c2,c3)" },
          { x: 620, y: 340, t: "FHE.min(b1..bn)" },
          { x: 860, y: 340, t: "FHE.gte(s,T)" },
        ].map((f, i) => (
          <motion.text
            key={i}
            x={f.x}
            y={f.y}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 9, fill: "oklch(0.66 0.02 220)" }}
            initial={{ opacity: 0, y: f.y + 6 }}
            whileInView={{ opacity: 0.7, y: f.y }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 1 + i * 0.1 }}
          >
            {f.t}
          </motion.text>
        ))}
      </svg>
    </div>
  );
}

function NodeGlyph({ id, cx, cy }: { id: string; cx: number; cy: number }) {
  const stroke = "oklch(0.92 0.10 200)";
  if (id.startsWith("m")) {
    // Member: simple person
    return (
      <g transform={`translate(${cx - 6}, ${cy - 7})`}>
        <circle cx={6} cy={4} r={2.6} fill={stroke} />
        <path d="M1 14 C1 9, 11 9, 11 14" stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (id === "enc") {
    // Lock
    return (
      <g transform={`translate(${cx - 6}, ${cy - 7})`}>
        <rect x={1} y={6} width={10} height={8} rx={1.5} fill="none" stroke={stroke} strokeWidth={1.4} />
        <path d="M3 6 V4 a3 3 0 0 1 6 0 V6" fill="none" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" />
        <circle cx={6} cy={10} r={1} fill={stroke} />
      </g>
    );
  }
  if (id === "pool") {
    // Layered stacks (sum)
    return (
      <g transform={`translate(${cx - 7}, ${cy - 7})`}>
        <rect x={1} y={1} width={12} height={3} rx={0.6} fill="none" stroke={stroke} strokeWidth={1.2} />
        <rect x={1} y={6} width={12} height={3} rx={0.6} fill={stroke} opacity={0.4} />
        <rect x={1} y={11} width={12} height={3} rx={0.6} fill="none" stroke={stroke} strokeWidth={1.2} />
      </g>
    );
  }
  if (id === "bid") {
    // Gavel
    return (
      <g transform={`translate(${cx - 7}, ${cy - 7})`} stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round">
        <path d="M2 12 L8 6" />
        <path d="M5 3 L11 9" />
        <path d="M7 1 L13 7" />
        <path d="M1 14 H10" />
      </g>
    );
  }
  if (id === "credit") {
    // Shield-check
    return (
      <g transform={`translate(${cx - 6}, ${cy - 7})`} stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 1 L11 3 V8 C11 11, 8 13, 6 14 C4 13, 1 11, 1 8 V3 Z" />
        <path d="M3.5 7.5 L5.5 9.5 L8.5 6" />
      </g>
    );
  }
  return null;
}
