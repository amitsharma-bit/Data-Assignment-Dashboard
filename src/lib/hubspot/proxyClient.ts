const ACCESS_KEY_STORAGE_KEY = "dashboard_access_key";
const MAX_RETRIES = 5;

export function getAccessKey(): string {
  return localStorage.getItem(ACCESS_KEY_STORAGE_KEY) ?? "";
}

export function setAccessKey(key: string) {
  if (key) localStorage.setItem(ACCESS_KEY_STORAGE_KEY, key);
  else localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ProxyUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized — check the dashboard access key in Settings.");
  }
}

/** Logs the real error to the console (for debugging) and returns a clean message for the UI. */
export function friendlyErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ProxyUnauthorizedError) return err.message;
  console.error(err);
  return fallback;
}

/**
 * Calls our own /api/hubspot serverless proxy (same-origin, no CORS issue)
 * instead of api.hubapi.com directly. Retries on 429/5xx with backoff since
 * a full sync makes hundreds of these calls back-to-back.
 */
export async function hubspotProxyFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let attempt = 0;

  while (true) {
    const res = await fetch("/api/hubspot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getAccessKey() ? { "x-dashboard-key": getAccessKey() } : {}),
      },
      body: JSON.stringify({ path, method: init.method ?? "GET", body: init.body }),
    });

    if (res.ok) return (await res.json()) as T;

    if (res.status === 401) throw new ProxyUnauthorizedError();

    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      attempt += 1;
      await sleep(Math.min(30_000, 500 * 2 ** attempt));
      continue;
    }

    const errBody = await res.text();
    throw new Error(`Proxy error ${res.status} on ${path}: ${errBody}`);
  }
}
