import { AlertTriangle, CheckCircle2, ShieldOff, Clock, ExternalLink, Infinity, BadgeCheck, DollarSign } from 'lucide-react';
import type { ApprovalInfo, KnownEntity } from '@workspace/api-client-react';
import { JargonTooltip, JargonText } from './JargonTooltip';

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months= Math.floor(days / 30);
  if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
  if (weeks  > 0) return `${weeks} week${weeks   > 1 ? "s" : ""} ago`;
  if (days   > 0) return `${days} day${days     > 1 ? "s" : ""} ago`;
  if (hours  > 0) return `${hours} hour${hours   > 1 ? "s" : ""} ago`;
  return `${mins} min${mins !== 1 ? "s" : ""} ago`;
}

function AddressChip({ address, entity }: { address: string; entity?: KnownEntity }) {
  const short = `${address.slice(0, 8)}...${address.slice(-6)}`;
  if (entity) {
    return (
      <a
        href={entity.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/25 hover:border-primary/50 transition-colors group"
      >
        <span className="font-mono text-xs font-bold text-primary">{entity.logoLetter}</span>
        <span className="text-sm font-semibold text-white">{entity.name}</span>
        {entity.trustLevel === "trusted" && (
          <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
      </a>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-muted-foreground">
      {short}
    </span>
  );
}

export function ApprovalInspector({ info }: { info: ApprovalInfo }) {
  const isRevoke     = info.isRevoke;
  const isUnlimited  = info.isUnlimited;
  const hasPrior     = info.priorApprovals.length > 0;
  const knownSpender = info.spenderEntity;

  // Color scheme
  const scheme = isRevoke
    ? { bg: "bg-emerald-500/8", border: "border-emerald-500/25", header: "text-emerald-400", glow: "shadow-emerald-500/10" }
    : isUnlimited && !knownSpender
    ? { bg: "bg-red-500/8",     border: "border-red-500/30",     header: "text-red-400",     glow: "shadow-red-500/15"     }
    : isUnlimited
    ? { bg: "bg-amber-500/8",   border: "border-amber-500/25",   header: "text-amber-400",   glow: "shadow-amber-500/10"   }
    : { bg: "bg-primary/5",     border: "border-primary/20",     header: "text-primary-text", glow: "shadow-primary/5"      };

  const titleIcon = isRevoke
    ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    : isUnlimited
    ? <AlertTriangle className="w-5 h-5 text-amber-400" />
    : <ShieldOff className="w-5 h-5 text-primary" />;

  const title = isRevoke
    ? "Zero-Value Approval Intent"
    : isUnlimited
    ? "Large-Value Approval Intent"
    : "Approval Calldata Detected";

  return (
    <div className={`rounded-3xl border ${scheme.bg} ${scheme.border} shadow-xl ${scheme.glow} overflow-hidden`}>
      {/* ── Header ── */}
      <div className={`px-8 py-5 border-b ${scheme.border} flex items-center gap-3`}>
        {titleIcon}
        <h3 className={`font-display font-bold text-lg ${scheme.header}`}>{title}</h3>
        <span className="ml-auto text-xs font-mono text-muted-foreground uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10">
          Approval Inspector
        </span>
      </div>

      <div className="px-8 py-6 space-y-6">

        {/* ── Dollar Value Banner — shown when we have a price ── */}
        {!isRevoke && info.tokenPriceUsd && info.approvalUsdLabel && (
          <div className={`flex items-center gap-4 rounded-2xl px-5 py-4 border ${
            isUnlimited && !knownSpender
              ? "bg-red-500/6 border-red-500/20"
              : isUnlimited
              ? "bg-amber-500/6 border-amber-500/20"
              : "bg-primary/5 border-primary/15"
          }`}>
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
              isUnlimited && !knownSpender ? "bg-red-500/15" : isUnlimited ? "bg-amber-500/15" : "bg-primary/15"
            }`}>
              <DollarSign className={`w-5 h-5 ${
                isUnlimited && !knownSpender ? "text-red-400" : isUnlimited ? "text-amber-400" : "text-primary"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              {isUnlimited ? (
                <>
                  <p className={`text-sm font-display font-bold ${
                    !knownSpender ? "text-red-300" : "text-amber-300"
                  }`}>
                    Broad token access may be requested
                  </p>
                  <p className="text-xs text-subtle mt-0.5 font-mono">
                    Token currently trading at{' '}
                    <span className="text-white/60 font-bold">
                      ${info.tokenPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} per token
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-display font-bold text-white/80">
                    ≈{' '}
                    <span className="text-white font-bold text-base">{info.approvalUsdLabel}</span>
                    {' '}at current market price
                  </p>
                  <p className="text-xs text-subtle mt-0.5 font-mono">
                    {info.amountFormatted} tokens × ${info.tokenPriceUsd.toLocaleString('en-US', {
                      minimumFractionDigits: 2, maximumFractionDigits: 6
                    })} per token
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Amount ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest w-32 shrink-0">Amount</span>
          {isRevoke ? (
            <div className="flex items-center gap-2">
              <span className="px-4 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-mono font-bold text-sm">
                0 — Revoke not confirmed
              </span>
            </div>
          ) : isUnlimited ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 font-mono font-bold text-sm">
                <Infinity className="w-4 h-4" /> LARGE RAW VALUE
              </span>
              <span className="text-xs text-muted-foreground">
                ERC20 allowance or NFT token ID; executed permission not checked
              </span>
            </div>
          ) : (
            <span className="px-4 py-1.5 rounded-xl bg-white/8 border border-white/15 text-white font-mono font-semibold text-sm">
              {info.amountFormatted}
            </span>
          )}
        </div>

        {/* ── Approval Method ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest w-32 shrink-0">Method</span>
          <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-mono text-sm text-white/70">
            <JargonTooltip
              term={info.approvalType}
              definition={
                info.approvalType === 'setApprovalForAll'
                  ? 'Grants a contract permission to transfer every NFT in a collection from your wallet — one of the most dangerous approvals you can sign.'
                  : info.approvalType === 'increaseAllowance'
                  ? 'Raises the amount a contract is allowed to spend from your wallet without issuing a new approval.'
                  : 'Grants a contract permission to spend a specific token from your wallet on your behalf.'
              }
            >
              {info.approvalType}()
            </JargonTooltip>
          </span>
        </div>

        {/* ── Spender ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest w-32 shrink-0">Who Gets Access</span>
          <div className="flex items-center gap-3 flex-wrap">
            <AddressChip address={info.spender} entity={info.spenderEntity} />
            {!knownSpender && (
              <span className="text-xs text-amber-400 font-mono">⚠ Unknown contract</span>
            )}
          </div>
        </div>

        {/* ── Token Contract ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest w-32 shrink-0">Token Contract</span>
          <AddressChip address={info.tokenContract} entity={info.tokenEntity} />
        </div>

        {/* ── Risk Level ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest w-32 shrink-0">Risk Level</span>
          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
            info.riskLevel === "critical" ? "bg-red-500/15 border-red-500/30 text-red-300" :
            info.riskLevel === "high"     ? "bg-amber-500/15 border-amber-500/25 text-amber-300" :
            info.riskLevel === "medium"   ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-300" :
                                            "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
          }`}>
            {info.riskLevel}
          </span>
        </div>

        {/* ── Revoke tip ── */}
        {isRevoke && (
          <div className="flex items-start gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl px-5 py-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-200 leading-relaxed">
              The calldata contains a zero-value approval. This may attempt a revoke, but token semantics and the resulting allowance were not checked. A failed or pending call does not confirm removal.
            </p>
          </div>
        )}

        {/* ── Unlimited warning ── */}
        {isUnlimited && !isRevoke && (
          <div className={`flex items-start gap-3 rounded-2xl px-5 py-4 border ${
            !knownSpender
              ? "bg-red-500/8 border-red-500/25"
              : "bg-amber-500/8 border-amber-500/20"
          }`}>
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${!knownSpender ? "text-red-400" : "text-amber-400"}`} />
            <p className={`text-sm leading-relaxed ${!knownSpender ? "text-red-200" : "text-amber-200"}`}>
              {knownSpender
                ? <><JargonText text={`The calldata requests a large raw value for ${knownSpender.name}. An executed ERC20 approval may grant broad access, but NFT token IDs and failed or pending calls have different meanings.`} /></>
                : <><JargonText text="The requested spender is not in Sigil's local registry. A large raw value may represent broad ERC20 approval or an NFT token ID; executed permission and source verification are not established." /></>
              }
            </p>
          </div>
        )}

        {/* ── Prior Approvals History ── */}
        {hasPrior && (
          <div className="border-t border-white/8 pt-5 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">
                You've interacted with this spender before
              </span>
            </div>
            <div className="space-y-2">
              {info.priorApprovals.map((prior) => (
                <div
                  key={prior.id}
                  className="flex flex-wrap items-center justify-between gap-3 bg-black/40 border border-white/8 rounded-xl px-4 py-3 text-sm"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${prior.isUnlimited ? "bg-amber-400" : "bg-primary"}`} />
                    <span className="text-white/80 font-mono">
                      {prior.isUnlimited ? "Unlimited approval" : `${prior.amountFormatted} tokens`}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase font-mono">{prior.network}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{timeAgo(prior.analyzedAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
