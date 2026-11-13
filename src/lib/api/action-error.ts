import { ApiError } from "@/lib/api/client";

type ActionErrorOptions = {
  endpointLabel?: string;
};

const DOMAIN_ERROR_MESSAGES: Record<string, string> = {
  CLUB_DIRECTOR_PLAN_WINDOW_CLOSED:
    "La designación del director del próximo año solo se puede hacer entre el 1 de octubre y el 31 de diciembre.",
  CLUB_ROLE_MUTATION_FORBIDDEN:
    "No tienes autoridad sobre los cargos de esta sección. Pídele a quien la tenga que haga el cambio.",
  CLUB_ROLE_GUIDE_MAJOR_REQUIRED:
    "El sucesor debe ser Guía Mayor para ser director. Elige a otro miembro o completa su investidura.",
  CLUB_DIRECTOR_PLAN_YEAR_INVALID:
    "El año eclesiástico indicado no es válido para designar al director.",
  MR_CONSENT_NOT_VERIFIED:
    "El miembro es menor y el consentimiento de su tutor aún no está verificado. Verifica el consentimiento del tutor antes de activar el rol.",
  CAMPOREE_EVENT_RESPONSIBLE_REQUIRED:
    "Para publicar hace falta un responsable del roster de personal del camporee. El nombre o usuario de la ficha no alcanza. Asígnalo en Personal asignado (paso Responsable y preparación), guarda las asignaciones y vuelve a publicar.",
  CAMPOREE_STAFF_DUPLICATE:
    "Esa persona ya está activa en el roster de personal de este camporee.",
  CAMPOREE_STAFF_MEMBER_NOT_FOUND:
    "El miembro del personal ya no existe. Actualiza la lista.",
  CAMPOREE_STAFF_SCOPE_MISMATCH:
    "El miembro del personal no pertenece a este camporee.",
  CAMPOREE_EVENT_HONOR_NOT_FOUND:
    "Una de las especialidades seleccionadas no existe o está inactiva.",
  CAMPOREE_EVENT_HONOR_DUPLICATE:
    "Hay especialidades repetidas en la lista de preparación.",
  CAMPOREE_EVENT_HONOR_LIMIT:
    "Un evento admite como máximo 20 especialidades de preparación.",
};

function extractErrorCode(error: ApiError): string | undefined {
  const payload = error.payload;
  if (!payload || typeof payload !== "object") return undefined;
  const root = payload as { code?: unknown; error?: { code?: unknown } };
  if (typeof root.code === "string" && root.code.trim()) return root.code;
  const nested = root.error?.code;
  if (typeof nested === "string" && nested.trim()) return nested;
  return undefined;
}

/** Machine code of a failed request (`payload.code` or `payload.error.code`). */
export function getApiErrorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? extractErrorCode(error) : undefined;
}

export type ActionErrorKind =
  /** 401: no session / expired token. Never "no permissions". */
  | "unauthenticated"
  /** 403 or an authorization code (see `FORBIDDEN_CODES`). */
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "rate_limited"
  | "unavailable"
  | "other";

/** Why a request was forbidden, when the backend says so with a code. */
export type ForbiddenReason =
  /** `GUARD_PERMISSION_DENIED`: the actor lacks the permission/role. */
  | "permission"
  /** `GUARD_CLUB_SCOPE_REQUIRED`: the target is outside the active club scope. */
  | "club_scope"
  /** `ADMIN_USER_SCOPE_MISSING`: territorial role with no territory. */
  | "scope_missing"
  /** Any `*_FORBIDDEN` domain code (e.g. `CLUB_ROLE_MUTATION_FORBIDDEN`). */
  | "domain"
  /** Plain 403 without a recognised code. */
  | "status";

export type ActionErrorClassification = {
  kind: ActionErrorKind;
  status: number | null;
  code: string | undefined;
  forbiddenReason: ForbiddenReason | null;
};

const FORBIDDEN_CODE_REASONS: Record<string, ForbiddenReason> = {
  GUARD_PERMISSION_DENIED: "permission",
  GUARD_CLUB_SCOPE_REQUIRED: "club_scope",
  ADMIN_USER_SCOPE_MISSING: "scope_missing",
};

