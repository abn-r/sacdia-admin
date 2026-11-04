import { getTranslations } from "next-intl/server";

import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/auth/types";

export type CapabilityGateResult =
  | { ok: true; user: AuthUser }
  | { ok: false; user: AuthUser; error: string; screenId: string; capabilityId: string };

/**
 * Server Action gate: the session user must hold the screen capability
 * (`canCapability`, same evaluator as the page and its buttons). Returns a
 * result instead of throwing so actions keep their `{ error }` state contract:
 *
 *   const gate = await requireCapability("clubs", "update");
 *   if (!gate.ok) return { error: gate.error };
 *
 * No session → `requireAdminUser` redirects as everywhere else.
 */
export async function requireCapability(
  screenId: string,
  capabilityId: string,
): Promise<CapabilityGateResult> {
  const user = await requireAdminUser();
  if (canCapability(user, screenId, capabilityId)) {
    return { ok: true, user };
  }

  const t = await getTranslations("shared.actionErrors");
  return {
    ok: false,
    user,
    error: t("forbidden"),
    screenId,
    capabilityId,
  };
}
