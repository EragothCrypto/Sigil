import { Link, useLocation } from 'wouter';
import { Puzzle, ScanLine, History, Zap, ShieldCheck, ListChecks, Globe2, WalletCards } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Scanner', icon: ScanLine },
  { href: '/approvals', label: 'Approvals', icon: ShieldCheck },
  { href: '/monitor', label: 'Monitor', icon: WalletCards },
  { href: '/watchlist', label: 'Watchlist', icon: ListChecks },
  { href: '/sites', label: 'Sites', icon: Globe2 },
  { href: '/simulate', label: 'Simulate', icon: Zap, pulse: true },
  { href: '/history', label: 'Feed', icon: History },
  { href: '/extension', label: 'Extension', icon: Puzzle },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const logo = `${import.meta.env.BASE_URL}sigil-logo.png`;
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" style={{ animation: 'glow-pulse 8s ease-in-out infinite' }} />
        <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/8 blur-[100px]" style={{ animation: 'glow-pulse 10s ease-in-out infinite 2s' }} />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-primary/6 blur-[80px]" style={{ animation: 'glow-pulse 12s ease-in-out infinite 4s' }} />
      </div>

      {/* Header */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-500 ${
          scrolled
            ? 'bg-[rgba(6,4,15,0.85)] backdrop-blur-2xl border-b border-primary/10 shadow-[0_1px_0_rgba(139,92,246,0.08)]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group cursor-pointer shrink-0">
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 bg-primary/40 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-110" />
              <img src={logo} alt="Sigil" className="relative w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(139,92,246,0.5)] group-hover:drop-shadow-[0_0_12px_rgba(139,92,246,0.8)] transition-all duration-300" />
            </div>
            <span className="font-display font-bold text-xl tracking-[0.15em] text-white group-hover:text-primary transition-colors duration-200 uppercase">
              Sigil
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon, pulse }) => {
              const isActive = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group
                    ${isActive
                      ? 'bg-primary/12 text-primary border border-primary/20'
                      : 'text-white/50 hover:text-white/90 hover:bg-white/5 border border-transparent'
                    }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-primary' : 'text-white/30 group-hover:text-white/60'}`}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  <span className="tracking-wide hidden sm:inline">{label}</span>
                  {pulse && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                  )}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-[1px] h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col">
        {children}
      </main>

      <footer className="relative z-10 border-t border-white/6 bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/35">
          <p>© 2026 S3ntryLabs. Sigil provides security analysis, not financial advice.</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href="/impressum" className="hover:text-primary transition-colors">Impressum</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="/cookies" className="hover:text-primary transition-colors">Cookies</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