function forbiddenReasonFromCode(code: string | undefined): ForbiddenReason | null {
  if (!code) return null;
  if (FORBIDDEN_CODE_REASONS[code]) return FORBIDDEN_CODE_REASONS[code];
  if (code.endsWith("_FORBIDDEN")) return "domain";
  return null;
}

/**
 * Single classifier for failed requests. 401 and 403 are kept apart (a
 * missing session is not a missing permission), and the backend's
 * authorization codes (`GUARD_PERMISSION_DENIED`, `GUARD_CLUB_SCOPE_REQUIRED`,
 * `*_FORBIDDEN`, `ADMIN_USER_SCOPE_MISSING`) classify as `forbidden` even when
 * they arrive with another status. Feature modules keep their own copy but
 * decide through this.
 */
export function classifyActionError(error: unknown): ActionErrorClassification {
  if (!(error instanceof ApiError)) {
    return { kind: "other", status: null, code: undefined, forbiddenReason: null };
  }

  const code = extractErrorCode(error);
  const forbiddenReason = forbiddenReasonFromCode(code);
  const status = error.status;

  if (forbiddenReason) {
    return { kind: "forbidden", status, code, forbiddenReason };
  }
  if (status === 401) {
    return { kind: "unauthenticated", status, code, forbiddenReason: null };
  }
  if (status === 403) {
    return { kind: "forbidden", status, code, forbiddenReason: "status" };
  }
  if (status === 404 || status === 405) {
    return { kind: "not_found", status, code, forbiddenReason: null };
  }
  if (status === 409) {
    return { kind: "conflict", status, code, forbiddenReason: null };
  }
  if (status === 400 || status === 422) {
    return { kind: "validation", status, code, forbiddenReason: null };
  }
  if (status === 429) {
    return { kind: "rate_limited", status, code, forbiddenReason: null };
  }
  if (status >= 500) {
    return { kind: "unavailable", status, code, forbiddenReason: null };
  }
  return { kind: "other", status, code, forbiddenReason: null };
}

export function isForbiddenActionError(error: unknown): boolean {
  return classifyActionError(error).kind === "forbidden";
}

export function isUnauthenticatedActionError(error: unknown): boolean {
  return classifyActionError(error).kind === "unauthenticated";
}

/**
 * Endpoint banner state (`EndpointErrorBanner`) for a failed page load:
 * 401 and 403 both render as forbidden (with the login link decided by the
 * caller), 429 as rate-limited, anything else as missing.
 */
export function toEndpointState(
  error: unknown,
): "forbidden" | "missing" | "rate-limited" {
  const { kind } = classifyActionError(error);
  if (kind === "unauthenticated" || kind === "forbidden") return "forbidden";
  if (kind === "rate_limited") return "rate-limited";
  return "missing";
}

export const UNAUTHENTICATED_ACTION_MESSAGE = "Tu sesión expiró. Inicia sesión de nuevo.";
export const FORBIDDEN_ACTION_MESSAGE = "No tienes permisos para realizar esta acción.";

export function getActionErrorMessage(
  error: unknown,
  fallbackMessage: string,
  options: ActionErrorOptions = {},
) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallbackMessage;
  }

  const classification = classifyActionError(error);
  const domainCode = classification.code;
  if (domainCode && DOMAIN_ERROR_MESSAGES[domainCode]) {
    return DOMAIN_ERROR_MESSAGES[domainCode];
  }

  if (classification.kind === "unauthenticated") {
    return UNAUTHENTICATED_ACTION_MESSAGE;
  }

  if (classification.kind === "forbidden") {
    return FORBIDDEN_ACTION_MESSAGE;
  }

  if (error.status === 404 || error.status === 405) {
    // The route is for server logs only; users get a plain message.
    console.warn(
      `[action-error] ${error.status} on ${options.endpointLabel ?? "unknown route"}`,
    );
    return "Esta acción no está disponible en este momento.";
  }

  if (error.status === 409) {
    return "No se pudo completar la acción por conflicto de datos.";
  }

  if (error.status === 422) {
    return "Los datos enviados no son válidos para esta acción.";
  }

  if (error.status === 429) {
    return "Demasiadas solicitudes. Intenta nuevamente en unos segundos.";
  }

  if (error.status >= 500) {
    return "El servicio no está disponible temporalmente. Intenta de nuevo más tarde.";
  }

  return error.message || fallbackMessage;
}
