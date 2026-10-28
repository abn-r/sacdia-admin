/**
 * Role-name rules, mirrored from the backend `CreateRoleDto`
 * (sacdia-backend/src/rbac/dto/create-role.dto.ts):
 *   @MinLength(3) @MaxLength(64) @Matches(/^[a-z][a-z-]*[a-z]$/)
 * Digits are NOT allowed. Keep both in sync.
 */
export const ROLE_NAME_MIN_LENGTH = 3;
export const ROLE_NAME_MAX_LENGTH = 64;
export const ROLE_NAME_REGEX = /^[a-z][a-z-]*[a-z]$/;
export const RESERVED_ROLE_NAME = "super-admin";

export type RoleNameValidationError = "required" | "format" | "reserved";

/** Returns the first rule the (already trimmed) name breaks, or `null` if valid. */
export function validateRoleName(roleName: string): RoleNameValidationError | null {
  if (!roleName) return "required";
  if (
    roleName.length < ROLE_NAME_MIN_LENGTH ||
    roleName.length > ROLE_NAME_MAX_LENGTH ||
    !ROLE_NAME_REGEX.test(roleName)
  ) {
    return "format";
  }
  if (roleName === RESERVED_ROLE_NAME) return "reserved";
  return null;
}

/**
 * True when a backend error is a 400/422 DTO validation failure about
 * `role_name` (raw text like "role_name debe contener solo ..."), so the UI can
 * show its localized message on the field instead of the raw backend string.
 */
export function isRoleNameValidationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { status, message, payload } = error as {
    status?: unknown;
    message?: unknown;
    payload?: unknown;
  };
  if (status !== 400 && status !== 422) return false;
  let haystack = typeof message === "string" ? message : "";
  try {
    haystack += ` ${JSON.stringify(payload ?? "")}`;
  } catch {
    // unserializable payload: rely on the message alone
  }
  return haystack.includes("role_name");
}
