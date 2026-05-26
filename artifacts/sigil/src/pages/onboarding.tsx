import { motion } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Chrome,
  KeyRound,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';

const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/sigil-web3-trust-layer/klogkofhnlifhakklkjmoofhfopnhnkg';
const ONBOARDING_STORAGE_KEY = 'sigil:onboarding-complete';

const LESSONS = [
  {
    label: '01',
    icon: ShieldCheck,
    title: 'What approvals are',
    text: 'An approval lets another contract spend a token from your wallet. Limited approvals cap the amount; unlimited approvals can stay open long after you leave a dApp.',
    action: { href: '/approvals', label: 'Check approvals' },
    tone: 'emerald',
  },
  {
    label: '02',
    icon: KeyRound,
    title: 'Why signatures are risky',
    text: 'Signatures can authorize orders, permissions, typed data, or account actions. A harmless-looking message can still create a real on-chain consequence.',
    action: { href: '/extension', label: 'Use extension checks' },
    tone: 'amber',
  },
  {
    label: '03',
    icon: BadgeCheck,
    title: 'What Sigil verdicts mean',
    text: 'Low means no major warning was found, medium asks for review, high means clear red flags, and critical means stop unless you deeply trust the action.',
    action: { href: '/', label: 'Run a scan' },
    tone: 'primary',
  },
  {
    label: '04',
    icon: Chrome,
    title: 'How to use the extension',
    text: 'Install Sigil, keep Standard mode on, and read the overlay before confirming wallet prompts. Use the popup for paste checks, session summaries, and recent decisions.',
    action: { href: '/extension', label: 'Install extension' },
    tone: 'blue',
  },
  {
    label: '05',
    icon: WalletCards,
    title: 'How to monitor a wallet',
    text: 'Paste a public wallet address into Wallet Monitor to track approval exposure, hygiene score, suspicious interactions, and the fix-this-first checklist.',
    action: { href: '/monitor', label: 'Monitor wallet' },
    tone: 'violet',
  },
];

const DAILY_RULES = [
  'Scan unknown contracts before interacting.',
  'Treat unlimited approvals as cleanup work.',
  'Do not sign typed data you cannot explain.',
  'Use Wallet Monitor after risky sessions.',
];

const toneClass = {
  primary: 'border-primary/20 bg-primary/10 text-primary',
  emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  blue: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
  violet: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
};

type Tone = keyof typeof toneClass;

export default function OnboardingPage() {
  const [, setLocation] = useLocation();

  const finishOnboarding = (nextPath = '/') => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setLocation(nextPath);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 pb-20">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="grid gap-8 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"
      >
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-mono font-semibold uppercase tracking-widest text-primary">
            <ListChecks className="h-3.5 w-3.5" />
            Two-minute safety setup
          </div>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
            Understand wallet risk before the next click.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/45 md:text-lg">
            A compact first-run flow for approvals, signatures, Sigil verdicts, the Chrome extension, and wallet monitoring.
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-white">Daily signing rule</p>
              <p className="text-sm text-white/40">If the request is vague, pause and scan.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            {DAILY_RULES.map((rule) => (
              <div key={rule} className="flex items-center gap-2 rounded-xl border border-white/6 bg-black/15 px-3 py-2 text-sm text-white/55">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                {rule}
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4">
        {LESSONS.map((lesson, index) => {
          const Icon = lesson.icon;
          return (
            <motion.article
              key={lesson.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + index * 0.05, duration: 0.35 }}
              className="grid gap-4 rounded-2xl border border-white/7 bg-white/[0.025] p-5 md:grid-cols-[auto_1fr_auto] md:items-center"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${toneClass[lesson.tone as Tone]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-xs font-bold text-white/25">{lesson.label}</span>
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-white">{lesson.title}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/42">{lesson.text}</p>
              </div>
              <Link
                href={lesson.action.href}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2 text-sm font-semibold text-white/65 transition-colors hover:border-primary/25 hover:text-primary"
              >
                {lesson.action.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.article>
          );
        })}
      </section>

      <section className="grid gap-4 rounded-2xl border border-primary/15 bg-primary/[0.055] p-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 className="font-display text-lg font-bold text-white">Ready for daily protection</h2>
          <p className="mt-1 text-sm leading-relaxed text-white/45">
            Install from the Chrome Web Store, keep Standard mode on, then use Wallet Monitor for ongoing exposure checks.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            <Chrome className="h-4 w-4" />
            Chrome Web Store
          </a>
          <button
            type="button"
            onClick={() => finishOnboarding('/monitor')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:border-primary/25 hover:text-primary"
          >
            Mark complete
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
