"use server";

import { getTranslations } from "next-intl/server";
import { apiRequest, ApiError } from "@/lib/api/client";

export type VerifyEmailState = {
  error?: string;
  /** The link can't be used again (invalid, expired or already used). */
  linkInvalid?: boolean;
  success?: boolean;
};

const INVALID_LINK_CODES = new Set([
  "AUTH_EMAIL_VERIFICATION_TOKEN_INVALID",
  "AUTH_EMAIL_VERIFICATION_TOKEN_EXPIRED",
]);

function errorCode(error: ApiError): string | undefined {
  const payload = error.payload;
  if (payload && typeof payload === "object" && "code" in payload) {
    const code = (payload as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * Confirms the email with the token from the verification email
 * (`POST /auth/verify-email/confirm`). Public: the person may be signed out.
 */
export async function verifyEmailAction(
  _prev: VerifyEmailState,
  formData: FormData,
): Promise<VerifyEmailState> {
  const t = await getTranslations("auth.verify_email");

  const token = String(formData.get("token") ?? "").trim();
  if (!token) {
    return { linkInvalid: true };
  }

  try {
    await apiRequest("/auth/verify-email/confirm", {
      method: "POST",
      body: { token },
      cache: "no-store",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      const code = errorCode(error);
      if (code && INVALID_LINK_CODES.has(code)) {
        return { linkInvalid: true };
      }
      if (error.status === 429) {
        return { error: t("errors.too_many_attempts") };
      }
    }
    return { error: t("errors.generic") };
  }
}
