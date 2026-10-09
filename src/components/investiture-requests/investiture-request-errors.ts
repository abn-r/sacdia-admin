import { ApiError } from "@/lib/api/client";

/**
 * Backend error code -> `investiture_requests.errors.*` translation key.
 * Covers the authorization flow (requests, field window, class threshold,
 * district pastors) and the class-duration guards that surface in it.
 */
export const INVESTITURE_REQUEST_ERROR_KEYS = {
  // Duration guards
  INVESTITURE_DURATION_MIN_NOT_MET: "errors.duration_min_not_met",
  INVESTITURE_DURATION_EXPIRED: "errors.duration_expired",
  // Class threshold (field percentage)
  CLASS_THRESHOLD_EDIT_CLOSED: "errors.class_threshold_edit_closed",
  CLASS_THRESHOLD_FIELD_NOT_FOUND: "errors.class_threshold_field_not_found",
  CLASS_THRESHOLD_YEAR_NOT_FOUND: "errors.class_threshold_year_not_found",
  CLASS_THRESHOLD_PERCENT_INVALID: "errors.class_threshold_percent_invalid",
  // Field window
  INVESTITURE_WINDOW_EDIT_CLOSED: "errors.window_edit_closed",
  INVESTITURE_WINDOW_FIELD_NOT_FOUND: "errors.window_field_not_found",
  INVESTITURE_WINDOW_YEAR_NOT_FOUND: "errors.window_year_not_found",
  INVESTITURE_WINDOW_DATE_INVALID: "errors.window_date_invalid",
  INVESTITURE_WINDOW_OUTSIDE_YEAR: "errors.window_outside_year",
  INVESTITURE_WINDOW_START_AFTER_END: "errors.window_start_after_end",
  // District pastors
  INVESTITURE_PASTOR_QUOTA_INVALID: "errors.pastor_quota_invalid",
  INVESTITURE_PASTOR_QUOTA_BELOW_ASSIGNMENTS: "errors.pastor_quota_below_assignments",
  INVESTITURE_PASTOR_QUOTA_FULL: "errors.pastor_quota_full",
  INVESTITURE_PASTOR_ALREADY_ASSIGNED: "errors.pastor_already_assigned",
  INVESTITURE_PASTOR_ROLE_REQUIRED: "errors.pastor_role_required",
  INVESTITURE_PASTOR_USER_NOT_FOUND: "errors.pastor_user_not_found",
  INVESTITURE_PASTOR_DISTRICT_NOT_FOUND: "errors.pastor_district_not_found",
  INVESTITURE_PASTOR_CLUB_NOT_FOUND: "errors.pastor_club_not_found",
  INVESTITURE_PASTOR_CHURCH_NOT_FOUND: "errors.pastor_church_not_found",
  INVESTITURE_PASTOR_NOT_ASSIGNED: "errors.pastor_not_assigned",
  // Authorization requests
  INVESTITURE_REQUEST_FORBIDDEN: "errors.request_forbidden",
  INVESTITURE_REQUEST_TIME_ZONE_INVALID: "errors.time_zone_invalid",
  INVESTITURE_REQUEST_SECTION_NOT_FOUND: "errors.section_not_found",
  INVESTITURE_REQUEST_OUTSIDE_SECTION: "errors.outside_section",
  INVESTITURE_REQUEST_WINDOW_CLOSED: "errors.window_closed",
  INVESTITURE_REQUEST_DATE_OUTSIDE_WINDOW: "errors.date_outside_window",
  INVESTITURE_REQUEST_DATE_OUTSIDE_YEAR: "errors.date_outside_year",
  INVESTITURE_REQUEST_DATE_INVALID: "errors.date_invalid",
  INVESTITURE_REQUEST_YEAR_CLOSED: "errors.year_closed",
  INVESTITURE_REQUEST_NOT_ELIGIBLE: "errors.not_eligible",
  INVESTITURE_REQUEST_CLASS_NOT_ELIGIBLE: "errors.class_not_eligible",
  INVESTITURE_REQUEST_ALREADY_INVESTED: "errors.already_invested",
  INVESTITURE_REQUEST_LEGACY_PIPELINE_ACTIVE: "errors.legacy_pipeline_active",
  INVESTITURE_REQUEST_ACTIVE_EXISTS: "errors.active_exists",
  INVESTITURE_REQUEST_NOT_OPERATIONAL: "errors.not_operational",
  INVESTITURE_REQUEST_NOT_PENDING: "errors.not_pending",
  INVESTITURE_REQUEST_PROGRESS_LOCKED: "errors.progress_locked",
  INVESTITURE_REQUEST_NOT_FOUND: "errors.not_found",
  INVESTITURE_REQUEST_EMPTY: "errors.empty",
  INVESTITURE_REQUEST_STALE: "errors.stale",
  INVESTITURE_REQUEST_ALREADY_RESOLVED: "errors.already_resolved",
  INVESTITURE_REQUEST_REASON_REQUIRED: "errors.reason_required",
  INVESTITURE_REQUEST_CONFLICTING_DECISION: "errors.conflicting_decision",
  INVESTITURE_REQUEST_TEXT_TOO_LONG: "errors.text_too_long",
} as const;

export type InvestitureRequestErrorCode = keyof typeof INVESTITURE_REQUEST_ERROR_KEYS;

export type InvestitureRequestErrorKey =
  | (typeof INVESTITURE_REQUEST_ERROR_KEYS)[InvestitureRequestErrorCode]
  | "errors.forbidden"
  | "errors.generic";

export type InvestitureRequestErrorTranslator = (key: InvestitureRequestErrorKey) => string;

function isKnownCode(code: string): code is InvestitureRequestErrorCode {
  return Object.prototype.hasOwnProperty.call(INVESTITURE_REQUEST_ERROR_KEYS, code);
}

export function getInvestitureRequestErrorCode(error: unknown): string | null {
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

/** Message for a bare code (e.g. `blocked[].code` of a partial resolution). */
export function getInvestitureRequestErrorMessageByCode(
  code: string,
  t: InvestitureRequestErrorTranslator,
): string {
  return t(isKnownCode(code) ? INVESTITURE_REQUEST_ERROR_KEYS[code] : "errors.generic");
}

export function getInvestitureRequestErrorMessage(
  error: unknown,
  t: InvestitureRequestErrorTranslator,
): string {
  const code = getInvestitureRequestErrorCode(error);

  if (code && isKnownCode(code)) {
    return t(INVESTITURE_REQUEST_ERROR_KEYS[code]);
  }

  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t("errors.forbidden");
    }
    if (error.message) return error.message;
  }

  return t("errors.generic");
}
