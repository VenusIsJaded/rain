// A really basic fetch wrapper which throws on non-ok response codes
export default async function safeFetch(input: RequestInfo | URL, options?: RequestInit, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(`Timed out after ${timeout}ms`), timeout);

    try {
        const req = await fetch(input, {
            signal: controller.signal,
            ...options
        });

        if (!req.ok) throw new Error(`Request returned non-ok: ${req.status} ${req.statusText}`);
        return req;
    } finally {
        clearTimeout(timeoutId);
    }
}
