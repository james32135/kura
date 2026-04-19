import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Github, BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative border-t border-border/60 mt-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="max-w-md">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Encrypted community savings circles. Built on Fully Homomorphic Encryption so
              every contribution, bid, and credit score stays private — by design, not by promise.
            </p>
            <p className="mt-6 font-display text-base">Save Together. Know Nothing.</p>
          </div>
          <div className="grid grid-cols-3 gap-10 text-sm">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Product</p>
              <Link to="/app" className="block text-foreground/80 hover:text-foreground">App</Link>
              <Link to="/docs" className="block text-foreground/80 hover:text-foreground">Docs</Link>
            </div>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Resources</p>
              <Link to="/docs" className="flex items-center gap-1.5 text-foreground/80 hover:text-foreground"><BookOpen className="h-3.5 w-3.5" />Documentation</Link>
              <a href="https://github.com/james32135/kura" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-foreground/80 hover:text-foreground"><Github className="h-3.5 w-3.5" />GitHub</a>
            </div>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Network</p>
              <p className="text-foreground/80">Arbitrum Sepolia</p>
              <p className="text-foreground/80">Fhenix CoFHE</p>
            </div>
          </div>
        </div>
        <div className="mt-14 pt-6 border-t border-border/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} KURA Protocol. All rights reserved.</p>
          <p className="font-mono">v2.0.0 · arb-sepolia</p>
        </div>
      </div>
    </footer>
  );
}
