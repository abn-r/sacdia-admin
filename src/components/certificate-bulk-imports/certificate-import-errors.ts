import { ApiError } from "@/lib/api/client";

/** Backend code -> `certificate_bulk_imports.errors.*` translation key. */
export const CERTIFICATE_IMPORT_ERROR_KEYS = {
  CERTIFICATE_IMPORT_AUTHORIZATION_PENDING: "authorization_pending",
  CERTIFICATE_IMPORT_ENDED_YEAR_FIELD_FORBIDDEN: "ended_year_field_forbidden",
} as const;

export type CertificateImportErrorCode = keyof typeof CERTIFICATE_IMPORT_ERROR_KEYS;
export type CertificateImportErrorKey =
  (typeof CERTIFICATE_IMPORT_ERROR_KEYS)[CertificateImportErrorCode];
export type CertificateImportErrorTranslator = (key: CertificateImportErrorKey) => string;

function isKnownCode(code: string): code is CertificateImportErrorCode {
  return Object.prototype.hasOwnProperty.call(CERTIFICATE_IMPORT_ERROR_KEYS, code);
}

export function getCertificateImportErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== "object") {
    return null;
  }

  const payload = error.payload as {
    code?: unknown;
    error?: { code?: unknown };
    errors?: { code?: unknown };
  };

  if (typeof payload.code === "string") return payload.code;
  if (typeof payload.error?.code === "string") return payload.error.code;
  if (typeof payload.errors?.code === "string") return payload.errors.code;
  return null;
}

/**
 * Message for a failed approve/reject call: known investiture-related codes get
 * the closed text, any other API error keeps the backend message, and anything
 * else uses `fallback`.
 */
export function getCertificateImportErrorMessage(
  error: unknown,
  t: CertificateImportErrorTranslator,
  fallback: string,
): string {
  const code = getCertificateImportErrorCode(error);
  if (code && isKnownCode(code)) return t(CERTIFICATE_IMPORT_ERROR_KEYS[code]);
  if (error instanceof ApiError && error.message) return error.message;
  return fallback;
}

/**
 * The reviewer must resolve the pending authorization before approving, so the
 * message stays visible in the dialog instead of vanishing as a toast.
 */
export function isCertificateImportInlineError(error: unknown): boolean {
  return getCertificateImportErrorCode(error) === "CERTIFICATE_IMPORT_AUTHORIZATION_PENDING";
}
