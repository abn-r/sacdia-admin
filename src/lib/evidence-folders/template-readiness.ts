/**
 * How far a template draft is from being publishable: the sections must add up
 * exactly to the points the Progreso anual gives to the folder.
 */
export type PublishReadiness =
  | { state: "noConfig"; total: number }
  | { state: "ready"; total: number; required: number }
  | { state: "missing"; total: number; required: number; diff: number }
  | { state: "excess"; total: number; required: number; diff: number };

export function publishReadiness(
  total: number,
  required: number | null,
): PublishReadiness {
  if (required == null) return { state: "noConfig", total };
  if (total === required) return { state: "ready", total, required };
  if (total < required) {
    return { state: "missing", total, required, diff: required - total };
  }
  return { state: "excess", total, required, diff: total - required };
}

export function canPublish(readiness: PublishReadiness): boolean {
  return readiness.state === "ready";
}
