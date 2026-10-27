"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  getConsentErrorCode,
  toConsentErrorCode,
} from "@/lib/api/membership-requests";

type FallbackKey = "generic" | "upload" | "verify" | "approve" | "evidence_load";

/**
 * Maps a failed consent request (or an `approve_error` code string) to a
 * translated message. Only the machine `code` is read: error `details` are
 * dropped by the backend in production, and the raw server message is not
 * localized for the admin locale.
 */
export function useConsentErrorMessage() {
  const t = useTranslations("membership.consent.errors");

  return useCallback(
    (source: unknown, fallback: FallbackKey = "generic"): string => {
      const code =
        typeof source === "string"
          ? toConsentErrorCode(source)
          : getConsentErrorCode(source);
      return t(code ?? fallback);
    },
    [t],
  );
}
