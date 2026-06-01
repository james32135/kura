export function SectionLabel({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "warm";
}) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <span
        className={`h-px w-10 ${tone === "warm" ? "bg-warm" : "bg-primary"}`}
        aria-hidden
      />
      <span
        className={`font-mono text-[11px] uppercase tracking-[0.32em] ${
          tone === "warm" ? "text-warm" : "text-primary"
        }`}
      >
        {children}
      </span>
    </div>
  );
}
