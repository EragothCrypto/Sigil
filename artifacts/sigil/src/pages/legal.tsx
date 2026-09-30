import { Link } from 'wouter';
import { Mail, MapPin, Shield, FileText, Cookie, Scale } from 'lucide-react';

const OPERATOR = {
  brand: 'S3ntryLabs',
  addressLine1: 'Eragoth.Crypto c/o IP-Management #5849',
  addressLine2: 'Ludwig-Erhard-Str. 18',
  addressLine3: '20459 Hamburg',
  country: 'Germany',
  email: 'info@s3ntrylabs.com',
  website: 'https://www.s3ntrylabs.com',
};

const legalLinks = [
  { href: '/impressum', label: 'Impressum', icon: Scale },
  { href: '/privacy', label: 'Privacy Policy', icon: Shield },
  { href: '/terms', label: 'Terms', icon: FileText },
  { href: '/cookies', label: 'Cookies', icon: Cookie },
];

function LegalShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-4xl mx-auto pb-24">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary/55 mb-3">{eyebrow}</p>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold text-white tracking-tight">{title}</h1>
        <p className="mt-4 text-sm text-white/40">Last updated: September 28, 2026</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 items-start">
        <nav className="lg:sticky lg:top-28 grid gap-2">
          {legalLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white/55 hover:text-white hover:border-primary/20 transition-colors"
            >
              <Icon className="w-4 h-4 text-primary/55" />
              {label}
            </Link>
          ))}
        </nav>

        <article className="space-y-5 text-sm leading-7 text-white/62">
          {children}
        </article>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/6 bg-white/[0.025] p-5">
      <h2 className="font-display text-lg font-bold text-white mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function OperatorBlock() {
  return (
    <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
      <p className="font-display font-bold text-white mb-2">{OPERATOR.brand}</p>
      <div className="flex gap-2 text-white/60">
        <MapPin className="w-4 h-4 mt-1 text-primary/70 shrink-0" />
        <p>
          {OPERATOR.addressLine1}<br />
          {OPERATOR.addressLine2}<br />
          {OPERATOR.addressLine3}<br />
          {OPERATOR.country}
        </p>
      </div>
      <div className="flex gap-2 text-white/60 mt-3">
        <Mail className="w-4 h-4 mt-1 text-primary/70 shrink-0" />
        <p>
          Email: <a className="text-primary hover:text-primary/80" href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a><br />
          Website: <a className="text-primary hover:text-primary/80" href={OPERATOR.website} target="_blank" rel="noopener noreferrer">{OPERATOR.website}</a>
        </p>
      </div>
    </div>
  );
}

