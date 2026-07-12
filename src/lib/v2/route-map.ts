const V2_PREFIX = "/v2/dashboard";
const V1_PREFIX = "/dashboard";

/** Map a v1 dashboard path to its v2 equivalent. */
export function toV2Path(v1Path: string): string {
  if (v1Path.startsWith(V2_PREFIX)) return v1Path;
  if (v1Path === V1_PREFIX) return V2_PREFIX;
  if (v1Path.startsWith(`${V1_PREFIX}/`)) {
    return `${V2_PREFIX}${v1Path.slice(V1_PREFIX.length)}`;
  }
  return `${V2_PREFIX}${v1Path.startsWith("/") ? v1Path : `/${v1Path}`}`;
}

/** Map a v2 dashboard path back to v1. */
export function toV1Path(v2Path: string): string {
  if (v2Path.startsWith(V1_PREFIX) && !v2Path.startsWith(V2_PREFIX)) {
    return v2Path;
  }
  if (v2Path === V2_PREFIX) return V1_PREFIX;
  if (v2Path.startsWith(`${V2_PREFIX}/`)) {
    return `${V1_PREFIX}${v2Path.slice(V2_PREFIX.length)}`;
  }
  return v2Path;
}

/** Rewrite internal links inside feature content when rendering in v2. */
export function rewriteHrefForV2(href: string): string {
  if (!href.startsWith("/dashboard")) return href;
  if (href.startsWith(V2_PREFIX)) return href;
  return toV2Path(href);
}

export const V2_DASHBOARD_HOME = V2_PREFIX;
export const V1_DASHBOARD_HOME = V1_PREFIX;
