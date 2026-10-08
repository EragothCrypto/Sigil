interface Subscriber {
  resolve(value: unknown): void;
  reject(error: unknown): void;
  cleanup(): void;
}
interface Job {
  key?: string;
  execute(signal: AbortSignal): Promise<unknown>;
  cacheable?: (value: unknown) => boolean;
  controller: AbortController;
  subscribers: Set<Subscriber>;
}

export function createEtherscanCoordinator(options = {
  spacingMs: 1100, ttlMs: 60000, maxJobs: 16, maxEntries: 64, maxBytes: 16 * 1024 * 1024,
}) {
  const queue: Job[] = [];
  const inflight = new Map<string, Job>();
  const cache = new Map<string, {value: unknown; expires: number; bytes: number}>();
  let cacheBytes = 0;
  let running = false;
  let active: Job | undefined;
  let lastStart = 0;
  function removeCache(key: string) {
    const entry = cache.get(key);
    if (entry) cacheBytes -= entry.bytes;
    cache.delete(key);
  }
  function wait(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      signal.throwIfAborted();
      const aborted = () => { clearTimeout(timer); reject(signal.reason); };
      const timer = setTimeout(() => { signal.removeEventListener('abort', aborted); resolve(); }, ms);
      signal.addEventListener('abort', aborted, {once: true});
    });
  }
  async function pump() {
    if (running) return;
    running = true;
    try {
      while (queue.length) {
        const job = queue.shift()!;
        active = job;
        try {
          job.controller.signal.throwIfAborted();
          const delay = options.spacingMs - (Date.now() - lastStart);
          if (delay > 0) await wait(delay, job.controller.signal);
          job.controller.signal.throwIfAborted();
          lastStart = Date.now();
          const value = await job.execute(job.controller.signal);
          job.controller.signal.throwIfAborted();
          if (job.key && job.cacheable?.(value)) {
            const bytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
            if (bytes <= options.maxBytes) {
              for (const [key, entry] of cache) if (entry.expires <= Date.now()) removeCache(key);
              removeCache(job.key);
              while (cache.size && (cache.size >= options.maxEntries || cacheBytes + bytes > options.maxBytes)) removeCache(cache.keys().next().value!);
              cache.set(job.key, {value: structuredClone(value), expires: Date.now() + options.ttlMs, bytes});
              cacheBytes += bytes;
            }
          }
          for (const subscriber of job.subscribers) { subscriber.cleanup(); subscriber.resolve(structuredClone(value)); }
        } catch (error) {
          for (const subscriber of job.subscribers) { subscriber.cleanup(); subscriber.reject(error); }
        } finally {
          job.subscribers.clear();
          if (job.key && inflight.get(job.key) === job) inflight.delete(job.key);
          active = undefined;
        }
      }
    } finally { running = false; }
  }
  return {
    run(key: string | undefined, execute: Job['execute'], signal?: AbortSignal, cacheable?: Job['cacheable']): Promise<unknown> {
      if (signal?.aborted) return Promise.reject(signal.reason);
      if (key) {
        const entry = cache.get(key);
        if (entry && entry.expires > Date.now()) return Promise.resolve(structuredClone(entry.value));
        if (entry) removeCache(key);
      }
      let job = key ? inflight.get(key) : undefined;
      if (job?.controller.signal.aborted) job = undefined;
      if (!job) {
        if (queue.length + (active ? 1 : 0) >= options.maxJobs) return Promise.reject(new Error('Etherscan queue limit'));
        job = {key, execute, cacheable, controller: new AbortController(), subscribers: new Set()};
        if (key) inflight.set(key, job);
        queue.push(job);
      }
      const current = job;
      const result = new Promise<unknown>((resolve, reject) => {
        const subscriber: Subscriber = {resolve, reject, cleanup: () => signal?.removeEventListener('abort', aborted)};
        const aborted = () => {
          subscriber.cleanup(); current.subscribers.delete(subscriber); reject(signal?.reason);
          if (!current.subscribers.size) {
            current.controller.abort();
            const index = queue.indexOf(current);
            if (index >= 0) queue.splice(index, 1);
            if (key && inflight.get(key) === current) inflight.delete(key);
          }
        };
        current.subscribers.add(subscriber);
        signal?.addEventListener('abort', aborted, {once: true});
      });
      void Promise.resolve().then(pump);
      return result;
    },
  };
}

export const etherscanCoordinator = createEtherscanCoordinator();
