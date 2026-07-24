export const config = { runtime: "edge" };

/**
 * The only server-side code in this app. Its sole job is to hold the
 * HubSpot token (never sent to the browser) and forward whitelisted
 * requests to HubSpot's API. No database, no sessions — the frontend is a
 * static app that caches everything it pulls into the browser's own
 * IndexedDB (see src/lib/db.ts).
 *
 * Same-origin only: the browser calls this path on its own domain, so
 * there's no CORS issue here. HubSpot's API itself does not allow direct
 * browser calls with a private app token, which is why this proxy exists
 * at all.
 */
const ALLOWED_PATH_PREFIXES = [
  "/crm/v3/objects/companies",
  "/crm/v3/properties/companies",
  "/crm/v3/owners",
  "/settings/v3/users/teams",
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const requiredKey = process.env.DASHBOARD_ACCESS_KEY;
  if (requiredKey) {
    const provided = request.headers.get("x-dashboard-key");
    if (provided !== requiredKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: HUBSPOT_ACCESS_TOKEN is not set" }),
      { status: 500 },
    );
  }

  let payload: { path?: string; method?: string; body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { path, method = "GET", body } = payload;
  if (!path || !isAllowedPath(path)) {
    return new Response(JSON.stringify({ error: `Path not allowed: ${path}` }), { status: 400 });
  }

  const hubspotRes = await fetch(`https://api.hubapi.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: method !== "GET" && body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await hubspotRes.text();
  return new Response(text, {
    status: hubspotRes.status,
    headers: { "Content-Type": "application/json" },
  });
}
