"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { hasAdminRole } from "@/lib/auth/roles";
import { apiRequest, ApiError } from "@/lib/api/client";
import { clearSession } from "@/lib/auth/session";
import type { AuthActionState, AuthUser, LoginResponse } from "@/lib/auth/types";

const loginSchema = z.object({
  email: z.string().email("Ingresa un correo valido"),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
});

const COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
};

function getLoginErrorMessage(error: ApiError, step: "login" | "profile") {
  if (step === "login") {
    if (error.status === 400 || error.status === 401) {
      return "Correo o contrasena incorrectos.";
    }

    if (error.status === 404) {
      return "No se encontro el endpoint de login. Revisa NEXT_PUBLIC_API_URL (ej. http://localhost:3000/api/v1).";
    }
  }

  if (step === "profile") {
    if (error.status === 401 || error.status === 403) {
      return "Tu sesion no tiene permisos para abrir el panel administrativo.";
    }

    if (error.status === 404) {
      return "Inicio de sesion exitoso, pero no se pudo validar rol admin (/auth/me devolvio 404). Verifica la configuracion de la API.";
    }
  }

  if (error.status >= 500) {
    return "El servidor no respondio correctamente. Intenta nuevamente en unos minutos.";
  }

  return error.message;
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

function mapDeniedAccessMessage(rawMessage?: string): string | undefined {
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
    return "Tu cuenta no tiene rol administrativo para acceder a este panel.";
  }

  if (
    text.includes("postregistration") ||
    text.includes("post-registration") ||
    text.includes("completar registro") ||
    text.includes("registro incompleto") ||
    text.includes("profile incomplete")
  ) {
    return "Necesitas completar tu registro antes de ingresar al panel.";
  }

  if (
    text.includes("inactive") ||
    text.includes("inactivo") ||
    text.includes("disabled") ||
    text.includes("blocked") ||
    text.includes("suspended")
  ) {
    return "Tu cuenta esta inactiva o bloqueada. Contacta al administrador.";
  }

  if (
    text.includes("email not confirmed") ||
    text.includes("correo no confirmado") ||
    text.includes("email unconfirmed")
  ) {
    return "Debes confirmar tu correo antes de ingresar.";
  }

  if (text.includes("unauthorized") || text.includes("no autorizado")) {
    return "No fue posible autenticar tu acceso al panel.";
  }

  return undefined;
}

function getDeniedAccessInfo(auth: LoginResponse): { userMessage: string; technicalMessage?: string } {
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
    userMessage: mapDeniedAccessMessage(technicalMessage) ?? technicalMessage ?? "Tu cuenta no tiene permisos para este panel.",
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
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Credenciales invalidas" };
  }

  let auth: LoginResponse;
  try {
    auth = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: getLoginErrorMessage(error, "login") };
    }

    return { error: "No fue posible iniciar sesion. Intenta nuevamente." };
  }

  const { accessToken, refreshToken, user } = normalizeLoginResponse(auth);
  const deniedAccessInfo = getDeniedAccessInfo(auth);

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
      return { error: getLoginErrorMessage(error, "profile") };
    }

    return { error: "Inicio de sesion incompleto. No se pudo validar el perfil." };
  }

  if (!hasAdminRole(profile)) {
    return {
      error:
        "Tu cuenta no tiene permisos para este panel. Solicita rol admin, super_admin o coordinator.",
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
