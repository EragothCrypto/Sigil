/**
 * Sigil — Analysis Cache
 * In-memory LRU + TTL cache for analysis results.
 * Key: versioned policy namespace + `${network}:${input}` (both lower-cased)
 * Avoids redundant Etherscan + AI roundtrips for identical inputs.
 */

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

class AnalysisCache {
  private readonly store = new Map<string, CacheEntry>();

  constructor(
    private readonly maxSize = 300,
    private readonly ttlMs  = 30 * 60 * 1000, // 30 minutes
  ) {}

  get(key: string): unknown | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // LRU: move accessed entry to end
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.data;
  }

  set(key: string, data: unknown): void {
    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Remove expired entries without waiting for access to trigger it */
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  get size(): number {
    return this.store.size;
  }

  stats() {
    return { size: this.store.size, maxSize: this.maxSize, ttlMs: this.ttlMs };
  }
}

/** Singleton cache — lives for the lifetime of the server process */
export const analysisCache = new AnalysisCache();

/** Build the canonical cache key for an (input, network) pair */
export function cacheKey(input: string, network: string): string {
  return `findings-v2:token-state-v2:${network.toLowerCase()}:${input.toLowerCase()}`;
}

// Purge expired entries every 10 minutes to prevent memory accumulation
setInterval(() => analysisCache.purgeExpired(), 10 * 60 * 1000);
