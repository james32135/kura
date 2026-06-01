import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";

const NODES = [
  { id: "client", label: "CoFHE SDK", x: 80, y: 120, r: 36 },
  { id: "circle", label: "KuraCircle", x: 280, y: 80, r: 32 },
  { id: "bid", label: "KuraBid", x: 280, y: 200, r: 32 },
  { id: "gov", label: "Governance", x: 480, y: 80, r: 32 },
  { id: "vault", label: "Privacy Vault", x: 480, y: 200, r: 32 },
  { id: "threshold", label: "Threshold Net", x: 680, y: 140, r: 36 },
] as const;

const EDGES: [string, string][] = [
  ["client", "circle"],
  ["client", "bid"],
  ["circle", "gov"],
  ["circle", "vault"],
  ["gov", "threshold"],
  ["bid", "threshold"],
];

const POS = Object.fromEntries(NODES.map((n) => [n.id, n]));

export function ProtocolDiagram() {
  return (
    <Reveal>
      <div className="relative rounded-3xl border border-border/50 bg-gradient-to-b from-surface/50 to-background/30 p-6 md:p-10 overflow-hidden backdrop-blur-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <svg viewBox="0 0 760 280" className="w-full h-auto min-h-[200px]" fill="none">
          <defs>
            <linearGradient id="edgeGrad" x1="0" x2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.13 200 / 0)" />
              <stop offset="50%" stopColor="oklch(0.78 0.13 200 / 0.8)" />
              <stop offset="100%" stopColor="oklch(0.78 0.13 200 / 0)" />
            </linearGradient>
          </defs>
          {EDGES.map(([a, b], i) => {
            const from = POS[a];
            const to = POS[b];
            return (
              <g key={`${a}-${b}`}>
                <motion.line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="url(#edgeGrad)"
                  strokeWidth={1.5}
                  strokeDasharray="6 8"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                />
                <motion.circle
                  r={3}
                  fill="oklch(0.92 0.10 200)"
                  animate={{
                    cx: [from.x, to.x],
                    cy: [from.y, to.y],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    delay: 1 + i * 0.3,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                />
              </g>
            );
          })}
          {NODES.map((n, i) => (
            <g key={n.id}>
              <motion.circle
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill="oklch(0.16 0.02 220)"
                stroke="oklch(0.78 0.13 200 / 0.5)"
                strokeWidth={1.2}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
              />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                style={{ fontSize: 9, fill: "oklch(0.96 0.005 220 / 0.9)", fontFamily: "JetBrains Mono" }}
              >
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </Reveal>
  );
}
