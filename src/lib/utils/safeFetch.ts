/**
 * Fetch wrapper that:
 * - Throws on non-2xx responses
 * - Aborts after `timeout` ms (default 10 s)
 * - Always clears the timeout timer (no leak on success or failure)
 *
 * Note: `signal` is applied before spreading `options` so that a user-supplied
 * signal cannot accidentally override the abort controller.
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
            signal: controller.signal,
            ...options,
        });

        if (!req.ok) throw new Error(`Request returned non-ok: ${req.status} ${req.statusText}`);
        return req;
    } finally {
        clearTimeout(timeoutId);
    }
}
