"use client";

import { useCallback, useMemo } from "react";

import { usePermissions } from "@/lib/auth/use-permissions";

import { canCapability, canViewScreen } from "./index";
import type { AccessSubject } from "./types";

/** Client-side twin of `canCapability` / `canViewScreen`; same evaluator. */
export function useScreenAccess() {
  const { permissions, roles, isSuperAdmin } = usePermissions();

  const subject = useMemo<AccessSubject>(
    () => ({ permissions, roles, isSuperAdmin }),
    [permissions, roles, isSuperAdmin],
  );

  const can = useCallback(
    (screenId: string, capabilityId: string) =>
      canCapability(subject, screenId, capabilityId),
    [subject],
  );

  const canView = useCallback(
    (screenId: string) => canViewScreen(subject, screenId),
    [subject],
  );

  return { subject, canCapability: can, canViewScreen: canView };
}

export function useCanCapability(screenId: string, capabilityId: string): boolean {
  const { canCapability: can } = useScreenAccess();
  return can(screenId, capabilityId);
}
