import { redirect } from "next/navigation";
import { toV2Path } from "@/lib/v2/route-map";

/**
 * Server-side redirect that preserves the v2 panel when the caller lives under
 * `/v2/dashboard/*`. Pass canonical v1 dashboard paths (`/dashboard/...`).
 */
export function panelRedirect(path: string): never {
  const normalized =
    path.startsWith("/dashboard") || path === "/dashboard"
      ? path
      : path.startsWith("/")
        ? `/dashboard${path}`
        : `/dashboard/${path}`;
  redirect(toV2Path(normalized));
}
