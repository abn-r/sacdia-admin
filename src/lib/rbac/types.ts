export type Permission = {
  permission_id: string;
  permission_name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  modified_at: string;
};

export type Role = {
  role_id: string;
  role_name: string;
  role_category: string;
  description: string | null;
  active: boolean;
  role_permissions: RolePermission[];
};

export type RolePermission = {
  role_permission_id: string;
  role_id: string;
  permission_id: string;
  active: boolean;
  permissions: {
    permission_id: string;
    permission_name: string;
    description: string | null;
  };
};

export type UserPermission = {
  user_permission_id: string;
  user_id: string;
  permission_id: string;
  active: boolean;
  created_at: string | null;
  modified_at: string | null;
  permissions: {
    permission_id: string;
    permission_name: string;
    description: string | null;
    active: boolean;
  };
};

export type UserRole = {
  user_role_id: string;
  user_id: string;
  role_id: string;
  active: boolean;
  created_at: string | null;
  modified_at: string | null;
  roles: {
    role_id: string;
    role_name: string;
    role_category: string;
    active: boolean;
  };
};

export type RbacActionState = {
  error?: string;
  success?: string;
};

export type CreateRoleInput = {
  role_name: string;
  description: string;
  role_category: "GLOBAL" | "CLUB";
  permission_ids?: string[];
};

export type UpdateRoleInput = {
  description?: string;
  permission_ids?: string[];
};
