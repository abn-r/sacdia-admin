"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasAdminRole } from "@/lib/auth/roles";
import { apiRequest, ApiError } from "@/lib/api/client";
import { clearSession } from "@/lib/auth/session";
import type { AuthActionState, AuthUser, LoginResponse } from "@/lib/auth/types";

type AuthTranslator = Awaited<ReturnType<typeof getTranslations<"auth">>>;

const COOKIE_OPTIONS = {
  path: "/",
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
};

function buildLoginSchema(t: AuthTranslator) {
  return z.object({
    email: z.string().email(t("validation.email_invalid")),
    password: z.string().min(8, t("validation.password_min")),
  });
}

function getLoginErrorMessage(
  t: AuthTranslator,
  error: ApiError,
  step: "login" | "profile",
) {
  if (step === "login") {
    if (error.status === 400 || error.status === 401) {
      return t("errors.invalid_credentials");
    }

    if (error.status === 404) {
      console.warn("[auth] Login endpoint not found. Check NEXT_PUBLIC_API_URL configuration.");
      return t("errors.connection");
    }
  }

  if (step === "profile") {
    if (error.status === 401 || error.status === 403) {
      return t("errors.session_no_permissions");
    }

    if (error.status === 404) {
      console.warn("[auth] /auth/me returned 404. Check API configuration.");
      return t("errors.connection");
    }
  }

  if (error.status >= 500) {
    return t("errors.server_unavailable");
  }

  console.warn("[auth] Unhandled API error", { status: error.status, step });
  return t("errors.generic_login");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function normalizeLoginResponse(auth: LoginResponse) {
  const data = asRecord(auth.data);

  const accessToken = pickString(auth.access_token, data?.accessToken, data?.access_token);
  const refreshToken = pickString(auth.refresh_token, data?.refreshToken, data?.refresh_token);

  const nestedUser = asRecord(data?.user) as AuthUser | null;
  const user = auth.user ?? nestedUser ?? undefined;

  return { accessToken, refreshToken, user };
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function mapDeniedAccessMessage(t: AuthTranslator, rawMessage?: string): string | undefined {
  if (!rawMessage) {
    return undefined;
  }

  const text = normalizeText(rawMessage);

  if (
    text.includes("sin rol") ||
    text.includes("no tiene rol") ||
    text.includes("no tienes rol") ||
    text.includes("global roles") ||
    text.includes("admin privileges") ||
    text.includes("insufficient permissions")
  ) {
    return t("errors.denied_no_admin_role");
  }

  if (
    text.includes("postregistration") ||
    text.includes("post-registration") ||
    text.includes("completar registro") ||
    text.includes("registro incompleto") ||
    text.includes("profile incomplete")
  ) {
    return t("errors.denied_incomplete_registration");
  }

  if (
    text.includes("inactive") ||
    text.includes("inactivo") ||
    text.includes("disabled") ||
    text.includes("blocked") ||
    text.includes("suspended")
  ) {
    return t("errors.denied_inactive");
  }

  if (
    text.includes("email not confirmed") ||
    text.includes("correo no confirmado") ||
    text.includes("email unconfirmed")
  ) {
    return t("errors.denied_email_unconfirmed");
  }

  if (text.includes("unauthorized") || text.includes("no autorizado")) {
    return t("errors.denied_unauthorized");
  }

  return undefined;
}

function getDeniedAccessInfo(
  t: AuthTranslator,
  auth: LoginResponse,
): { userMessage: string; technicalMessage?: string } {
  const data = asRecord(auth.data);
  const statusText = typeof auth.status === "string" ? auth.status.trim() : "";
  const statusMessage =
    statusText && statusText.toLowerCase() !== "success" && statusText.toLowerCase() !== "ok"
      ? statusText
      : undefined;

  const technicalMessage = pickString(
    auth.message,
    auth.error,
    data?.message,
    data?.error,
    data?.detail,
    data?.reason,
    statusMessage,
  );

  return {
    userMessage:
      mapDeniedAccessMessage(t, technicalMessage) ??
      technicalMessage ??
      t("errors.denied_default"),
    technicalMessage,
  };
}

function logDeniedAccess(context: "missing_token" | "login_role", email: string, info: { technicalMessage?: string }) {
  console.warn("[auth] Login denied for admin panel", {
    context,
    email,
    backendMessage: info.technicalMessage,
  });
}

export async function loginAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const t = await getTranslations("auth");
  const loginSchema = buildLoginSchema(t);
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("validation.credentials_invalid") };
  }

  let auth: LoginResponse;
  try {
    auth = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: getLoginErrorMessage(t, error, "login") };
    }

    return { error: t("errors.login_failed") };
  }

  const { accessToken, refreshToken, user } = normalizeLoginResponse(auth);
  const deniedAccessInfo = getDeniedAccessInfo(t, auth);

  if (user && !hasAdminRole(user)) {
    logDeniedAccess("login_role", parsed.data.email, deniedAccessInfo);
    return {
      error: deniedAccessInfo.userMessage,
    };
  }

  if (!accessToken) {
    logDeniedAccess("missing_token", parsed.data.email, deniedAccessInfo);
    return {
      error: deniedAccessInfo.userMessage,
    };
  }

  let profile: AuthUser;
  try {
    profile = await apiRequest<AuthUser>("/auth/me", {
      token: accessToken,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: getLoginErrorMessage(t, error, "profile") };
    }

    return { error: t("errors.profile_validation_failed") };
  }

  if (!hasAdminRole(profile)) {
    return {
      error: t("errors.admin_role_required"),
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, COOKIE_OPTIONS);

  if (refreshToken) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
