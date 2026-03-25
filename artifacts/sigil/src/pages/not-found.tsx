import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="relative">
         <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full" />
         <AlertTriangle className="w-24 h-24 text-destructive relative z-10" />
      </div>
      <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight">404 - Signal Lost</h1>
      <p className="text-muted-foreground font-mono text-lg max-w-md">The requested endpoint does not exist in the operational registry.</p>
      
      <Link href="/" className="inline-block mt-8 px-8 py-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/50 shadow-[0_0_15px_rgba(0,229,255,0.1)] rounded-xl font-mono uppercase tracking-widest font-bold transition-all cursor-pointer">
        Return to Scanner
      </Link>
    </div>
  );
}
