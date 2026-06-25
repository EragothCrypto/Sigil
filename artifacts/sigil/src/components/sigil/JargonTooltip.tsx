import { useState, useRef, useEffect, memo, useMemo } from 'react';
import { JARGON_GLOSSARY } from '@/lib/jargon-glossary';

// ── Base tooltip component ─────────────────────────────────────────────────

interface JargonTooltipProps {
  term: string;
  definition: string;
  children: React.ReactNode;
}

export function JargonTooltip({ term, definition, children }: JargonTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [above, setAbove] = useState(true);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!visible || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setAbove(rect.top > 120);
  }, [visible]);

  return (
    <span
      ref={ref}
      className="relative inline"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {/* The jargon term — dotted underline signals it's hoverable */}
      <span
        className="border-b border-dotted border-white/30 cursor-help text-white/85 hover:text-white hover:border-primary/60 transition-colors"
        tabIndex={0}
        aria-describedby={visible ? `jargon-${term.replace(/\s+/g, '-')}` : undefined}
      >
        {children}
      </span>

      {/* Tooltip card */}
      {visible && (
        <span
          id={`jargon-${term.replace(/\s+/g, '-')}`}
          role="tooltip"
          className={`
            absolute z-50 left-1/2 -translate-x-1/2 w-64 pointer-events-none
            ${above ? 'bottom-full mb-2' : 'top-full mt-2'}
          `}
          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))' }}
        >
          <span
            className="block rounded-xl border border-white/10 px-3.5 py-3"
            style={{ background: 'rgba(13, 8, 32, 0.97)' }}
          >
            <span className="block font-mono text-[10px] text-primary/70 uppercase tracking-widest mb-1.5">
              {term}
            </span>
            <span className="block text-xs text-white/70 leading-relaxed">
              {definition}
            </span>
          </span>
          {/* Arrow */}
          <span
            className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${
              above
                ? 'top-full border-t-8 border-t-white/10 border-x-8 border-x-transparent -mt-px'
                : 'bottom-full border-b-8 border-b-white/10 border-x-8 border-x-transparent -mb-px'
            }`}
          />
        </span>
      )}
    </span>
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
