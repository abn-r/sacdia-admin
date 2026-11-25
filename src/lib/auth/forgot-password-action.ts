"use server";

import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { apiRequest, ApiError } from "@/lib/api/client";

export type ForgotPasswordState = {
  error?: string;
  /** Always the same message, whether or not the email has an account. */
  sent?: boolean;
};

/**
 * Asks for a password reset link (`POST /auth/password/reset-request`).
 * Public. The backend answers 200 for any well-formed email, so the screen
 * never reveals whether an account exists: only throttling (429) and
 * transport failures (network or 5xx) are shown, and neither depends on the
 * address.
 */
export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const t = await getTranslations("admin.access.forgot");

  const parsed = z
    .string()
    .trim()
    .email()
    .max(254)
    .safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) {
    return { error: t("errors.emailInvalid") };
  }

  try {
    await apiRequest("/auth/password/reset-request", {
      method: "POST",
      body: { email: parsed.data },
      cache: "no-store",
    });
    return { sent: true };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) return { error: t("errors.tooManyAttempts") };
      // 4xx other than throttling (e.g. the backend failed to queue the mail
      // for this address) must look like success: it would leak the account.
      if (error.status >= 400 && error.status < 500) return { sent: true };
    }
    return { error: t("errors.generic") };
  }
}
