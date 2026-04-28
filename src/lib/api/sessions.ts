import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ─────────────────────────────────────────────────────────────────

export type AdminSessionItem = {
  sessionId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  /** Raw User-Agent string from the request. Parse with parseUserAgent(). */
  userAgent: string | null;
};

export type AdminSessionListData = {
  userId: string;
  totalSessions: number;
  sessions: AdminSessionItem[];
};

export type AdminSessionListResponse = {
  status: string;
  data: AdminSessionListData;
};

export type RevokeSessionResponse = {
  status: string;
  message: string;
};

export type RevokeAllSessionsResponse = {
  status: string;
  data: { revokedCount: number };
};

// ─── Server-side functions (used in Server Components) ────────────────────

/**
 * GET /api/v1/admin/users/:userId/sessions
 *
 * Lists all active sessions for the target user. Requires admin/super_admin
 * role and users:update permission. Returns the data payload unwrapped from
 * the `{ status, data }` envelope.
 */
export async function getAdminUserSessions(
  targetUserId: string,
): Promise<AdminSessionListData> {
  const response = await apiRequest<AdminSessionListResponse>(
    `/admin/users/${encodeURIComponent(targetUserId)}/sessions`,
  );
  return response.data;
}

// ─── Client-side fetch functions ─────────────────────────────────────────

/**
 * GET /api/v1/admin/users/:userId/sessions (client-side variant)
 *
 * Used for refreshing session data from a Client Component.
 */
export async function getSessionsFromClient(
  targetUserId: string,
): Promise<AdminSessionListData> {
  const response = await apiRequestFromClient<AdminSessionListResponse>(
    `/admin/users/${encodeURIComponent(targetUserId)}/sessions`,
  );
  return response.data;
}

// ─── Client-side mutation functions ──────────────────────────────────────

/**
 * DELETE /api/v1/admin/users/:userId/sessions/:sessionId
 *
 * Revokes a single session for the target user. Requires admin/super_admin
 * role and users:update permission.
 */
export async function revokeSession(
  targetUserId: string,
  sessionId: string,
): Promise<RevokeSessionResponse> {
  return apiRequestFromClient<RevokeSessionResponse>(
    `/admin/users/${encodeURIComponent(targetUserId)}/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  );
}

/**
 * DELETE /api/v1/admin/users/:userId/sessions
 *
 * Revokes ALL sessions for the target user. Requires admin/super_admin role
 * and users:update permission.
 */
export async function revokeAllSessions(
  targetUserId: string,
): Promise<RevokeAllSessionsResponse> {
  return apiRequestFromClient<RevokeAllSessionsResponse>(
    `/admin/users/${encodeURIComponent(targetUserId)}/sessions`,
    { method: "DELETE" },
  );
}