export function ImpressumPage() {
  return (
    <LegalShell eyebrow="Legal Notice" title="Impressum">
      <Section title="Information according to Section 5 DDG">
        <OperatorBlock />
        <p>
          Responsible for this website and the Sigil web application: {OPERATOR.brand}.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For legal, privacy, or security inquiries, contact us at{' '}
          <a className="text-primary hover:text-primary/80" href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>.
        </p>
      </Section>

      <Section title="Consumer Dispute Resolution">
        <p>
          We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board,
          unless a legal obligation applies.
        </p>
      </Section>

    </LegalShell>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell eyebrow="Data Protection" title="Privacy Policy">
      <Section title="Controller">
        <OperatorBlock />
      </Section>

      <Section title="What Sigil Processes">
        <p>
          Sigil analyzes on-chain risk. Depending on how you use the app or browser extension, we may process wallet
          addresses, transaction hashes, contract addresses, selected networks, raw transaction calldata, typed signing
          payloads, risk analysis results, browser request metadata, IP address, timestamps, and technical server logs.
        </p>
        <p>
          The browser extension stores settings, trusted sites, trusted contracts, and recent check history in your
          browser storage by default. If you enable optional Settings Sync, preferences and trusted lists may sync through
          Chrome extension sync storage. Analysis history and dApp session history remain local by default unless you
          submit a signing request for analysis.
        </p>
      </Section>

      <Section title="Purposes and Legal Bases">
        <p>
          We process submitted wallet and transaction data to provide the requested security analysis and simulation
          features. The legal basis is Art. 6(1)(b) GDPR where the processing is necessary to provide the requested
          service, and Art. 6(1)(f) GDPR for security, abuse prevention, debugging, and service reliability.
        </p>
        <p>
          If optional analytics, newsletters, or marketing tools are added later, they must only run after a valid legal
          basis is configured, usually consent.
        </p>
      </Section>

      <Section title="Hosting, APIs, and Processors">
        <p>
          Sigil is hosted on Vercel and stores analysis records in a Neon PostgreSQL database. These providers may process
          IP addresses, request metadata, technical logs, and submitted analysis records to provide hosting, delivery,
          database, security, and reliability services.
        </p>
        <p>
          Sigil sends relevant transaction, contract, wallet, or signing data to OpenRouter and the selected model provider
          for AI-assisted analysis. Provider logging, retention, and model-training practices can vary by routed model and
          account privacy settings. Do not submit seed phrases, private keys, passwords, or confidential off-chain content.
        </p>
        <p>
          Etherscan, CoinGecko, and public EVM RPC operators receive the blockchain identifiers required for lookups. If you
          enable Settings Sync in the extension, Google Chrome Sync processes preferences and trusted-site or trusted-contract
          lists. Analysis and dApp session history are not included in Settings Sync.
        </p>
        <p>
          Some providers and their subprocessors may process data outside the European Economic Area. Where required, such
          transfers must be covered by an adequacy decision or appropriate safeguards such as standard contractual clauses.
        </p>
      </Section>

      <Section title="Retention">
        <p>
          Normal server-side analysis records are scheduled for automatic deletion after 30 days. Short-lived in-memory
          analysis results are cached for up to 30 minutes. Curated public threat-intelligence records may be kept longer
          while they remain relevant and accurate.
        </p>
        <p>
          Extension analysis and dApp session history remain on your device until you clear them or remove the extension.
          Web-app onboarding state and locally watched public addresses remain in browser storage until you clear site data.
          Infrastructure and external-provider logs follow the provider retention periods configured for the service.
        </p>
      </Section>

      <Section title="Analysis Links and AI Assistance">
        <p>
          Submitted analyses are not published in a global feed. A result is retrievable through an unguessable link identifier;
          anyone you share that link with can view the result. Sigil uses AI-generated explanations together with deterministic
          checks and third-party data. Treat every result as decision support, verify high-value actions independently, and never
          rely on a verdict as a guarantee of safety.
        </p>
      </Section>

      <Section title="Your Rights">
        <p>
          Subject to the GDPR requirements, you may request access, rectification, erasure, restriction of processing,
          data portability, and objection to processing. You may also lodge a complaint with a competent data protection
          supervisory authority, including the Hamburg Commissioner for Data Protection and Freedom of Information when it is
          the competent authority.
        </p>
        <p>
          Send requests to <a className="text-primary hover:text-primary/80" href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>.
        </p>
      </Section>

      <Section title="No Financial Advice">
        <p>
          Sigil provides technical risk analysis and educational security context. It does not provide financial,
          investment, tax, or legal advice.
        </p>
      </Section>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell eyebrow="Product Terms" title="Terms of Use">
      <Section title="Service">
        <p>
          Sigil provides Web3 transaction, contract, and signing-risk analysis for informational security purposes. The
          output may include risk scores, warnings, summaries, and simulated asset or permission changes.
        </p>
      </Section>

      <Section title="No Advice or Guarantee">
        <p>
          Sigil is not a wallet, broker, exchange, custodian, bank, investment adviser, or legal adviser. Results are
          generated from available on-chain data, static heuristics, external APIs, and AI analysis. They may be incomplete,
          delayed, or incorrect. You remain responsible for every transaction you sign.
        </p>
      </Section>

      <Section title="Acceptable Use">
        <p>
          Do not misuse Sigil, overload the service, attempt unauthorized access, or use the app to facilitate fraud,
          phishing, sanctions evasion, malware, or other unlawful activity.
        </p>
      </Section>

      <Section title="Availability">
        <p>
          Sigil may change, pause, or discontinue features at any time. Security analysis depends on third-party
          infrastructure and blockchain data availability.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          To the maximum extent permitted by applicable law, Sigil is provided without warranties for correctness,
          availability, or fitness for a particular purpose. Mandatory statutory liability remains unaffected.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms can be sent to{' '}
          <a className="text-primary hover:text-primary/80" href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>.
        </p>
      </Section>
    </LegalShell>
  );
}

export function CookiePage() {
  return (
    <LegalShell eyebrow="Cookie Notice" title="Cookie and Local Storage Notice">
      <Section title="Current Status">
        <p>
          Sigil does not currently use advertising cookies or third-party tracking cookies in the main web app. The
          browser extension uses Chrome extension storage for settings, trusted entries, optional settings sync, and
          recent checks.
        </p>
      </Section>

      <Section title="Strictly Necessary Storage">
        <p>
          Storage that is technically required to provide a user-requested feature may be used without separate consent.
          This includes extension configuration, local recent-check history, UI state, and security/session infrastructure.
        </p>
      </Section>

      <Section title="Future Analytics or Marketing">
        <p>
          If analytics, marketing pixels, retargeting, or non-essential tracking are added, Sigil must add a consent flow
          before those tools run and update this notice.
        </p>
      </Section>
    </LegalShell>
  );
}
