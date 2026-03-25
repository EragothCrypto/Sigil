import { Link } from 'wouter';
import { Shield } from 'lucide-react';
import React from 'react';

export function Layout({ children }: { children: React.ReactNode }) {
  const heroBg = `${import.meta.env.BASE_URL}images/hero-bg.png`;
  const logo = `${import.meta.env.BASE_URL}images/sigil-logo.png`;

  return (
    <div 
      className="min-h-screen bg-background text-foreground bg-cover bg-center bg-fixed bg-no-repeat selection:bg-primary/30"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      <div className="min-h-screen bg-background/85 backdrop-blur-[2px] flex flex-col">
        <header className="border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/40 transition-colors opacity-0 group-hover:opacity-100" />
                <img src={logo} alt="Sigil Logo" className="w-10 h-10 rounded-xl border border-white/10 group-hover:border-primary/50 relative z-10 transition-all shadow-lg" />
              </div>
              <span className="font-display font-bold text-2xl tracking-widest text-white group-hover:text-primary transition-colors">SIGIL</span>
            </Link>
            <nav className="flex items-center gap-8">
              <Link href="/" className="text-sm font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer uppercase tracking-wider">Scanner</Link>
              <Link href="/history" className="text-sm font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer uppercase tracking-wider">Global Feed</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
