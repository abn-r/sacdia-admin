import { apiRequestFromClient } from "@/lib/api/client";
import type { UpdateAdminUserPayload } from "@/lib/api/admin-users";

/**
 * PATCH /admin/users/:id with one access flag. The endpoint takes no reason
 * (see the backend DTO), so confirmation is UI-only.
 */
export async function patchUserAccessFlag(
  userId: string,
  payload: UpdateAdminUserPayload,
): Promise<void> {
  await apiRequestFromClient<unknown>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: payload,
  });
}
