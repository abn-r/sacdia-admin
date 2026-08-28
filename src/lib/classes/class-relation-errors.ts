import { ApiError } from "@/lib/api/client";

/**
 * Friendly Spanish messages for backend error codes surfaced by the
 * class-honors / class-prerequisites admin endpoints. Falls back to the
 * backend message (or a generic message) when the code is unmapped, since
 * translations for these new codes are not registered in the backend i18n
 * catalog yet (message would otherwise echo the raw ErrorCode string).
 */
const CLASS_RELATION_ERROR_MESSAGES: Record<string, string> = {
  ADMIN_CLASS_HONOR_DUPLICATE:
    "Esta especialidad ya está asociada a la clase con ese tipo de relación.",
  ADMIN_CLASS_HONOR_NOT_FOUND: "La relación de especialidad ya no existe.",
  ADMIN_CLASS_MODULE_NOT_FOUND:
    "El módulo no existe, está inactivo o no pertenece a esta clase.",
  ADMIN_HONOR_NOT_FOUND_CATALOG:
    "La especialidad seleccionada no existe en el catálogo.",
  ADMIN_CLASS_PREREQUISITE_CYCLE:
    "Crearía un ciclo de prerrequisitos entre clases.",
  ADMIN_CLASS_PREREQUISITE_DUPLICATE:
    "Esta clase ya está registrada como prerrequisito.",
  ADMIN_CLASS_PREREQUISITE_NOT_FOUND: "El prerrequisito ya no existe.",
  CLASS_NOT_FOUND: "La clase no existe o fue desactivada.",
};

function extractErrorCode(error: ApiError): string | undefined {
  const payload = error.payload;
  if (payload && typeof payload === "object" && "code" in payload) {
    const code = (payload as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function getClassRelationErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof ApiError) {
    const code = extractErrorCode(error);
    if (code && CLASS_RELATION_ERROR_MESSAGES[code]) {
      return CLASS_RELATION_ERROR_MESSAGES[code];
    }
    if (error.status === 401 || error.status === 403) {
      return "No tienes permisos para realizar esta acción.";
    }
    if (error.status === 404) {
      return "El registro no existe o ya fue eliminado.";
    }
    return error.message || fallback;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}
