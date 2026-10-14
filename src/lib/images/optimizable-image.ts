/**
 * Decides whether an image `src` may go through the Next.js image optimizer
 * (`/_next/image`) or must be served as-is.
 *
 * Optimizing is only worthwhile (and safe) for stable, public URLs on a host
 * declared in `images.remotePatterns` (next.config.ts), or for same-origin
 * static assets under /public.
 *
 * Everything else is served untouched (`unoptimized`):
 * - `blob:` / `data:` -> local upload previews, nothing to fetch remotely.
 * - `.svg`            -> vector, optimizer would not shrink it.
 * - Presigned URLs    -> the signature query changes on every request, so the
 *                        optimizer cache would never hit, and the expiring
 *                        credentials would end up in the cache key.
 * - Unknown hosts     -> next/image throws in dev and answers 400 in prod for
 *                        hosts missing from `remotePatterns`.
 */

/**
 * Public hosts that are safe to optimize. Keep in sync with
 * `images.remotePatterns` in next.config.ts (a unit test enforces it).
 * The private r2.cloudflarestorage.com endpoint is deliberately absent: it only
 * serves presigned URLs.
 */
export const OPTIMIZABLE_IMAGE_HOSTS: readonly string[] = [
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
  "pub-c8aa231ae66c46ff96fc5e811994d9d2.r2.dev",
  "pub-c0e79f5fa4634581867fab5b0fed605c.r2.dev",
];

const SIGNED_QUERY_PARAMS = [
  "x-amz-signature",
  "x-amz-credential",
  "x-amz-algorithm",
  "x-amz-security-token",
  "signature",
  "expires",
];

function isSignedUrl(url: URL): boolean {
  for (const key of url.searchParams.keys()) {
    if (SIGNED_QUERY_PARAMS.includes(key.toLowerCase())) return true;
  }
  return false;
}

export function shouldOptimizeImage(src: string): boolean {
  const value = src.trim();
  if (!value) return false;

  if (value.startsWith("blob:") || value.startsWith("data:")) return false;

  // Same-origin static asset (e.g. /img/logos-clases/AV-01.png). `//host/..`
  // is protocol-relative, i.e. remote, so it is not a local path.
  if (value.startsWith("/") && !value.startsWith("//")) {
    return !/\.svg(\?|#|$)/i.test(value);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;
  if (url.pathname.toLowerCase().endsWith(".svg")) return false;
  if (!OPTIMIZABLE_IMAGE_HOSTS.includes(url.hostname)) return false;
  if (isSignedUrl(url)) return false;

  return true;
}
