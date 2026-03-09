import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { apiRequest, ApiError } from "@/lib/api/client";
import { hasAdminRole } from "@/lib/auth/roles";
import type { AuthUser } from "@/lib/auth/types";

function clearAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
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
        clearAuthCookies(cookieStore, { ignoreMutationErrors: true });
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

  if (!user || !hasAdminRole(user)) {
    redirect("/api/auth/logout?next=/login");
  }

  return user;
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
