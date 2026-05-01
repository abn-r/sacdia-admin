import { apiRequest, ApiError } from "@/lib/api/client";
import type { Permission, Role, UserPermission, UserRole, CreateRoleInput, UpdateRoleInput } from "@/lib/rbac/types";

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

export async function listRoles(active?: "true" | "false" | "all"): Promise<Role[]> {
  try {
    const params = active ? { active } : undefined;
    const response = await apiRequest<ApiResponse<Role[]>>("/admin/rbac/roles", { params });
    return unwrap(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function createRole(data: CreateRoleInput): Promise<Role> {
  const response = await apiRequest<ApiResponse<Role>>("/admin/rbac/roles", {
    method: "POST",
    body: data,
  });
  return unwrap(response);
}

export async function updateRole(id: string, data: UpdateRoleInput): Promise<Role> {
  const response = await apiRequest<ApiResponse<Role>>(`/admin/rbac/roles/${id}`, {
    method: "PATCH",
    body: data,
  });
  return unwrap(response);
}

export async function deactivateRole(id: string): Promise<void> {
  await apiRequest<ApiResponse<unknown>>(`/admin/rbac/roles/${id}`, {
    method: "DELETE",
  });
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

// ─── Permisos directos de usuario ───────────────────────────

export async function getUserPermissions(userId: string): Promise<UserPermission[]> {
  try {
    const response = await apiRequest<ApiResponse<UserPermission[]>>(
      `/admin/rbac/users/${encodeURIComponent(userId)}/permissions`,
    );
    return unwrap(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function assignPermissionToUser(userId: string, permissionId: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/admin/rbac/users/${encodeURIComponent(userId)}/permissions`,
    {
      method: "POST",
      body: { permission_ids: [permissionId] },
    },
  );
}

export async function removePermissionFromUser(userId: string, permissionId: string) {
  return apiRequest<{ success: boolean }>(
    `/admin/rbac/users/${encodeURIComponent(userId)}/permissions/${encodeURIComponent(permissionId)}`,
    { method: "DELETE" },
  );
}

// ─── Roles de usuario ───────────────────────────────────────

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  try {
    const response = await apiRequest<ApiResponse<UserRole[]>>(
      `/admin/rbac/users/${encodeURIComponent(userId)}/roles`,
    );
    return unwrap(response);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function assignRoleToUser(userId: string, roleId: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/admin/rbac/users/${encodeURIComponent(userId)}/roles`,
    {
      method: "POST",
      body: { role_id: roleId },
    },
  );
}

export async function removeRoleFromUser(userId: string, roleId: string) {
  return apiRequest<{ success: boolean }>(
    `/admin/rbac/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
    { method: "DELETE" },
  );
}
