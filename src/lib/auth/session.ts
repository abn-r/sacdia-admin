import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  AUTH_COOKIE_OPTIONS,
} from "@/lib/auth/cookies";
import { apiRequest, ApiError } from "@/lib/api/client";
import { hasAdminRole } from "@/lib/auth/roles";
import type { AuthUser, LoginResponse } from "@/lib/auth/types";

type CookieStore = Awaited<ReturnType<typeof cookies>>;
type AuthTokens = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: AuthUser;
};

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

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

export function normalizeAuthTokenResponse(auth: LoginResponse): AuthTokens {
  const data = asRecord(auth.data);
  const accessToken = pickString(auth.access_token, data?.accessToken, data?.access_token);
  const refreshToken = pickString(auth.refresh_token, data?.refreshToken, data?.refresh_token);
  const expiresAt = pickNumber(auth.expiresAt, auth.expires_at, data?.expiresAt, data?.expires_at);
  const nestedUser = asRecord(data?.user) as AuthUser | null;
  const user = auth.user ?? nestedUser ?? undefined;

  return { accessToken, refreshToken, expiresAt, user };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getAccessTokenMaxAgeSeconds(accessToken: string): number {
  const exp = pickNumber(decodeJwtPayload(accessToken)?.exp);
  if (!exp) {
    return ACCESS_TOKEN_MAX_AGE_SECONDS;
  }

  const secondsUntilExpiry = Math.floor(exp - Date.now() / 1000);
  return Math.max(60, Math.min(secondsUntilExpiry, ACCESS_TOKEN_MAX_AGE_SECONDS));
}

function getRefreshTokenMaxAgeSeconds(expiresAt?: number): number {
  if (!expiresAt) {
    return REFRESH_TOKEN_MAX_AGE_SECONDS;
  }

  const secondsUntilExpiry = Math.floor(expiresAt - Date.now() / 1000);
  return Math.max(60, Math.min(secondsUntilExpiry, REFRESH_TOKEN_MAX_AGE_SECONDS));
}

function clearAuthCookies(
  cookieStore: CookieStore,
  options: { ignoreMutationErrors?: boolean } = {},
) {
  const { ignoreMutationErrors = false } = options;

  for (const cookieName of [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]) {
    try {
      cookieStore.delete(cookieName);
    } catch (error) {
      if (!ignoreMutationErrors) {
        throw error;
      }
    }
  }
}

function clearAccessCookie(
  cookieStore: CookieStore,
  options: { ignoreMutationErrors?: boolean } = {},
) {
  const { ignoreMutationErrors = false } = options;

  try {
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
  } catch (error) {
    if (!ignoreMutationErrors) {
      throw error;
    }
  }
}

export function setAuthCookies(cookieStore: CookieStore, tokens: AuthTokens) {
  if (tokens.accessToken) {
    cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: getAccessTokenMaxAgeSeconds(tokens.accessToken),
    });
  }

  if (tokens.refreshToken) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: getRefreshTokenMaxAgeSeconds(tokens.expiresAt),
    });
  }
}

export function sanitizeDashboardNextPath(value: string): string | null {
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (!value.startsWith("/dashboard")) return null;
  return value;
}

export function buildRefreshPath(nextPath = "/dashboard") {
  const safeNext = sanitizeDashboardNextPath(nextPath) ?? "/dashboard";
  const params = new URLSearchParams({ next: safeNext });
  return `/api/auth/refresh?${params.toString()}`;
}

async function getCurrentDashboardPath() {
  const headerStore = await headers();
  const pathname = headerStore.get("x-sacdia-pathname") ?? "/dashboard";
  const search = headerStore.get("x-sacdia-search") ?? "";
  return sanitizeDashboardNextPath(`${pathname}${search}`) ?? "/dashboard";
}

export async function hasRefreshToken() {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get(REFRESH_TOKEN_COOKIE)?.value);
}

