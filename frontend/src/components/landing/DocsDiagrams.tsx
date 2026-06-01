import { motion } from "framer-motion";
import type { ReactNode } from "react";

type DiagramProps = { className?: string };

export function SystemArchitectureDiagram({ className }: DiagramProps) {
  const boxes = [
    { x: 40, y: 60, w: 120, h: 48, label: "CoFHE SDK" },
    { x: 200, y: 40, w: 110, h: 40, label: "KuraCircle" },
    { x: 200, y: 100, w: 110, h: 40, label: "KuraBid" },
    { x: 360, y: 40, w: 110, h: 40, label: "Governance" },
    { x: 360, y: 100, w: 110, h: 40, label: "StreamPay" },
    { x: 520, y: 70, w: 120, h: 48, label: "Threshold Net" },
  ];
  return (
    <DiagramFrame title="System Architecture" className={className}>
      <svg viewBox="0 0 680 180" className="w-full h-auto">
        {[
          [100, 84, 200, 60],
          [100, 84, 200, 120],
          [310, 60, 360, 60],
          [310, 120, 360, 120],
          [470, 94, 520, 94],
        ].map(([x1, y1, x2, y2], i) => (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="oklch(0.78 0.13 200 / 0.4)"
            strokeWidth={1.2}
            strokeDasharray="4 6"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
          />
        ))}
        {boxes.map((b, i) => (
          <g key={b.label}>
            <motion.rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={8}
              fill="oklch(0.16 0.02 220)"
              stroke="oklch(0.78 0.13 200 / 0.5)"
              strokeWidth={1}
              initial={{ opacity: 0, y: b.y + 8 }}
              whileInView={{ opacity: 1, y: b.y }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            />
            <text
              x={b.x + b.w / 2}
              y={b.y + b.h / 2 + 4}
              textAnchor="middle"
              style={{ fontSize: 10, fill: "oklch(0.96 0.005 220 / 0.9)", fontFamily: "JetBrains Mono" }}
            >
              {b.label}
            </text>
          </g>
        ))}
      </svg>
    </DiagramFrame>
  );
}

export function DataFlowDiagram({ className }: DiagramProps) {
  const steps = ["Encrypt", "Submit", "FHE Compute", "Permit / ACL", "Threshold Publish"];
  return (
    <DiagramFrame title="Data Flow" className={className}>
      <div className="flex flex-wrap items-center justify-center gap-2 py-4">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <motion.span
              className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-xs text-primary"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              {s}
            </motion.span>
            {i < steps.length - 1 && (
              <span className="text-muted-foreground text-xs">→</span>
            )}
          </div>
        ))}
      </div>
    </DiagramFrame>
  );
}

export function ContractGraphDiagram({ className }: DiagramProps) {
  const nodes = [
    { id: "circle", label: "KuraCircle", x: 340, y: 30 },
    { id: "bid", label: "KuraBid", x: 120, y: 100 },
    { id: "credit", label: "KuraCredit", x: 340, y: 100 },
    { id: "escrow", label: "EscrowAdapter", x: 560, y: 100 },
    { id: "gov", label: "Governance", x: 120, y: 180 },
    { id: "stream", label: "StreamPay", x: 340, y: 180 },
    { id: "registry", label: "MemberRegistry", x: 560, y: 180 },
  ];
  const edges: [string, string][] = [
    ["circle", "bid"],
    ["circle", "credit"],
    ["circle", "escrow"],
    ["circle", "gov"],
    ["circle", "stream"],
    ["circle", "registry"],
  ];
  const pos = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <DiagramFrame title="Contract Relationships" className={className}>
      <svg viewBox="0 0 680 240" className="w-full h-auto">
        {edges.map(([a, b], i) => {
          const from = pos[a];
          const to = pos[b];
          return (
            <motion.line
              key={`${a}-${b}`}
              x1={from.x}
              y1={from.y + 16}
              x2={to.x}
              y2={to.y - 16}
              stroke="oklch(0.78 0.13 200 / 0.35)"
              strokeWidth={1}
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            />
          );
        })}
        {nodes.map((n, i) => (
          <g key={n.id}>
            <motion.rect
              x={n.x - 52}
              y={n.y}
              width={104}
              height={32}
              rx={6}
              fill="oklch(0.16 0.02 220)"
              stroke="oklch(0.78 0.13 200 / 0.45)"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
            />
            <text
              x={n.x}
              y={n.y + 20}
              textAnchor="middle"
              style={{ fontSize: 9, fill: "oklch(0.96 0.005 220 / 0.85)", fontFamily: "JetBrains Mono" }}
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </DiagramFrame>
  );
}

export function GovernanceFlowDiagram({ className }: DiagramProps) {
  const steps = ["createProposal", "submitVote (ebool)", "FHE.select + FHE.add", "closeVoteBatch", "verifyDecryptResultBatch"];
  return (
    <DiagramFrame title="Governance Flow" className={className}>
      <ol className="space-y-2 py-2">
        {steps.map((s, i) => (
          <motion.li
            key={s}
            className="flex items-center gap-3 font-mono text-xs text-muted-foreground"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary text-[10px]">
              {i + 1}
            </span>
            {s}
          </motion.li>
        ))}
      </ol>
    </DiagramFrame>
  );
}

export function ContributionFlowDiagram({ className }: DiagramProps) {
  const steps = [
    "Wrap USDC → cUSDC",
    "encrypt(minContrib) via CoFHE",
    "contribute(circleId, InEuint64)",
    "FHE.gte + FHE.select (silent min check)",
    "FHE.add → encPoolBalance",
  ];
  return (
    <DiagramFrame title="Contribution Flow" className={className}>
      <ol className="space-y-2 py-2">
        {steps.map((s, i) => (
          <motion.li
            key={s}
            className="font-mono text-xs text-muted-foreground pl-4 border-l border-primary/30"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            {s}
          </motion.li>
        ))}
      </ol>
    </DiagramFrame>
  );
}

export function EscrowFlowDiagram({ className }: DiagramProps) {
  const steps = [
    "KuraConditionResolver checks encrypted credit tier",
    "KuraEscrowAdapter creates ConfidentialEscrow deal",
    "Winner self-claims via FHE.eq(eaddress)",
    "verifyDecryptResult on settlement amount",
  ];
  return (
    <DiagramFrame title="Escrow Flow" className={className}>
      <ol className="space-y-2 py-2">
        {steps.map((s, i) => (
          <motion.li
            key={s}
            className="font-mono text-xs text-muted-foreground pl-4 border-l border-warm/40"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            {s}
          </motion.li>
        ))}
      </ol>
    </DiagramFrame>
  );
}

export function DecryptionFlowDiagram({ className }: DiagramProps) {
  const steps = [
    "Contract calls FHE.allowPublic(handle)",
    "CoFHE threshold committee signs decryption",
    "Contract calls verifyDecryptResult(Batch)",
    "Plaintext available via getDecryptResultSafe",
  ];
  return (
    <DiagramFrame title="Threshold Decryption Flow" className={className}>
      <ol className="space-y-2 py-2">
        {steps.map((s, i) => (
          <motion.li
            key={s}
            className="font-mono text-xs text-muted-foreground pl-4 border-l border-primary/30"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            {s}
          </motion.li>
        ))}
      </ol>
    </DiagramFrame>
  );
}

function DiagramFrame({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border/50 bg-gradient-to-b from-surface/40 to-background/20 p-5 overflow-hidden ${className ?? ""}`}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-3">{title}</p>
      {children}
    </div>
  );
}
