import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Lock, Eye, Cpu, Zap } from "lucide-react";

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

// FHE step icons: Lock=encrypting, Cpu=computing, Eye=decrypting, Zap=done
const FHE_ICONS = [Lock, Cpu, Eye, Zap];

export function ProgressStepper({
  stage,
  steps = STEPS_DEFAULT,
}: {
  stage: number;
  steps?: string[];
}) {
  return (
    <ol className="space-y-2.5">
      {steps.map((label, i) => {
        const done = i < stage;
        const active = i === stage;
        const StepIcon = FHE_ICONS[i % FHE_ICONS.length];
        return (
          <motion.li
            key={label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            className="flex items-center gap-3 text-xs font-mono"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={done ? "done" : active ? "active" : "idle"}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                  done
                    ? "bg-primary text-background"
                    : active
                      ? "border border-primary text-primary bg-primary/10"
                      : "border border-border/60 text-muted-foreground/40"
                }`}
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <StepIcon className={`h-3 w-3 ${active ? "animate-pulse" : ""}`} />
                )}
              </motion.span>
            </AnimatePresence>

            <span className={`flex-1 ${done || active ? "text-foreground" : "text-muted-foreground/50"}`}>
              {label}
            </span>

            {active && (
              <span className="inline-block h-1 w-16 rounded-full overflow-hidden bg-border/60">
                <motion.span
                  className="block h-full bg-primary rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              </span>
            )}

            {done && (
              <span className="text-[10px] font-mono text-primary/60">done</span>
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}
