import { Link } from "wouter";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-8">
      <div className="space-y-3">
        <p
          className="text-[7rem] md:text-[9rem] font-display font-black leading-none text-transparent bg-clip-text"
          style={{ backgroundImage: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a855f7 100%)' }}
        >
          404
        </p>
        <h1 className="text-2xl font-display font-bold text-white/50">Signal lost</h1>
        <p className="text-sm text-white/25 max-w-xs mx-auto leading-relaxed">
          The page you're looking for doesn't exist in the registry.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-display font-bold text-sm text-white uppercase tracking-wider transition-all"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)' }}
      >
        <Home className="w-4 h-4" />
        Back to Scanner
      </Link>
    </div>
  );
}
