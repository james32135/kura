import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard,
  CircleDollarSign,
  Gavel,
  Shield,
  Settings,
  ChevronLeft,
  Zap,
  Lock,
  HelpCircle,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBlockNumber } from "wagmi";
import { CircleProvider, useCircle } from "@/context/CircleContext";
import { CirclePicker } from "@/components/CirclePicker";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "App — KURA" },
      { name: "description", content: "KURA dApp dashboard: manage your encrypted savings circle." },
      { property: "og:title", content: "App — KURA" },
      { property: "og:description", content: "KURA dApp dashboard." },
    ],
  }),
  component: AppLayout,
});

interface NavEntry {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  group: string;
  adminOnly?: boolean;
}

const nav: NavEntry[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true, group: "Overview" },
  { to: "/app/circles", label: "My Circles", icon: Layers, exact: false, group: "Overview" },
  { to: "/app/contribute", label: "Contribute", icon: CircleDollarSign, exact: false, group: "Circle" },
  { to: "/app/bid", label: "Bid for Pool", icon: Gavel, exact: false, group: "Circle" },
  { to: "/app/credit", label: "Reputation", icon: Shield, exact: false, group: "Circle" },
  { to: "/app/admin", label: "Manage Circle", icon: Settings, exact: false, group: "Admin", adminOnly: true },
];

function AppLayout() {
  return (
    <CircleProvider>
      <AppLayoutInner />
    </CircleProvider>
  );
}

function AppLayoutInner() {
  const loc = useLocation();
  const { address } = useAccount();
  const { myCircles, selectedCircleId } = useCircle();

  const selected = myCircles.find((c) => c.id === selectedCircleId);
  const circleAdmin = selected?.info[0]?.toLowerCase() ?? null;
  const isAdmin = address && circleAdmin ? address.toLowerCase() === circleAdmin : false;
  // Show admin nav whenever wallet is admin of any circle, or if there are no circles yet
  const isAdminOfAny = address ? myCircles.some((c) => c.isAdmin) : false;
  const noCircleYet = myCircles.length === 0;

  const visibleNav = nav.filter((n) => !n.adminOnly || isAdmin || isAdminOfAny || noCircleYet);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-primary/[0.06] blur-3xl" />
        <div className="absolute top-1/2 -right-40 h-[420px] w-[420px] rounded-full bg-warm/[0.04] blur-3xl" />
      </div>

      <aside className="md:w-72 md:fixed md:inset-y-0 md:left-0 border-b md:border-b-0 md:border-r border-border/60 bg-surface/50 backdrop-blur-xl flex flex-col z-30">
        <div className="px-5 py-5 flex items-center justify-between border-b border-border/40">
          <Logo />
          <Link to="/" className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
            <ChevronLeft className="h-3.5 w-3.5" /> Site
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-2 px-5 py-3 border-b border-border/40">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Arb Sepolia</span>
          <BlockTicker />
        </div>

        <div className="hidden md:block px-3 mt-3">
          <CirclePicker />
        </div>

        <nav className="px-3 mt-3 flex md:flex-col gap-0.5 overflow-x-auto pb-3 md:pb-0">
          <div className="flex md:hidden gap-1">
            {visibleNav.map((n) => <NavItem key={n.to} item={n} loc={loc} mobile />)}
          </div>
          <div className="hidden md:block">
            {Object.entries(
              visibleNav.reduce<Record<string, NavEntry[]>>((acc, n) => {
                (acc[n.group] ||= []).push(n);
                return acc;
              }, {}),
            ).map(([group, items]) => (
              <div key={group} className="mb-4">
                <p className="px-3 mb-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">{group}</p>
                <div className="flex flex-col gap-0.5">
                  {items.map((n) => <NavItem key={n.to} item={n} loc={loc} />)}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="hidden md:block px-3 mt-2">
          <a href="https://docs.fhenix.zone" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition">
            <HelpCircle className="h-4 w-4" />
            <span>What is FHE?</span>
          </a>
        </div>

        <div className="hidden md:block mt-auto px-4 pb-4 space-y-3">
          <div className="rounded-xl border border-border/50 bg-background/40 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Lock className="h-3 w-3" /> Protocol
              </div>
              <Zap className="h-3 w-3 text-primary" />
            </div>
            <p className="mt-1 font-display text-sm tabular-nums text-muted-foreground">Encrypted Savings Circle</p>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Arb Sepolia
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-background/60 to-background/30 p-4">
            <ConnectButton chainStatus="icon" showBalance={false} accountStatus="full" />
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-72 min-h-screen relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="p-6 md:p-10 max-w-6xl mx-auto pb-24 md:pb-10"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-surface/80 backdrop-blur-xl">
        <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
          {visibleNav.slice(0, 5).map((n) => (
            <MobileNavItem key={n.to} item={n} loc={loc} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavItem({ item, loc, mobile }: { item: NavEntry; loc: ReturnType<typeof useLocation>; mobile?: boolean }) {
  const active = item.exact ? loc.pathname === item.to : loc.pathname.startsWith(item.to);
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact }}
      className={`relative flex-shrink-0 group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${active ? "bg-gradient-to-r from-primary/15 to-primary/5 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"} ${mobile ? "" : "border border-transparent"}`}
    >
      {active && !mobile && (
        <motion.span layoutId="nav-active-bar" className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary shadow-[0_0_12px_oklch(0.78_0.13_200_/_0.7)]" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
      )}
      <item.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
      <span className="flex-1">{item.label}</span>
      {active && !mobile && <span className="text-[9px] font-mono text-primary opacity-70">●</span>}
    </Link>
  );
}

function MobileNavItem({ item, loc }: { item: NavEntry; loc: ReturnType<typeof useLocation> }) {
  const active = item.exact ? loc.pathname === item.to : loc.pathname.startsWith(item.to);
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact }}
      className="flex flex-col items-center gap-1 px-3 py-1.5 min-w-[52px] rounded-xl transition"
    >
      <div className={`relative flex items-center justify-center h-9 w-9 rounded-xl transition ${active ? "bg-primary/15" : "bg-transparent"}`}>
        {active && (
          <motion.div
            layoutId="mobile-nav-active"
            className="absolute inset-0 rounded-xl bg-primary/15"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <item.icon className={`h-5 w-5 relative z-10 ${active ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <span className={`text-[10px] font-medium tracking-wide ${active ? "text-primary" : "text-muted-foreground"}`}>
        {item.label.split(" ")[0]}
      </span>
    </Link>
  );
}

function BlockTicker() {
  const [mounted, setMounted] = useState(false);
  const { data: blockNumber } = useBlockNumber({ watch: true });
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="font-mono text-[10px] text-primary tabular-nums">#…</span>;
  return (
    <motion.span key={blockNumber ? Number(blockNumber) : 0} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-[10px] text-primary tabular-nums">
      #{blockNumber ? Number(blockNumber).toLocaleString() : "…"}
    </motion.span>
  );
}
