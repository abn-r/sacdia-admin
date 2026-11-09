// Server-only helper: forwards the real client IP to the backend.
// Only called from the server branch of apiRequest (never from the browser).
// ADMIN_PROXY_SECRET is a server env var (no NEXT_PUBLIC_), so Next never
// inlines it into the browser bundle.

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6 = /^[0-9a-fA-F:.]+$/;

// Small pure validator (no `net` import so it is safe in any bundle).
export function isIpLiteral(value: string): boolean {
  if (IPV4.test(value)) return true;
  if (!value.includes(":") || !IPV6.test(value)) return false;
  // Reject triple colons, multiple "::" and over-long groups.
  if (value.includes(":::") || value.split("::").length > 2) return false;
  const hasV4Tail = value.includes(".");
  const lastColon = value.lastIndexOf(":");
  if (hasV4Tail && !IPV4.test(value.slice(lastColon + 1))) return false;
  const head = hasV4Tail ? value.slice(0, lastColon + 1) + "0" : value;
  const groups = head.split(":");
  if (groups.some((g) => g.length > 4)) return false;
  const compressed = head.includes("::");
  // A v4 tail was replaced by one placeholder group above, so it counts as 1 group.
  const count = groups.filter((g) => g.length > 0).length;
  return compressed ? count <= 7 : groups.length === 8 && groups.every((g) => g.length > 0);
}

// Vercel overwrites x-real-ip and x-forwarded-for with the real client IP,
// so they cannot be spoofed by the caller.
export function pickClientIp(source: Pick<Headers, "get">): string | undefined {
  const candidates = [
    source.get("x-real-ip"),
    source.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const raw of candidates) {
    const ip = raw?.trim();
    if (ip && isIpLiteral(ip)) return ip;
  }
  return undefined;
}

// Returns the trusted-proxy headers, or {} when they cannot be built.
export async function getForwardedClientIpHeaders(): Promise<Record<string, string>> {
  const secret = process.env.ADMIN_PROXY_SECRET;
  if (!secret) return {};

  try {
    const { headers } = await import("next/headers");
    const ip = pickClientIp(await headers());
    if (!ip) return {};
    return { "x-sacdia-client-ip": ip, "x-sacdia-proxy-secret": secret };
  } catch {
    // headers() throws outside a request scope (build, static generation).
    return {};
  }
}
