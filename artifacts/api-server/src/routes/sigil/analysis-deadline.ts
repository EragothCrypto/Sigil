export class AnalysisTimeoutError extends Error {
  readonly code = 'analysis_timeout';
  constructor() {
    super('Analysis timed out before validation completed. No risk verdict was produced. Please retry.');
    this.name = 'AnalysisTimeoutError';
  }
}

export function createAnalysisDeadline(onTimeout?: () => void, ms = 120000, parent?: AbortSignal) {
  const controller = new AbortController();
  const cancelled = () => controller.abort(parent?.reason);
  if (parent?.aborted) cancelled();
  else parent?.addEventListener('abort', cancelled, {once: true});
  const timer = setTimeout(() => {
    if (controller.signal.aborted) return;
    controller.abort(new AnalysisTimeoutError());
    onTimeout?.();
  }, ms);
  return {
    signal: controller.signal,
    check() { controller.signal.throwIfAborted(); },
    wait<T>(promise: PromiseLike<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        const aborted = () => { controller.signal.removeEventListener('abort', aborted); reject(controller.signal.reason); };
        // Attach rejection handling even if the deadline already expired.
        Promise.resolve(promise).then(value => {
          controller.signal.removeEventListener('abort', aborted);
          if (controller.signal.aborted) reject(controller.signal.reason); else resolve(value);
        }, error => { controller.signal.removeEventListener('abort', aborted); reject(error); });
        if (controller.signal.aborted) aborted();
        else controller.signal.addEventListener('abort', aborted, {once: true});
      });
    },
    dispose() { clearTimeout(timer); parent?.removeEventListener('abort', cancelled); },
  };
}
