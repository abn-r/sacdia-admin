export type AuthorizationGrant = {
  assignment_id?: string | null;
  permissions?: string[];
  [key: string]: unknown;
};

/**
 * `authorization.territory` of `GET /auth/me`. The backend resolves the actor's
 * territorial anchor; the admin never derives it from role names again.
 */
export type AuthorizationTerritoryLevel =
  | "all"
  | "open"
  | "unconfigured"
  | "division"
  | "union"
  | "local_field";

export type AuthorizationTerritory = {
  level: AuthorizationTerritoryLevel;
  division_id: number | null;
  union_id: number | null;
  local_field_id: number | null;
};

export type AuthorizationSnapshot = {
  /**
   * Sorted capability keys (`CAPABILITY_KEYS`). "The actor may attempt the
   * verb on at least one target"; the API still answers 403 when the target
   * does not match. Absent while the backend is behind → treated as `[]`.
   */
  capabilities?: string[];
  territory?: AuthorizationTerritory;
  /** Global roles the actor may assign when creating users (sorted). */
  assignable_global_roles?: string[];
  effective?: {
    permissions?: string[];
    [key: string]: unknown;
  };
  grants?: {
    global_roles?: AuthorizationGrant[];
    club_assignments?: AuthorizationGrant[];
    direct_permissions?: string[];
    [key: string]: unknown;
  };
  active_assignment?: {
    assignment_id?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type AuthUser = {
  id: string;
  user_id?: string | null;
  email: string;
  name?: string | null;
  paternal_last_name?: string | null;
  maternal_last_name?: string | null;
  birthday?: string | Date | null;
  picture_url?: string | null;
  user_image?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  profile_picture?: string | null;
  profile_picture_url?: string | null;
  role?: string | null;
  roles?: string[];
  permissions?: string[];
  authorization?: AuthorizationSnapshot;
  active?: boolean;
  [key: string]: unknown;
};

export type LoginResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expiresAt?: number;
  expires_at?: number;
  user?: AuthUser;
  message?: string;
  error?: string;
  status?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    access_token?: string;
    refresh_token?: string;
    expiresAt?: number;
    expires_at?: number;
    user?: AuthUser;
    message?: string;
    error?: string;
    detail?: string;
    reason?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type AuthActionState = {
  error?: string;
};
