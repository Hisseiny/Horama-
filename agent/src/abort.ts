export function withAbort<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return operation;
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    operation.then((value) => {
      signal.removeEventListener("abort", abort);
      resolve(value);
    }, (error) => {
      signal.removeEventListener("abort", abort);
      reject(error);
    });
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

export async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Délai dépassé.")), timeoutMs);
  try { return await withAbort(Promise.resolve().then(() => operation(controller.signal)), controller.signal); }
  finally { clearTimeout(timer); }
}
