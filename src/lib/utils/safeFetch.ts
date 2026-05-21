/**
 * Fetch wrapper that throws on non-2xx responses and aborts after `timeout` ms.
 * signal is placed after spreading options to ensure the timeout signal works, unless overridden.
 */
export default async function safeFetch(
    input: RequestInfo | URL,
    options?: RequestInit,
    timeout = 10000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(`Timed out after ${timeout}ms`), timeout);

    try {
        const req = await fetch(input, {
            ...options,
            signal: options?.signal ?? controller.signal,
        });

        if (!req.ok) throw new Error(`Request returned non-ok: ${req.status} ${req.statusText}`);
        return req;
    } finally {
        clearTimeout(timeoutId);
    }
}
