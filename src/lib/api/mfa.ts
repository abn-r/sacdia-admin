import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Response from GET /auth/mfa/status
 * Self-service: returns the status for the authenticated user (by JWT sub).
 */
export type MfaStatus = {
  enabled: boolean;
};

/**
 * Shape of data returned by GET /api/v1/admin/users/:userId/mfa/status
 * Envelope: { status: 'success', data: AdminMfaStatus }
 */
export type AdminMfaStatus = {
  userId: string;
  mfaEnabled: boolean;
};

type AdminMfaStatusEnvelope = {
  status: string;
  data: AdminMfaStatus;
};

type AdminMfaResetEnvelope = {
  status: string;
  message: string;
};

export type MfaAdminResetResult = {
  success: boolean;
  message: string;
};

// ─── Server-side (runs in RSC / Server Actions) ───────────────────────────────

/**
 * Get the MFA enrollment status for a specific user.
 * Calls GET /api/v1/admin/users/:userId/mfa/status
 * Requires JWT auth + admin/super_admin role + users:update permission.
 *
 * Returns null on any error so callers can degrade gracefully.
 */
export async function getAdminUserMfaStatus(
  userId: string,
): Promise<MfaStatus | null> {
  const envelope = await apiRequest<AdminMfaStatusEnvelope>(
    `/admin/users/${encodeURIComponent(userId)}/mfa/status`,
  );
  return { enabled: envelope.data.mfaEnabled };
}

/**
 * Get the current user's own MFA status (self-service).
 * Used in self-service profile screens.
 */
export async function getMfaStatus(): Promise<MfaStatus> {
  return apiRequest<MfaStatus>("/auth/mfa/status");
}

// ─── Client-side mutations ────────────────────────────────────────────────────

/**
 * Admin: Reset (force-disable) MFA for a target user without their password.
 * Calls DELETE /api/v1/admin/users/:userId/mfa
 * Requires JWT auth + admin/super_admin role + users:update permission.
 */
export async function adminResetUserMfa(
  userId: string,
): Promise<MfaAdminResetResult> {
  const envelope = await apiRequestFromClient<AdminMfaResetEnvelope>(
    `/admin/users/${encodeURIComponent(userId)}/mfa`,
    { method: "DELETE" },
  );
  return { success: envelope.status === "success", message: envelope.message };
}

/**
 * Self-service: Disable MFA for the currently authenticated user.
 * Requires the user's own password.
 */
export async function disableOwnMfa(password: string): Promise<void> {
  await apiRequestFromClient<unknown>("/auth/mfa/disable", {
    method: "DELETE",
    body: { password },
  });
}
