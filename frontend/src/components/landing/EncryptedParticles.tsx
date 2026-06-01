import { motion } from "framer-motion";
import { useMemo } from "react";

const FRAGMENTS = ["euint64", "ebool", "eaddress", "0x7a3f…", "FHE.add", "InEuint64", "⊕", "∎"];

export function EncryptedParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 3,
        delay: Math.random() * 4,
        duration: 12 + Math.random() * 8,
        text: FRAGMENTS[i % FRAGMENTS.length],
        opacity: 0.15 + Math.random() * 0.35,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute font-mono text-[9px] text-primary/60 select-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, opacity: p.opacity }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.sin(p.id) * 12, 0],
            opacity: [p.opacity * 0.5, p.opacity, p.opacity * 0.5],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {p.text}
        </motion.span>
      ))}
    </div>
  );
}
