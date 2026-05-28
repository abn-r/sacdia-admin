import type { LocalField } from "@/lib/api/geography";
import type { AuthUser } from "@/lib/auth/types";

export function resolveInitialLocalFieldId(
  user: AuthUser,
  localFields: LocalField[],
): number | undefined {
  const scopedLocalFieldId = getUserLocalFieldId(user);
  if (
    scopedLocalFieldId !== undefined &&
    localFields.some((field) => field.local_field_id === scopedLocalFieldId)
  ) {
    return scopedLocalFieldId;
  }

  return localFields[0]?.local_field_id;
}

function getUserLocalFieldId(user: AuthUser): number | undefined {
  const effectiveScope = asRecord(user.authorization?.effective?.scope);
  const globalScope = asRecord(effectiveScope?.global);
  const localFieldScope = asRecord(globalScope?.local_field);

  return (
    toNumber(localFieldScope?.id) ??
    toNumber(user.local_field_id) ??
    undefined
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}
