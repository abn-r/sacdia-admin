import { apiRequestFromClient } from "@/lib/api/client";

/**
 * PATCH /admin/users/:userId { active: false }. The endpoint takes no reason
 * (only `rejection_reason` for approvals), so none is sent.
 */
export async function deactivateAdminUserFromClient(userId: string): Promise<void> {
  await apiRequestFromClient<unknown>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: { active: false },
  });
}
