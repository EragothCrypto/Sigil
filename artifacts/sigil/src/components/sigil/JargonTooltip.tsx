import { memo, useMemo, useRef, useState } from 'react';
import { JARGON_GLOSSARY } from '@/lib/jargon-glossary';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

// ── Base tooltip component ─────────────────────────────────────────────────

interface JargonTooltipProps {
  term: string;
  definition: string;
  children: React.ReactNode;
}

export function JargonTooltip({ term, definition, children }: JargonTooltipProps) {
  const [open, setOpen] = useState(false);
  const focusGeneration = useRef(0);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        type="button"
        tabIndex={0}
        onFocus={event => {
          const trigger = event.currentTarget;
          if (!trigger.matches(':focus-visible')) return;
          event.preventDefault();
          const generation = ++focusGeneration.current;
          // Native focus scrolling otherwise closes Radix's just-opened tooltip.
          requestAnimationFrame(() => requestAnimationFrame(() => {
            if (generation === focusGeneration.current && document.activeElement === trigger) setOpen(true);
          }));
        }}
        onBlur={() => { focusGeneration.current++; }}
        onKeyDown={event => {
          if (event.key === 'Escape') focusGeneration.current++;
        }}
        onClick={event => {
          event.preventDefault();
          focusGeneration.current++;
          setOpen(true);
        }}
        className="inline min-h-6 align-baseline border-b border-dotted border-white/30 cursor-help text-inherit hover:text-white hover:border-primary/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text focus-visible:outline-offset-2"
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        collisionPadding={8}
        aria-label={`${term}: ${definition}`}
        className="w-64 max-w-[calc(100vw-16px)] whitespace-normal border border-white/10 bg-[#0d0820] px-3.5 py-3 text-white shadow-xl"
      >
        <span className="block font-mono text-[10px] text-primary-text uppercase tracking-widest mb-1.5">
          {term}
        </span>
        <span className="block text-xs text-subtle leading-relaxed">
          {definition}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

// ── JargonText — auto-wraps known terms in a text string ──────────────────

/**
 * Parses a plain-English string and wraps any recognised glossary terms
 * with a JargonTooltip. Safe to use on AI-generated text.
 */
export const JargonText = memo(function JargonText({ text, className }: { text: string; className?: string }) {
  const nodes = useMemo(() => parseJargon(text), [text]);
  return <span className={className}>{nodes}</span>;
});

// ── Parser ─────────────────────────────────────────────────────────────────

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Pre-compile the regexes to avoid recompiling them on every segment iteration
// Sort longest-first to avoid partial matches (e.g. "gas limit" before "gas")
const PRECOMPILED_TERMS = Object.entries(JARGON_GLOSSARY)
  .sort(([a], [b]) => b.length - a.length)
  .map(([term, definition]) => ({
    term,
    definition,
    pattern: new RegExp(`(?<![\\w-])${escapeRegex(term)}(?![\\w-])`, 'i'),
  }));

function parseJargon(text: string): React.ReactNode[] {
  if (!text) return [];

  function parseSegment(segment: string, depth: number): React.ReactNode[] {
    if (!segment) return [];
    if (depth > 50) return [segment]; // safety limit

    for (const { term, definition, pattern } of PRECOMPILED_TERMS) {
      const match = segment.match(pattern);
      if (match && match.index !== undefined) {
        const before = segment.slice(0, match.index);
        const matched = match[0];
        const after = segment.slice(match.index + matched.length);
        const key = `${depth}-${match.index}`;

        return [
          ...parseSegment(before, depth + 1),
          <JargonTooltip key={key} term={term} definition={definition}>
            {matched}
          </JargonTooltip>,
          ...parseSegment(after, depth + 1),
        ];
      }
    }

    return [segment];
  }

  return parseSegment(text, 0);
}