export async function refreshSessionFromCookies(
  cookieStoreArg?: CookieStore,
): Promise<string | null> {
  const cookieStore = cookieStoreArg ?? (await cookies());
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await apiRequest<LoginResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
    const tokens = normalizeAuthTokenResponse(response);

    if (!tokens.accessToken) {
      clearAuthCookies(cookieStore);
      return null;
    }

    setAuthCookies(cookieStore, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? refreshToken,
      expiresAt: tokens.expiresAt,
    });

    return tokens.accessToken;
  } catch (error) {
    if (error instanceof ApiError) {
      if ([400, 401, 403].includes(error.status)) {
        clearAuthCookies(cookieStore);
        return null;
      }

      if (error.status === 429 || error.status >= 500) {
        return null;
      }
    }

    throw error;
  }
}

function unwrapAuthMePayload(response: { status?: string; data?: AuthUser } & AuthUser): AuthUser {
  if (response.status === "success" && response.data && typeof response.data === "object") {
    return response.data as AuthUser;
  }

  return response as AuthUser;
}

function getActiveAssignmentId(user: AuthUser): string | null {
  const assignmentId = user.authorization?.active_assignment?.assignment_id;
  if (typeof assignmentId !== "string") {
    return null;
  }

  const normalized = assignmentId.trim();
  return normalized.length > 0 ? normalized : null;
}

function getFirstClubAssignmentId(user: AuthUser): string | null {
  const assignments = user.authorization?.grants?.club_assignments;
  if (!Array.isArray(assignments)) {
    return null;
  }

  for (const assignment of assignments) {
    if (!assignment || typeof assignment !== "object") {
      continue;
    }

    const candidate = (assignment as { assignment_id?: unknown }).assignment_id;
    if (typeof candidate !== "string") {
      continue;
    }

    const normalized = candidate.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return null;
}

async function ensureAuthorizationContext(
  token: string,
  user: AuthUser,
): Promise<AuthUser> {
  if (getActiveAssignmentId(user)) {
    return user;
  }

  const fallbackAssignmentId = getFirstClubAssignmentId(user);
  if (!fallbackAssignmentId) {
    return user;
  }

  try {
    await apiRequest<{ status?: string; data?: unknown }>("/auth/me/context", {
      method: "PATCH",
      token,
      body: { assignment_id: fallbackAssignmentId },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if ([400, 401, 403, 404, 422].includes(error.status)) {
        return user;
      }
    }

    throw error;
  }

  const refreshed = await apiRequest<{ status?: string; data?: AuthUser } & AuthUser>(
    "/auth/me",
    { token },
  );

  return unwrapAuthMePayload(refreshed);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const response = await apiRequest<{ status?: string; data?: AuthUser } & AuthUser>(
      "/auth/me",
      { token },
    );

    const user = unwrapAuthMePayload(response);
    return await ensureAuthorizationContext(token, user);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        clearAccessCookie(cookieStore, { ignoreMutationErrors: true });
        return null;
      }

      if (error.status === 429) {
        return null;
      }

      if (error.status >= 500) {
        return null;
      }
    }

    throw error;
  }
}

export async function requireAdminUser() {
  const user = await getCurrentUser();

  if (user && hasAdminRole(user)) {
    return user;
  }

  if (user && !hasAdminRole(user)) {
    redirect("/api/auth/logout?next=/login");
  }

  const cookieStore = await cookies();
  if (cookieStore.get(REFRESH_TOKEN_COOKIE)?.value) {
    redirect(buildRefreshPath(await getCurrentDashboardPath()));
  }

  redirect("/login");
}

export async function clearSession() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    try {
      await apiRequest<{ message: string }>("/auth/logout", {
        method: "POST",
        token: accessToken,
        body: { refreshToken },
      });
    } catch {
      // If backend logout fails we still clear local cookies.
    }
  }

  clearAuthCookies(cookieStore);
}
