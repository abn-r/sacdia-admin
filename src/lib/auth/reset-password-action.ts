"use server";

import { getTranslations } from "next-intl/server";
import { apiRequest, ApiError } from "@/lib/api/client";
import { apiErrorCode } from "@/lib/api/error-code";
import {
  checkNewPassword,
  type PasswordPolicyIssue,
} from "@/lib/auth/password-policy";

// Literal keys: a `policy.${issue}` template makes next-intl's key union too
// complex for TypeScript.
const POLICY_MESSAGE_KEYS = {
  required: "policy.required",
  min_length: "policy.min_length",
  max_length: "policy.max_length",
  uppercase: "policy.uppercase",
  lowercase: "policy.lowercase",
  number: "policy.number",
  special: "policy.special",
  first_char: "policy.first_char",
} as const satisfies Record<PasswordPolicyIssue, string>;

export type ResetPasswordState = {
  error?: string;
  /** The link can't be used again (invalid, expired or already used). */
  linkInvalid?: boolean;
  success?: boolean;
};

const INVALID_LINK_CODES = new Set([
  "AUTH_PASSWORD_RESET_TOKEN_INVALID",
  "AUTH_PASSWORD_RESET_TOKEN_EXPIRED",
]);

/**
 * Sets a new password with the token from the reset email
 * (`POST /auth/password/reset`). Public: the person is signed out.
 */
export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const t = await getTranslations("auth.reset_password");

  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) {
    return { error: t("errors.link_invalid"), linkInvalid: true };
  }

  const issue = checkNewPassword(password);
  if (issue) {
    return { error: t(POLICY_MESSAGE_KEYS[issue]) };
  }
  if (password !== confirm) {
    return { error: t("errors.mismatch") };
  }

  try {
    await apiRequest("/auth/password/reset", {
      method: "POST",
      body: { token, password },
      cache: "no-store",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      const code = apiErrorCode(error);
      if (code && INVALID_LINK_CODES.has(code)) {
        return { error: t("errors.link_invalid"), linkInvalid: true };
      }
      if (error.status === 429) {
        return { error: t("errors.too_many_attempts") };
      }
      if (error.status === 400) {
        return { error: t("errors.password_rejected") };
      }
    }
    return { error: t("errors.generic") };
  }
}
