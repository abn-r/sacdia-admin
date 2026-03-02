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

    // El backend envuelve la respuesta en { status, data }
    if (response.status === "success" && response.data && typeof response.data === "object") {
      return response.data as AuthUser;
    }

    return response as AuthUser;
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
