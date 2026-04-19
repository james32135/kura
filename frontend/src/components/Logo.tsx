import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className}`} aria-label="KURA home">
      <motion.div
        className="relative h-10 w-10"
        whileHover={{ rotate: 6, scale: 1.05 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none">
          <defs>
            <linearGradient id="kuraGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="oklch(0.92 0.10 200)" />
              <stop offset="55%" stopColor="oklch(0.78 0.13 200)" />
              <stop offset="100%" stopColor="oklch(0.62 0.18 230)" />
            </linearGradient>
            <radialGradient id="kuraBg" cx="20" cy="20" r="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="oklch(0.78 0.13 200 / 0.25)" />
              <stop offset="100%" stopColor="oklch(0.78 0.13 200 / 0)" />
            </radialGradient>
          </defs>

          {/* Glow halo */}
          <circle cx="20" cy="20" r="19" fill="url(#kuraBg)" />

          {/* Orbital rings */}
          <motion.g
            style={{ transformOrigin: "20px 20px" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          >
            <circle cx="20" cy="20" r="17" stroke="url(#kuraGrad)" strokeWidth="0.6" opacity="0.35" strokeDasharray="2 4" />
          </motion.g>
          <motion.g
            style={{ transformOrigin: "20px 20px" }}
            animate={{ rotate: -360 }}
            transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
          >
            <circle cx="20" cy="20" r="13" stroke="url(#kuraGrad)" strokeWidth="0.5" opacity="0.4" strokeDasharray="1 3" />
          </motion.g>

          {/* K-graph: hub + 4 nodes */}
          <path
            d="M13 9v22 M13 20 L26 9 M13 20 L26 31"
            stroke="url(#kuraGrad)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Nodes */}
          <circle cx="13" cy="20" r="2.1" fill="oklch(0.92 0.10 200)" />
          <motion.circle
            cx="26" cy="9" r="1.8" fill="oklch(0.92 0.10 200)"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="26" cy="31" r="1.8" fill="oklch(0.92 0.10 200)"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <circle cx="13" cy="9" r="1.2" fill="oklch(0.92 0.10 200)" opacity="0.6" />
          <circle cx="13" cy="31" r="1.2" fill="oklch(0.92 0.10 200)" opacity="0.6" />
        </svg>

        {/* Hover glow */}
        <div className="absolute inset-0 rounded-full blur-2xl bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      </motion.div>

      <div className="flex flex-col leading-none">
        <span className="font-display font-bold text-lg tracking-[0.18em]">KURA</span>
        <span className="font-mono text-[8px] tracking-[0.3em] text-muted-foreground mt-0.5 uppercase">
          Encrypted · Together
        </span>
      </div>
    </Link>
  );
}
