import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, Crown, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCircle } from "@/context/CircleContext";

export function CirclePicker() {
  const { selectedCircleId, setSelectedCircleId, myCircles, loadingMyCircles } = useCircle();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const selected = myCircles.find((c) => c.id === selectedCircleId);
  const round = selected ? Number(selected.info[3]) : 0;
  const total = selected ? Number(selected.info[6]) : 0;
  const status = selected
    ? selected.completed
      ? "Completed"
      : selected.info[5]
        ? "Active"
        : "Waiting"
    : "—";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-background/40 hover:bg-white/[0.03] transition text-left"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">Active Circle</p>
          <p className="font-display text-sm tabular-nums truncate">
            {loadingMyCircles && myCircles.length === 0
              ? "Loading…"
              : selected
                ? <>Circle #{selected.id.toString()} · <span className="text-muted-foreground">R{round}/{total}</span></>
                : "None — join one"}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {selected && (
        <p className="mt-1 px-1 text-[10px] font-mono text-muted-foreground/70">
          Status: <span className={selected.completed ? "text-primary" : "text-foreground"}>{status}</span>
          {selected.isAdmin && <span className="ml-2 text-primary">· Admin</span>}
        </p>
      )}

      {open && (
        <div className="absolute z-50 mt-2 left-0 right-0 rounded-xl border border-border/60 bg-surface/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {myCircles.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                You haven't joined any circles yet.
              </div>
            ) : (
              myCircles.map((c) => {
                const r = Number(c.info[3]);
                const t = Number(c.info[6]);
                const active = c.id === selectedCircleId;
                return (
                  <button
                    key={c.id.toString()}
                    onClick={() => {
                      setSelectedCircleId(c.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/[0.05] transition ${active ? "bg-primary/10" : ""}`}
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-display tabular-nums truncate">
                        Circle #{c.id.toString()}
                        {c.isAdmin && <Crown className="inline h-3 w-3 text-primary ml-1.5 -mt-0.5" />}
                        {c.completed && <CheckCircle2 className="inline h-3 w-3 text-primary ml-1.5 -mt-0.5" />}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Round {r}/{t} · {Number(c.info[1])}/{Number(c.info[2])} members
                      </p>
                    </div>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
          <Link
            to="/app/circles"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-primary border-t border-border/40 hover:bg-primary/5 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Manage circles…</span>
          </Link>
        </div>
      )}
    </div>
  );
}
