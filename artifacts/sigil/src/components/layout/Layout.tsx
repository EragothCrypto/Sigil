import { Link, useLocation } from 'wouter';
import { ChevronDown } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

const PRIMARY_TASKS = [
  { href: '/', label: 'Transaction check' },
  { href: '/solana', label: 'Wallet permissions' },
];
const TOOLS = [
  { href: '/approvals', label: 'Approval events' },
  { href: '/monitor', label: 'EVM wallet review' },
  { href: '/watchlist', label: 'Saved watchlist' },
  { href: '/sites', label: 'Website check' },
  { href: '/simulate', label: 'Read-only call check' },
  { href: '/history', label: 'Historical cases' },
  { href: '/extension', label: 'Browser extension' },
  { href: '/onboarding', label: 'Getting started' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const tools = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  useEffect(() => { if (tools.current) tools.current.open = false; }, [location]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (tools.current && !tools.current.contains(event.target as Node)) tools.current.open = false;
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  const secondaryActive = TOOLS.some(item => item.href === location);

  return <div className="min-h-screen bg-background text-foreground flex flex-col">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <Link href="/" aria-label="Sigil home" className="flex items-center gap-3 min-h-16 w-fit shrink-0">
          <img src={`${import.meta.env.BASE_URL}sigil-logo.png`} alt="" className="w-8 h-8 object-contain" />
          <span className="font-display font-bold text-xl">Sigil</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-stretch min-w-0 gap-1 pb-2 sm:py-2">
          {PRIMARY_TASKS.map(({ href, label }) => {
            const active = location === href || (href === '/' && location.startsWith('/analysis/'));
            return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
              className={`flex items-center justify-center min-h-11 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${active ? 'border-primary-text text-foreground bg-secondary' : 'border-transparent text-subtle hover:text-foreground hover:bg-card'}`}>
              {label}
            </Link>;
          })}
          <details ref={tools} className="relative" onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false;
          }} onKeyDown={event => {
            if (event.key === 'Escape' && tools.current?.open) { tools.current.open = false; summary.current?.focus(); }
          }}>
            <summary ref={summary} className={`list-none flex items-center justify-center min-h-11 gap-1 px-3 py-2 text-sm font-medium cursor-pointer border-b-2 hover:bg-card ${secondaryActive ? 'text-foreground border-primary-text' : 'text-subtle border-transparent'}`}>
              Tools <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain bg-card border border-border rounded-md shadow-lg p-2">
              {TOOLS.map(({ href, label }) => <Link key={href} href={href} aria-current={location === href ? 'page' : undefined}
                className={`flex items-center min-h-11 px-3 py-2 text-sm rounded-sm hover:bg-secondary hover:text-foreground ${location === href ? 'bg-secondary text-foreground' : 'text-subtle'}`}>
                {label}
              </Link>)}
            </div>
          </details>
        </nav>
      </div>
    </header>
    <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {children}
    </main>
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-subtle">
        <p>Copyright 2026 S3ntryLabs. Sigil provides security analysis, not financial advice.</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
          {[['/impressum', 'Impressum'], ['/privacy', 'Privacy'], ['/terms', 'Terms'], ['/cookies', 'Cookies']].map(([href, label]) =>
            <Link key={href} href={href} className="min-h-8 inline-flex items-center hover:text-foreground hover:underline">{label}</Link>)}
        </nav>
      </div>
    </footer>
  </div>;
}
