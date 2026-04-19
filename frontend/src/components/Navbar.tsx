import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Logo } from "./Logo";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const links = [
  { to: "/", label: "Home" },
  { to: "/app", label: "App" },
  { to: "/docs", label: "Docs" },
];

export function Navbar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(96vw,1100px)]"
    >
      <nav className="relative flex items-center justify-between px-3 py-2 rounded-full border border-border/60 bg-background/55 backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.7)]">
        <div className="pl-3">
          <Logo />
        </div>
        <ul className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className="px-4 py-2 text-sm rounded-full text-muted-foreground hover:text-foreground transition-colors data-[status=active]:text-foreground data-[status=active]:bg-white/5"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <ConnectButton
          chainStatus="icon"
          showBalance={false}
          accountStatus="address"
        />
      </nav>
    </motion.header>
  );
}
