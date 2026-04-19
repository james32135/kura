import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface Props {
  value: string; // e.g. "$500B+", "1.2B", "14"
  duration?: number;
}

// Parses leading prefix (non-digit chars), the numeric portion, and suffix.
function parse(value: string) {
  const m = value.match(/^([^\d.-]*)([\d.,]+)(.*)$/);
  if (!m) return { prefix: "", num: 0, suffix: value, decimals: 0 };
  const prefix = m[1];
  const numStr = m[2].replace(/,/g, "");
  const num = parseFloat(numStr);
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
  return { prefix, num, suffix: m[3], decimals };
}

export function AnimatedCounter({ value, duration = 1800 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { prefix, num, suffix, decimals } = parse(value);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(num * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, num, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
