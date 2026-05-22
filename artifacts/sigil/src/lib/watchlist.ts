export type WatchlistNetwork =
  | "mainnet"
  | "polygon"
  | "arbitrum"
  | "optimism"
  | "base"
  | "bsc"
  | "sepolia";

export type WatchlistKind = "wallet" | "vault" | "multisig" | "contract";
export type WatchlistStatus = "unchecked" | "clean" | "review" | "high-risk" | "unavailable";

export interface WatchlistEntry {
  id: string;
  label: string;
  address: string;
  network: WatchlistNetwork;
  kind: WatchlistKind;
  status: WatchlistStatus;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
  approvalSummary?: {
    healthScore: number;
    totalActive: number;
    unlimited: number;
    critical: number;
    high: number;
  };
  coverageStatus?: "limited" | "unavailable";
  coverageMessage?: string;
}

export interface NewWatchlistEntry {
  label: string;
  address: string;
  network: WatchlistNetwork;
  kind: WatchlistKind;
}

export interface ApprovalStatusInput {
  coverageStatus: "limited" | "unavailable";
  totalActive: number;
  high: number;
  critical: number;
}

export const WATCHLIST_STORAGE_KEY = "sigil.addressWatchlist.v1";

const NETWORKS = new Set<WatchlistNetwork>([
  "mainnet",
  "polygon",
  "arbitrum",
  "optimism",
  "base",
  "bsc",
  "sepolia",
]);

const KINDS = new Set<WatchlistKind>(["wallet", "vault", "multisig", "contract"]);

function nowIso(): string {
  return new Date().toISOString();
}

function createId(entry: NewWatchlistEntry): string {
  return `${entry.network}:${normalizeWatchlistAddress(entry.address)}:${Date.now().toString(36)}`;
}

export function isWatchlistAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export function normalizeWatchlistAddress(address: string): string {
  return `0x${address.trim().replace(/^0x/i, "").toLowerCase()}`;
}

export function statusFromApprovalSummary(input: ApprovalStatusInput): WatchlistStatus {
  if (input.coverageStatus === "unavailable") return "unavailable";
  if (input.critical > 0 || input.high > 0) return "high-risk";
  if (input.totalActive > 0) return "review";
  return "clean";
}

export function addWatchlistEntry(entries: WatchlistEntry[], input: NewWatchlistEntry): WatchlistEntry[] {
  if (!isWatchlistAddress(input.address)) {
    throw new Error("Enter a valid EVM address.");
  }

  if (!NETWORKS.has(input.network)) {
    throw new Error("Select a supported network.");
  }

  if (!KINDS.has(input.kind)) {
    throw new Error("Select a supported address type.");
  }

  const address = normalizeWatchlistAddress(input.address);
  const label = input.label.trim() || "Untitled address";
  const duplicate = entries.some((entry) => entry.network === input.network && entry.address === address);

  if (duplicate) {
    throw new Error("This address is already on your watchlist for that network.");
  }

  const timestamp = nowIso();
  return [
    {
      id: createId({ ...input, address }),
      label,
      address,
      network: input.network,
      kind: input.kind,
      status: "unchecked",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    ...entries,
  ];
}

export function removeWatchlistEntry(entries: WatchlistEntry[], id: string): WatchlistEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

export function updateWatchlistEntry(entries: WatchlistEntry[], updated: WatchlistEntry): WatchlistEntry[] {
  return entries.map((entry) => (entry.id === updated.id ? { ...updated, updatedAt: nowIso() } : entry));
}

export function importWatchlistEntries(value: unknown): WatchlistEntry[] {
  if (!Array.isArray(value)) return [];

  const imported: WatchlistEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<WatchlistEntry>;
    if (!candidate.address || !isWatchlistAddress(candidate.address)) continue;
    if (!candidate.network || !NETWORKS.has(candidate.network)) continue;
    if (!candidate.kind || !KINDS.has(candidate.kind)) continue;

    const address = normalizeWatchlistAddress(candidate.address);
    if (imported.some((entry) => entry.network === candidate.network && entry.address === address)) continue;

    const timestamp = nowIso();
    imported.push({
      id: typeof candidate.id === "string" && candidate.id ? candidate.id : `${candidate.network}:${address}`,
      label: typeof candidate.label === "string" && candidate.label.trim() ? candidate.label.trim() : "Imported address",
      address,
      network: candidate.network,
      kind: candidate.kind,
      status: candidate.status && ["unchecked", "clean", "review", "high-risk", "unavailable"].includes(candidate.status)
        ? candidate.status
        : "unchecked",
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : timestamp,
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : timestamp,
      lastCheckedAt: typeof candidate.lastCheckedAt === "string" ? candidate.lastCheckedAt : undefined,
      approvalSummary: candidate.approvalSummary,
      coverageStatus: candidate.coverageStatus,
      coverageMessage: typeof candidate.coverageMessage === "string" ? candidate.coverageMessage : undefined,
    });
  }

  return imported;
}

export function exportWatchlistEntries(entries: WatchlistEntry[]): string {
  return JSON.stringify(entries, null, 2);
}
