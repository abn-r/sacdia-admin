import { ApiError } from "@/lib/api/client";

type ActionErrorOptions = {
  endpointLabel?: string;
};

const DOMAIN_ERROR_MESSAGES: Record<string, string> = {
  CAMPOREE_EVENT_RESPONSIBLE_REQUIRED:
    "Para publicar hace falta un responsable del roster de personal del camporee. El nombre o usuario de la ficha no alcanza. Guarda el evento como Programado.",
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

export function getActionErrorMessage(
  error: unknown,
  fallbackMessage: string,
  options: ActionErrorOptions = {},
) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallbackMessage;
  }

  const endpointLabel = options.endpointLabel ? ` (${options.endpointLabel})` : "";
  const domainCode = extractErrorCode(error);
  if (domainCode && DOMAIN_ERROR_MESSAGES[domainCode]) {
    return DOMAIN_ERROR_MESSAGES[domainCode];
  }

  if (error.status === 401 || error.status === 403) {
    return "No tienes permisos para realizar esta acción.";
  }

  if (error.status === 404 || error.status === 405) {
    return `El endpoint no está disponible en este entorno${endpointLabel}.`;
  }

  if (error.status === 409) {
    return "No se pudo completar la acción por conflicto de datos.";
  }

  if (error.status === 422) {
    return "Los datos enviados no son válidos para esta acción.";
  }

  if (error.status === 429) {
    return "Demasiadas solicitudes al backend. Intenta nuevamente en unos segundos.";
  }

  if (error.status >= 500) {
    return "El backend no está disponible temporalmente. Intenta de nuevo más tarde.";
  }

  return error.message || fallbackMessage;
}
