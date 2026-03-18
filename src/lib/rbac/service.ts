import { apiRequest, ApiError } from "@/lib/api/client";
import type { Permission, Role } from "@/lib/rbac/types";

type ApiResponse<T> = { status: string; data: T };

function unwrap<T>(response: ApiResponse<T> | T): T {
  if (response && typeof response === "object" && "status" in response && "data" in response) {
    return (response as ApiResponse<T>).data;
  }
  return response as T;
}

// ─── Permisos ───────────────────────────────────────────────

export async function listPermissions(): Promise<Permission[]> {
  try {
    const response = await apiRequest<ApiResponse<Permission[]>>("/admin/rbac/permissions");
    return unwrap(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function getPermissionById(id: string): Promise<Permission | null> {
  try {
    const response = await apiRequest<ApiResponse<Permission>>(`/admin/rbac/permissions/${id}`);
    return unwrap(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createPermission(data: { permission_name: string; description?: string }) {
  return apiRequest<ApiResponse<Permission>>("/admin/rbac/permissions", {
    method: "POST",
    body: data,
  });
}

export async function updatePermission(
  id: string,
  data: { permission_name?: string; description?: string; active?: boolean },
) {
  return apiRequest<ApiResponse<Permission>>(`/admin/rbac/permissions/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deletePermission(id: string) {
  return apiRequest<{ success: boolean }>(`/admin/rbac/permissions/${id}`, {
    method: "DELETE",
  });
}

// ─── Roles ──────────────────────────────────────────────────

export async function listRoles(): Promise<Role[]> {
  try {
    const response = await apiRequest<ApiResponse<Role[]>>("/admin/rbac/roles");
    return unwrap(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function getRoleWithPermissions(id: string): Promise<Role | null> {
  try {
    const response = await apiRequest<ApiResponse<Role>>(`/admin/rbac/roles/${id}`);
    return unwrap(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// ─── Asignación ─────────────────────────────────────────────

export async function syncRolePermissions(roleId: string, permissionIds: string[]) {
  return apiRequest<{ success: boolean; added: number; removed: number }>(
    `/admin/rbac/roles/${roleId}/permissions`,
    {
      method: "PUT",
      body: { permission_ids: permissionIds },
    },
  );
}

export async function removePermissionFromRole(roleId: string, permissionId: string) {
  return apiRequest<{ success: boolean }>(
    `/admin/rbac/roles/${roleId}/permissions/${permissionId}`,
    { method: "DELETE" },
  );
}
