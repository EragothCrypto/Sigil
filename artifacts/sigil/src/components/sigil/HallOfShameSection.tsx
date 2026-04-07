import { Link } from 'wouter';
import { Flame, ArrowRight, ExternalLink, Skull } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGetHallOfShame } from '@workspace/api-client-react';
import type { AnalysisRecord } from '@workspace/api-client-react';

function truncateAddress(addr: string) {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function parseLabel(label: string): { name: string; amount: string | null } {
  const parts = label.split(' · ');
  return { name: parts[0] ?? label, amount: parts[1] ?? null };
}

const VECTOR_ICONS: Record<string, string> = {
  "Safe multisig UI manipulation": "🔑",
  "Validator private key compromise": "🗝️",
  "Crypto mixing / money laundering": "🌪️",
  "Signature verification bypass": "✍️",
  "Merkle root initialization bug": "🌳",
  "Flash loan / health-check bypass": "⚡",
};

function AttackerBadge({ record }: { record: AnalysisRecord }) {
  const details = record as AnalysisRecord & { hallOfShameAmountUsd?: string; hallOfShameAttacker?: string; hallOfShameVector?: string };
  const det = details as Record<string, unknown>;
  const detailsObj = det as { details?: Record<string, unknown> };
  const info = detailsObj.details as { hallOfShameAmountUsd?: string; hallOfShameAttacker?: string; hallOfShameVector?: string; hallOfShameYear?: string } | undefined;
  return info ? (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {info.hallOfShameYear && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-white/40">
          {info.hallOfShameYear}
        </span>
      )}
      {info.hallOfShameVector && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 text-white/40">
          {VECTOR_ICONS[info.hallOfShameVector] ?? '🔓'} {info.hallOfShameVector}
        </span>
      )}
      {info.hallOfShameAttacker && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/8 border border-rose-500/15 text-rose-400/70">
          {info.hallOfShameAttacker}
        </span>
      )}
    </div>
  ) : null;
}

function ShameCard({ record, index }: { record: AnalysisRecord; index: number }) {
  const { name, amount } = parseLabel(record.hallOfShameLabel ?? record.input);
  const isContract = /^0x[a-fA-F0-9]{40}$/i.test(record.input);

  return (
    <Link href={`/analysis/${record.id}`} className="block outline-none">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative h-full flex flex-col p-5 rounded-2xl border border-rose-500/12 bg-rose-950/8 hover:bg-rose-950/14 hover:border-rose-500/25 transition-all duration-200 group cursor-pointer overflow-hidden"
      >
        {/* Subtle glow on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.06) 0%, transparent 65%)' }} />

        {/* Risk badge + score */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1">
              mainnet · {isContract ? 'CONTRACT' : 'TX'}
            </div>
            <div className="font-mono text-xs text-white/35 group-hover:text-rose-300/60 transition-colors">
              {truncateAddress(record.input)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shrink-0 bg-rose-500/10 border-rose-500/25">
            <span className="text-xs font-mono font-bold text-rose-400">{record.riskScore}</span>
            <span className="text-[9px] font-mono font-semibold tracking-wider text-rose-400/60">CRIT</span>
          </div>
        </div>

        {/* Incident name + amount */}
        <div className="mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-white text-base leading-tight group-hover:text-rose-200 transition-colors">
              {name}
            </h3>
            {amount && (
              <span className="text-xs font-mono font-bold text-rose-400 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                {amount}
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-white/45 leading-relaxed line-clamp-3 flex-1 mb-3">
          {record.summary}
        </p>

        {/* Attack metadata tags */}
        <AttackerBadge record={record} />

        {/* CTA */}
        <div className="flex items-center justify-between border-t border-rose-500/8 pt-3 mt-3">
          <a
            href={`https://etherscan.io/address/${record.input}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] text-white/20 font-mono hover:text-white/40 transition-colors"
          >
            Etherscan <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <span className="flex items-center gap-1 text-[11px] text-rose-400/40 font-mono group-hover:text-rose-400 transition-colors">
            View Analysis
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

export function HallOfShameSection() {
  const { data, isLoading } = useGetHallOfShame();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-56 rounded-xl bg-rose-500/8 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 rounded-2xl border border-rose-500/8 bg-rose-950/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <Skull className="w-4 h-4 text-rose-400" strokeWidth={1.7} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-white tracking-tight">Hall of Shame</h2>
              <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <p className="text-xs text-white/30">
              Real exploits. Real losses. Here's how Sigil would have flagged each one.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/8 border border-rose-500/15">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          <span className="text-xs font-mono text-rose-400/80">
            ${data.reduce((acc, r) => {
              const d = (r as AnalysisRecord & { details?: Record<string, unknown> }).details;
              if (!d) return acc;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const amt = (d as any).hallOfShameAmountUsd as string | undefined;
              return acc; // just show count for now
            }, 0) === 0 ? `${data.length} incidents` : `${data.length} incidents`}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((record, i) => (
          <ShameCard key={record.id} record={record} index={i} />
        ))}
      </div>

      {/* Divider before live feed */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Live Analysis Feed</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>
    </motion.section>
  );
}
