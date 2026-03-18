import { ApiError } from "@/lib/api/client";

type ActionErrorOptions = {
  endpointLabel?: string;
};

export function getActionErrorMessage(
  error: unknown,
  fallbackMessage: string,
  options: ActionErrorOptions = {},
) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallbackMessage;
  }

  const endpointLabel = options.endpointLabel ? ` (${options.endpointLabel})` : "";

  if (error.status === 401 || error.status === 403) {
    return "No tienes permisos para realizar esta accion.";
  }

  if (error.status === 404 || error.status === 405) {
    return `El endpoint no esta disponible en este entorno${endpointLabel}.`;
  }

  if (error.status === 409) {
    return "No se pudo completar la accion por conflicto de datos.";
  }

  if (error.status === 422) {
    return "Los datos enviados no son validos para esta accion.";
  }

  if (error.status === 429) {
    return "Demasiadas solicitudes al backend. Intenta nuevamente en unos segundos.";
  }

  if (error.status >= 500) {
    return "El backend no esta disponible temporalmente. Intenta de nuevo mas tarde.";
  }

  return error.message || fallbackMessage;
}
