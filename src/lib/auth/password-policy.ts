/**
 * Policy for a NEW password. Mirrors the backend `NEW_PASSWORD_COMPLEXITY`
 * (sacdia-backend/src/auth/password-policy.ts) so the form never sends a
 * password the API rejects.
 */
export const NEW_PASSWORD_MIN_LENGTH = 12;
export const NEW_PASSWORD_MAX_LENGTH = 128;
export const NEW_PASSWORD_SPECIAL_CHARS = "@$!%*?&";

export type PasswordPolicyIssue =
  | "required"
  | "min_length"
  | "max_length"
  | "uppercase"
  | "lowercase"
  | "number"
  | "special"
  | "first_char";

/** First rule the password breaks, or `null` when it is valid. */
export function checkNewPassword(value: string): PasswordPolicyIssue | null {
  if (!value) return "required";
  if (value.length < NEW_PASSWORD_MIN_LENGTH) return "min_length";
  if (value.length > NEW_PASSWORD_MAX_LENGTH) return "max_length";
  if (!/[A-Z]/.test(value)) return "uppercase";
  if (!/[a-z]/.test(value)) return "lowercase";
  if (!/[0-9]/.test(value)) return "number";
  if (!/[@$!%*?&]/.test(value)) return "special";
  if (!/^[A-Za-z0-9@$!%*?&]/.test(value)) return "first_char";
  return null;
}
