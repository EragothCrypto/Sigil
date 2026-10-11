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

function parseSavedApprovalSummary(value: unknown): WatchlistEntry["approvalSummary"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const summary = value as Record<string, unknown>;
  const keys = ["healthScore", "totalActive", "unlimited", "critical", "high"] as const;
  if (keys.some(key => typeof summary[key] !== "number" || !Number.isSafeInteger(summary[key]) || (summary[key] as number) < 0)) return undefined;
  const { healthScore, totalActive, unlimited, critical, high } = summary as Record<typeof keys[number], number>;
  if (healthScore > 100 || unlimited > totalActive || critical > totalActive - high) return undefined;
  return { healthScore, totalActive, unlimited, critical, high };
}

export function importWatchlistEntries(value: unknown): WatchlistEntry[] {
  if (!Array.isArray(value)) return [];

  const imported: WatchlistEntry[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<WatchlistEntry>;
    if (typeof candidate.address !== "string" || !isWatchlistAddress(candidate.address)) continue;
    if (!candidate.network || !NETWORKS.has(candidate.network)) continue;
    if (!candidate.kind || !KINDS.has(candidate.kind)) continue;

    const address = normalizeWatchlistAddress(candidate.address);
    if (imported.some((entry) => entry.network === candidate.network && entry.address === address)) continue;

    const timestamp = nowIso();
    const approvalSummary = parseSavedApprovalSummary(candidate.approvalSummary);
    const savedStatus = candidate.status;
    const coverageStatus = candidate.coverageStatus === "unavailable" || savedStatus === "unavailable"
      ? "unavailable"
      : candidate.coverageStatus === "limited" && approvalSummary && ["clean", "review", "high-risk"].includes(savedStatus ?? "")
        ? "limited"
        : undefined;
    const status = coverageStatus === "unavailable" ? "unavailable"
      : coverageStatus === "limited" && approvalSummary ? statusFromApprovalSummary({ coverageStatus, ...approvalSummary })
        : "unchecked";
    const fallbackId = `${candidate.network}:${address}`;
    let id = typeof candidate.id === "string" && candidate.id ? candidate.id : fallbackId;
    if (ids.has(id)) {
      id = fallbackId;
      let suffix = 1;
      while (ids.has(id)) id = `${fallbackId}:${suffix++}`;
    }
    ids.add(id);
    imported.push({
      id,
      label: typeof candidate.label === "string" && candidate.label.trim() ? candidate.label.trim() : "Imported address",
      address,
      network: candidate.network,
      kind: candidate.kind,
      status,
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : timestamp,
      updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : timestamp,
      lastCheckedAt: typeof candidate.lastCheckedAt === "string" ? candidate.lastCheckedAt : undefined,
      approvalSummary,
      coverageStatus,
      coverageMessage: typeof candidate.coverageMessage === "string" ? candidate.coverageMessage : undefined,
    });
  }

  return imported;
}

export function exportWatchlistEntries(entries: WatchlistEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function mergeWatchlistEntries(entries: WatchlistEntry[], value: unknown): WatchlistEntry[] {
  const current = importWatchlistEntries(entries);
  const merged = importWatchlistEntries([...current, ...(Array.isArray(value) ? value : [])]);
  return [...merged.slice(current.length).reverse(), ...merged.slice(0, current.length)];
}
