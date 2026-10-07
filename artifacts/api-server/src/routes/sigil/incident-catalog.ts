export type IncidentRole = "exploit_execution" | "victim" | "recovery" | "association";

export interface IncidentSource {
  readonly url: string;
  readonly title: string;
  readonly claim: string;
}

export interface IncidentEntry {
  readonly name: string;
  /** UTC date of this transaction, not the publication or overall incident. */
  readonly date: string;
  readonly role: IncidentRole;
  readonly sources: readonly IncidentSource[];
  readonly reviewedAt: string;
  readonly network: "mainnet";
  readonly hash: string;
}

const HASH = /^0x[0-9a-f]{64}$/i;
const ROLES: readonly IncidentRole[] = ["exploit_execution", "victim", "recovery", "association"];
const PUBLICATION = "https://www.euler.finance/blog/war-peace-behind-the-scenes-of-eulers-240m-exploit-recovery";
const PUBLICATION_TITLE = "War & Peace: Behind the Scenes of Euler's $240M Exploit Recovery";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit
    && !/[\u0000-\u001f\u007f]/.test(value);
}

function date(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function safeLink(value: unknown): value is string {
  if (!boundedText(value, 2048) || /\s|\\/.test(value) || !/^https?:\/\//.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:")
      && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

/** Shape/safety checks only; primary-source attribution still requires human review. */
export function validateIncidentCatalog(value: unknown): value is readonly IncidentEntry[] {
  if (!Array.isArray(value) || value.length > 3) return false;
  const identities = new Set<string>();
  for (const entry of value) {
    if (!record(entry) || Object.keys(entry).sort().join(",") !== "date,hash,name,network,reviewedAt,role,sources"
      || !boundedText(entry.name, 160) || !date(entry.date) || !date(entry.reviewedAt)
      || entry.reviewedAt < entry.date || entry.network !== "mainnet"
      || typeof entry.hash !== "string" || !HASH.test(entry.hash)
      || !ROLES.includes(entry.role as IncidentRole)
      || !Array.isArray(entry.sources) || entry.sources.length < 1 || entry.sources.length > 4) return false;
    const identity = `${entry.network}:${entry.hash.toLowerCase()}`;
    if (identities.has(identity)) return false;
    identities.add(identity);
    for (const source of entry.sources) {
      if (!record(source) || Object.keys(source).sort().join(",") !== "claim,title,url"
        || !safeLink(source.url) || !boundedText(source.title, 200) || !boundedText(source.claim, 600)) return false;
    }
  }
  return true;
}

// Curated offline: the publication's actual hyperlinks bind each role to its hash.
const entries: IncidentEntry[] = [
  {
    name: "Euler V1 exploit", date: "2023-03-13", role: "exploit_execution",
    network: "mainnet", hash: "0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d",
    reviewedAt: "2026-09-30",
    sources: [
      { url: PUBLICATION, title: PUBLICATION_TITLE,
        claim: "The exploit in real-time section links this exact transaction as the first exploit at 08:50:59 UTC on March 13, 2023, removing approximately $8.8M from Euler V1." },
      { url: "https://etherscan.io/tx/0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d",
        title: "Ethereum transaction: Euler V1 first exploit execution",
        claim: "Successful Ethereum transaction in block 16817996 at 2023-03-13 08:50:59 UTC, from 0x5f259d0b76665c337c6104145894f4d1d2758b8c to 0xebc29199c817dc47ba12e3f86102564d640cbf99. DAI transfers show a 30,000,000 loan and 30,027,000 repayment." },
    ],
  },
  {
    name: "Euler V1 victim plea", date: "2023-03-15", role: "victim",
    network: "mainnet", hash: "0xbe21a9719a4f89f7dc98419f60b247d69780b569cd8869c0031aae000f98cf17",
    reviewedAt: "2026-09-30",
    sources: [
      { url: PUBLICATION, title: PUBLICATION_TITLE,
        claim: "The Community messages section links this exact plea from an affected Euler user. This is victim communication, not the transaction that caused their loss." },
      { url: "https://etherscan.io/tx/0xbe21a9719a4f89f7dc98419f60b247d69780b569cd8869c0031aae000f98cf17",
        title: "Ethereum transaction: affected user's on-chain plea",
        claim: "Successful Ethereum transaction in block 16833383 at 2023-03-15 12:46:47 UTC, from 0x2af24e5575045a582d9c53febd48724473e67407 to 0xb66cd966670d962c227b3eaba30a872dbfb995db, with zero ETH and a message requesting return of funds." },
    ],
  },
  {
    name: "Euler V1 funds recovery", date: "2023-03-25", role: "recovery",
    network: "mainnet", hash: "0xb0308ee113c541e7c6f4623e833417524d68fd6267d23f43d9041f583c14343f",
    reviewedAt: "2026-09-30",
    sources: [
      { url: PUBLICATION, title: PUBLICATION_TITLE,
        claim: "The March 25th section links this exact transaction as a return of 51,000 ETH to Euler at 15:08 UTC, not exploit execution." },
      { url: "https://etherscan.io/tx/0xb0308ee113c541e7c6f4623e833417524d68fd6267d23f43d9041f583c14343f",
        title: "Ethereum transaction: 51,000 ETH returned to Euler",
        claim: "Successful Ethereum transaction in block 16905269 at 2023-03-25 15:08:23 UTC, transferring 51,000 ETH from 0xb66cd966670d962c227b3eaba30a872dbfb995db to 0xee009faf00cf54c1b4387829af7a8dc5f0c8c8c5." },
    ],
  },
];

if (!validateIncidentCatalog(entries)) throw new Error("Invalid reviewed incident catalog");
for (const entry of entries) {
  for (const source of entry.sources) Object.freeze(source);
  Object.freeze(entry.sources);
  Object.freeze(entry);
}
export const INCIDENT_CATALOG: readonly IncidentEntry[] = Object.freeze(entries);

export function lookupIncident(hash: string, network: string): IncidentEntry | undefined {
  if (typeof hash !== "string" || !HASH.test(hash) || network !== "mainnet") return undefined;
  return INCIDENT_CATALOG.find(entry => entry.network === network && entry.hash === hash.toLowerCase());
}
