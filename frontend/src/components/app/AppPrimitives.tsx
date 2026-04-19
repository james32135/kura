import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Check, Clock } from "lucide-react";

export function AppHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-display text-3xl md:text-4xl font-semibold tracking-tight">
        {title}
      </h1>
      {sub && <p className="mt-2 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? "border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent"
          : "border-border/60 bg-card/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <p className="mt-3 font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}

export function MemberRow({
  addr,
  status,
  you,
}: {
  addr: string;
  status: string;
  you?: boolean;
}) {
  const contributed = status === "contributed";
  return (
    <li className="flex items-center justify-between px-6 py-3 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-warm/30" />
        <span className="font-mono text-sm">{addr}</span>
        {you && (
          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest border border-primary/30 text-primary bg-primary/10">
            You
          </span>
        )}
      </div>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest border ${
          contributed
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-background/60 text-muted-foreground"
        }`}
      >
        {contributed ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
        {status}
      </span>
    </li>
  );
}

export function EncryptedValue({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
      className="mt-5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-4"
    >
      <p className="text-[10px] uppercase tracking-widest text-primary">{label}</p>
      <p className="mt-1 font-display text-2xl text-foreground">{value}</p>
    </motion.div>
  );
}

const STEPS_DEFAULT = ["Encrypting in browser", "Submitting to blockchain", "Verifying minimum", "Recorded"];

export function ProgressStepper({
  stage,
  steps = STEPS_DEFAULT,
}: {
  stage: number;
  steps?: string[];
}) {
  return (
    <ol className="space-y-2">
      {steps.map((label, i) => {
        const done = i < stage;
        const active = i === stage;
        return (
          <li key={label} className="flex items-center gap-3 text-xs font-mono">
            <span
              className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${
                done
                  ? "bg-primary text-background"
                  : active
                    ? "border border-primary text-primary"
                    : "border border-border text-muted-foreground"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={done || active ? "text-foreground" : "text-muted-foreground"}>
              {label}
            </span>
            {active && (
              <span className="ml-auto inline-block h-1 w-12 rounded-full overflow-hidden bg-border">
                <motion.span
                  className="block h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.9 }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
