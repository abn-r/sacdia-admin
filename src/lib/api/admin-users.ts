import {
  ApiError,
  apiRequest,
  apiRequestFromClient,
  API_BASE_URL,
  getClientAuthToken,
} from "@/lib/api/client";

export type ScopeType = "ALL" | "UNION" | "LOCAL_FIELD" | "DIVISION";

export type ScopeMeta = {
  type: ScopeType;
  roles: string[];
  division_id: number | null;
  union_id: number | null;
  local_field_id: number | null;
};

export type AdminUsersListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  scope: ScopeMeta | null;
};

export type AdminUser = {
  user_id: string;
  email?: string | null;
  name?: string | null;
  paternal_last_name?: string | null;
  maternal_last_name?: string | null;
  full_name?: string | null;
  is_deleted?: boolean;
  user_image?: string | null;
  country_id?: number | null;
  union_id?: number | null;
  local_field_id?: number | null;
  district_id?: number | null;
  church_id?: number | null;
  active?: boolean;
  access_app?: boolean;
  access_panel?: boolean;
  approval?: number | string | boolean | null;
  country?: {
    country_id?: number | null;
    name?: string | null;
  } | null;
  union?: {
    union_id?: number | null;
    name?: string | null;
  } | null;
  local_field?: {
    local_field_id?: number | null;
    union_id?: number | null;
    name?: string | null;
  } | null;
  roles?: string[];
  club_assignments?: Array<{
    assignment_id?: string | null;
    role_name?: string | null;
    section_name?: string | null;
    club_name?: string | null;
  }>;
  users_roles?: Array<{
    roles?: {
      role_name?: string | null;
    } | null;
  }>;
  post_registration?: {
    complete?: boolean;
    profile_picture_complete?: boolean;
    personal_info_complete?: boolean;
    club_selection_complete?: boolean;
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AdminGuardianshipStatus = "pending" | "verified" | "revoked";

export type AdminGuardianshipAsDependent = {
  guardianship_id: string;
  /** Null for club custody or an external (account-less) guardian. */
  guardian: {
    user_id: string;
    display_name: string;
    email: string | null;
  } | null;
  custodian_club: { club_id: number; name: string } | null;
  external_name: string | null;
  relationship_type_name: string | null;
  is_primary: boolean;
  is_custodian: boolean;
  consent_status: AdminGuardianshipStatus | string;
  verification_method: string | null;
  verified_at: string | null;
  verified_by: { user_id: string; display_name: string } | null;
  evidence_uploaded: boolean;
  is_test_data: boolean;
  created_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
};

export type AdminGuardianshipAsGuardian = {
  guardianship_id: string;
  dependent: { user_id: string; display_name: string; birthday: string | null };
  relationship_type_name: string | null;
  is_primary: boolean;
  consent_status: AdminGuardianshipStatus | string;
};

export type AdminDependentProfile = {
  created_at: string | null;
  created_by_user_id: string | null;
  frozen_at: string | null;
  purge_after: string | null;
};

/**
 * Family block of the user detail. The whole object is `null` when the caller
 * lacks `legal_representative:read` (or the transitional `users:read_detail`).
 */
export type AdminGuardianships = {
  as_dependent: AdminGuardianshipAsDependent[];
  as_guardian: AdminGuardianshipAsGuardian[];
  dependent_profile: AdminDependentProfile | null;
};

export type AdminGuardianshipEvidence = {
  /** Signed, short-lived URL (never public). */
  url: string;
  expires_in: number;
  content_type: string;
  uploaded_at: string;
};

/** Who the supervision of a minor with their own access stands in. */
export type AdminFamilySupervision = "pending_guardian" | "active";

export type AdminSupervisedLoginStatus = "active" | "pending_guardian" | "disabled";
export type AdminSupervisedLoginMethod = "email" | "handle";
export type AdminSupervisedLoginOrigin = "self_registered" | "guardian_enabled";
export type AdminSupervisedLoginDisabledReason = "guardian" | "admin" | "unlinked_purged";

export type AdminSupervisedLogin = {
  status: AdminSupervisedLoginStatus;
  method: AdminSupervisedLoginMethod;
  /** Only returned to admins who hold the sensitive legal_representative permission. */
  login_handle: string | null;
  origin: AdminSupervisedLoginOrigin;
  enabled_at: string | null;
  enabled_by: { user_id: string; display_name: string } | null;
  disabled_at: string | null;
  disabled_reason: AdminSupervisedLoginDisabledReason | null;
  password_set_by: "guardian" | "self";
  pending_since: string | null;
};

export type AdminLinkedDevice = {
  linked_device_id: string;
  label: string;
  platform: "ios" | "android" | null;
  app_version: string | null;
  status: "active" | "revoked";
  paired_by: { user_id: string; display_name: string } | null;
  paired_at: string | null;
  last_seen_at: string | null;
  absolute_expires_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
};

/**
 * "Family access" block of the user detail: own login of a minor and the
 * devices linked by a guardian. The whole object is `null` when the caller
 * lacks the sensitive `legal_representative` permission.
 */
export type AdminFamilyAccess = {
  supervision: AdminFamilySupervision | null;
  supervised_login: AdminSupervisedLogin | null;
  linked_devices: AdminLinkedDevice[];
};

export type AdminDisabledSupervisedLogin = {
  supervised_login: {
    status: AdminSupervisedLoginStatus;
    method: AdminSupervisedLoginMethod | null;
    origin: AdminSupervisedLoginOrigin | null;
    enabled_at: string | null;
    disabled_at: string | null;
    disabled_reason: AdminSupervisedLoginDisabledReason | null;
    password_set_by: "guardian" | "self" | null;
  };
};

export type AdminRevokedLinkedDevice = {
  linked_device_id: string;
  revoked_at: string | null;
  revoked_reason: string | null;
};

/** `kind: 'device'` is a session minted by a linked device of a child. */
export type AdminUserSessionKind = "user" | "device";

/** The sessions endpoint answers camelCase (unlike the rest of the admin API). */
export type AdminUserSession = {
  sessionId: string;
  userId: string;
  createdAt: string | null;
  expiresAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  kind: AdminUserSessionKind;
  linkedDeviceId: string | null;
};

export type AdminUserDetail = AdminUser & {
  gender?: string | null;
  birthday?: string | null;
  blood?: string | null;
  baptism?: boolean | null;
  baptism_date?: string | null;
  user_image?: string | null;
  modified_at?: string | null;
  classes?: unknown[];
  club_assignments?: unknown[];
  health?: {
    blood?: string | null;
    allergies?: unknown[];
    diseases?: unknown[];
    medicines?: unknown[];
  } | null;
  emergency_contacts?: unknown[] | null;
  legal_representative?: Record<string, unknown> | null;
  guardianships?: AdminGuardianships | null;
  family_access?: AdminFamilyAccess | null;
  scope?: ScopeMeta | null;
};

export type AdminUsersResult = {
  items: AdminUser[];
  meta: AdminUsersListMeta | null;
  endpointAvailable: boolean;
  endpointState: "available" | "forbidden" | "missing" | "rate-limited";
  endpointPath: string;
  endpointDetail: string;
  checkedAt: string;
};

export type AdminUsersQuery = {
  search?: string;
  role?: string;
  active?: boolean;
  unionId?: number;
  localFieldId?: number;
  page?: number;
  limit?: number;
  sortBy?: "name" | "created_at";
  sortOrder?: "asc" | "desc";
  q?: string;
  status?: "active" | "inactive" | "pending" | "approved";
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function pickBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  return null;
}

function pickNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getValueAtPath(payload: unknown, path: string[]): unknown {
  let current: unknown = payload;

  for (const key of path) {
    const record = asRecord(current);
    if (!record || !(key in record)) {
      return undefined;
    }
    current = record[key];
  }

  return current;
}

function readArrayAtPath(payload: unknown, path: string[]): unknown[] | null {
  const value = getValueAtPath(payload, path);
  return Array.isArray(value) ? value : null;
}

function readRecordAtPath(payload: unknown, path: string[]): Record<string, unknown> | null {
  const value = getValueAtPath(payload, path);
  return asRecord(value);
}

function normalizeRoleName(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  return (
    pickString(record.role_name) ??
    pickString(record.roleName) ??
    pickString(record.name) ??
    pickString(record.label) ??
    null
  );
}

function normalizeRoles(value: unknown): string[] {
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const roles: string[] = [];

  for (const item of value) {
    const roleName = normalizeRoleName(item);
    if (roleName) {
      roles.push(roleName);
    }
  }

  return roles;
}

function normalizeClubAssignments(
  value: unknown,
): AdminUser["club_assignments"] {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const rows: NonNullable<AdminUser["club_assignments"]> = [];

  for (const item of value) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }
    const roleName = pickString(record.role_name);
    if (!roleName) {
      continue;
    }
    rows.push({
      assignment_id: pickString(record.assignment_id),
      role_name: roleName,
      section_name: pickString(record.section_name),
      club_name: pickString(record.club_name),
    });
  }

  return rows.length > 0 ? rows : undefined;
}

function normalizeUsersRoles(value: unknown): AdminUser["users_roles"] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const rows: NonNullable<AdminUser["users_roles"]> = [];

  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) {
      rows.push({
        roles: {
          role_name: item.trim(),
        },
      });
      continue;
    }

    const record = asRecord(item);
    if (!record) {
      continue;
    }

    const nestedRole = normalizeRoleName(record.roles) ?? normalizeRoleName(record.role);
    if (nestedRole) {
      rows.push({
        roles: {
          role_name: nestedRole,
        },
      });
      continue;
    }

    const roleName = normalizeRoleName(record);
    if (roleName) {
      rows.push({
        roles: {
          role_name: roleName,
        },
      });
    }
  }

  return rows.length > 0 ? rows : undefined;
}

function normalizeScope(value: unknown): ScopeMeta | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const typeRaw = pickString(record.type)?.toUpperCase();
  if (
    typeRaw !== "ALL" &&
    typeRaw !== "UNION" &&
    typeRaw !== "LOCAL_FIELD" &&
    typeRaw !== "DIVISION"
  ) {
    return null;
  }

  return {
    type: typeRaw,
    roles: normalizeRoles(record.roles),
    division_id: pickNumber(record.division_id),
    union_id: pickNumber(record.union_id),
    local_field_id: pickNumber(record.local_field_id),
  };
}

function normalizeGeoEntity(
  value: unknown,
  idKeys: string[],
  nameKeys: string[] = ["name"],
): { id: number | null; name: string | null; source: Record<string, unknown> | null } {
  const record = asRecord(value);

  if (!record) {
    return {
      id: null,
      name: null,
      source: null,
    };
  }

  let id: number | null = null;
  for (const idKey of idKeys) {
    if (idKey in record) {
      id = pickNumber(record[idKey]);
      if (id !== null) {
        break;
      }
    }
  }

  let name: string | null = null;
  for (const nameKey of nameKeys) {
    if (nameKey in record) {
      name = pickString(record[nameKey]);
      if (name) {
        break;
      }
    }
  }

  return {
    id,
    name,
    source: record,
  };
}

function normalizePostRegistration(value: unknown): AdminUser["post_registration"] {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  return {
    complete: pickBoolean(record.complete) ?? undefined,
    profile_picture_complete: pickBoolean(record.profile_picture_complete) ?? undefined,
    personal_info_complete: pickBoolean(record.personal_info_complete) ?? undefined,
    club_selection_complete: pickBoolean(record.club_selection_complete) ?? undefined,
  };
}

function normalizeHealthBlock(value: unknown): AdminUserDetail["health"] {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  return {
    blood: pickString(record.blood),
    allergies: Array.isArray(record.allergies) ? record.allergies : [],
    diseases: Array.isArray(record.diseases) ? record.diseases : [],
    medicines: Array.isArray(record.medicines) ? record.medicines : [],
  };
}

function normalizeActive(item: Record<string, unknown>) {
  if (typeof item.active === "boolean") {
    return item.active;
  }

  const status = pickString(item.status)?.toLowerCase();
  if (!status) {
    return true;
  }

  if (["inactive", "disabled", "blocked", "rejected", "deleted"].includes(status)) {
    return false;
  }

  if (["active", "enabled", "approved", "pending"].includes(status)) {
    return true;
  }

  return true;
}

function normalizeAdminUser(item: Record<string, unknown>): AdminUser | null {
  const userId = pickString(item.user_id) ?? pickString(item.id);

  if (!userId) {
    return null;
  }

  const usersRoles = normalizeUsersRoles(item.users_roles ?? item.user_roles);
  const directRoles = [
    ...normalizeRoles(item.roles),
    ...normalizeRoles(item.role),
    ...normalizeRoles(item.global_roles),
  ];
  const nestedRoles = (usersRoles ?? [])
    .map((row) => row.roles?.role_name)
    .filter((role): role is string => typeof role === "string" && role.trim().length > 0);
  const uniqueRoles = Array.from(new Set([...directRoles, ...nestedRoles]));

  const fullName =
    pickString(item.full_name) ??
    (
      [pickString(item.name), pickString(item.paternal_last_name), pickString(item.maternal_last_name)]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .join(" ") || null
    );

  const country = normalizeGeoEntity(item.country, ["country_id", "id"]);
  const union = normalizeGeoEntity(item.union, ["union_id", "id"]);
  const localField = normalizeGeoEntity(item.local_field, ["local_field_id", "id"], ["name"]);

  const approvalCandidate = item.approval ?? item.approved ?? item.status ?? null;
  const approval =
    typeof approvalCandidate === "number" ||
    typeof approvalCandidate === "string" ||
    typeof approvalCandidate === "boolean"
      ? approvalCandidate
      : null;

  return {
    user_id: userId,
    email: pickString(item.email),
    name: pickString(item.name),
    paternal_last_name: pickString(item.paternal_last_name),
    maternal_last_name: pickString(item.maternal_last_name),
    full_name: fullName,
    is_deleted: pickBoolean(item.is_deleted) ?? undefined,
    user_image: pickString(item.user_image) ?? pickString(item.avatar_url) ?? pickString(item.picture_url) ?? pickString(item.photo_url),
    country_id: country.id ?? pickNumber(item.country_id),
    union_id: union.id ?? pickNumber(item.union_id),
    local_field_id: localField.id ?? pickNumber(item.local_field_id),
    district_id: pickNumber(item.district_id),
    church_id: pickNumber(item.church_id),
    active: normalizeActive(item),
    access_app: pickBoolean(item.access_app) ?? undefined,
    access_panel: pickBoolean(item.access_panel) ?? undefined,
    approval,
    country:
      country.id !== null || country.name !== null
        ? {
            country_id: country.id,
            name: country.name,
          }
        : null,
    union:
      union.id !== null || union.name !== null
        ? {
            union_id: union.id,
            name: union.name,
          }
        : null,
    local_field:
      localField.id !== null || localField.name !== null
        ? {
            local_field_id: localField.id,
            union_id: pickNumber(localField.source?.union_id),
            name: localField.name,
          }
        : null,
    roles: uniqueRoles,
    club_assignments: normalizeClubAssignments(item.club_assignments),
    users_roles: usersRoles,
    post_registration: normalizePostRegistration(item.post_registration),
    created_at: pickString(item.created_at) ?? pickString(item.createdAt),
    updated_at: pickString(item.updated_at) ?? pickString(item.updatedAt),
  };
}

function extractRawUsersList(payload: unknown): unknown[] {
  const candidates: string[][] = [
    ["data", "data"],
    ["data", "items"],
    ["data", "results"],
    ["data"],
    ["items"],
    ["results"],
    ["rows"],
    [],
  ];

  for (const path of candidates) {
    const list = readArrayAtPath(payload, path);
    if (Array.isArray(list)) {
      return list;
    }
  }

  const record = asRecord(payload);
  if (!record) {
    return [];
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeUsers(payload: unknown): AdminUser[] {
  return extractRawUsersList(payload)
    .filter((item): item is Record<string, unknown> => Boolean(asRecord(item)))
    .map((item) => normalizeAdminUser(item))
    .filter((item): item is AdminUser => Boolean(item));
}

function normalizeListMeta(payload: unknown): AdminUsersListMeta | null {
  const metaRecord =
    readRecordAtPath(payload, ["data", "meta"]) ??
    readRecordAtPath(payload, ["meta"]) ??
    readRecordAtPath(payload, ["data", "pagination"]) ??
    readRecordAtPath(payload, ["pagination"]);

  if (!metaRecord) {
    return null;
  }

  const page = pickNumber(metaRecord.page) ?? 1;
  const limit = pickNumber(metaRecord.limit) ?? 20;
  const total = pickNumber(metaRecord.total) ?? 0;
  const totalPages = pickNumber(metaRecord.totalPages) ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const hasNextPage = pickBoolean(metaRecord.hasNextPage) ?? page < totalPages;
  const hasPreviousPage = pickBoolean(metaRecord.hasPreviousPage) ?? page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    scope: normalizeScope(metaRecord.scope),
  };
}

function normalizeGuardianships(value: unknown): AdminGuardianships | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const rows = (input: unknown) =>
    Array.isArray(input)
      ? input.map(asRecord).filter((row): row is Record<string, unknown> => row !== null)
      : [];

  const asDependent = rows(record.as_dependent).map((row): AdminGuardianshipAsDependent => {
    const guardian = asRecord(row.guardian);
    const club = asRecord(row.custodian_club);
    const verifier = asRecord(row.verified_by);
    return {
      guardianship_id: pickString(row.guardianship_id) ?? "",
      guardian: guardian
        ? {
            user_id: pickString(guardian.user_id) ?? "",
            display_name: pickString(guardian.display_name) ?? "",
            email: pickString(guardian.email),
          }
        : null,
      custodian_club: club
        ? { club_id: pickNumber(club.club_id) ?? 0, name: pickString(club.name) ?? "" }
        : null,
      external_name: pickString(row.external_name),
      relationship_type_name: pickString(row.relationship_type_name),
      is_primary: pickBoolean(row.is_primary) === true,
      is_custodian: pickBoolean(row.is_custodian) === true,
      consent_status: pickString(row.consent_status) ?? "pending",
      verification_method: pickString(row.verification_method),
      verified_at: pickString(row.verified_at),
      verified_by: verifier
        ? {
            user_id: pickString(verifier.user_id) ?? "",
            display_name: pickString(verifier.display_name) ?? "",
          }
        : null,
      evidence_uploaded: pickBoolean(row.evidence_uploaded) === true,
      is_test_data: pickBoolean(row.is_test_data) === true,
      created_at: pickString(row.created_at),
      revoked_at: pickString(row.revoked_at),
      revoked_reason: pickString(row.revoked_reason),
    };
  });

  const asGuardian = rows(record.as_guardian).map((row): AdminGuardianshipAsGuardian => {
    const dependent = asRecord(row.dependent);
    return {
      guardianship_id: pickString(row.guardianship_id) ?? "",
      dependent: {
        user_id: pickString(dependent?.user_id) ?? "",
        display_name: pickString(dependent?.display_name) ?? "",
        birthday: pickString(dependent?.birthday),
      },
      relationship_type_name: pickString(row.relationship_type_name),
      is_primary: pickBoolean(row.is_primary) === true,
      consent_status: pickString(row.consent_status) ?? "pending",
    };
  });

  const profile = asRecord(record.dependent_profile);

  return {
    as_dependent: asDependent,
    as_guardian: asGuardian,
    dependent_profile: profile
      ? {
          created_at: pickString(profile.created_at),
          created_by_user_id: pickString(profile.created_by_user_id),
          frozen_at: pickString(profile.frozen_at),
          purge_after: pickString(profile.purge_after),
        }
      : null,
  };
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function normalizePerson(value: unknown): { user_id: string; display_name: string } | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return {
    user_id: pickString(record.user_id) ?? "",
    display_name: pickString(record.display_name) ?? "",
  };
}

function normalizeSupervisedLogin(value: unknown): AdminSupervisedLogin | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return {
    // An unknown status is treated as disabled: the card never offers to
    // "disable" something we cannot classify as active.
    status:
      pickEnum(record.status, ["active", "pending_guardian", "disabled"] as const) ?? "disabled",
    method: pickEnum(record.method, ["email", "handle"] as const) ?? "email",
    login_handle: pickString(record.login_handle),
    origin:
      pickEnum(record.origin, ["self_registered", "guardian_enabled"] as const) ??
      "self_registered",
    enabled_at: pickString(record.enabled_at),
    enabled_by: normalizePerson(record.enabled_by),
    disabled_at: pickString(record.disabled_at),
    disabled_reason: pickEnum(record.disabled_reason, [
      "guardian",
      "admin",
      "unlinked_purged",
    ] as const),
    password_set_by: pickEnum(record.password_set_by, ["guardian", "self"] as const) ?? "self",
    pending_since: pickString(record.pending_since),
  };
}

function normalizeLinkedDevices(value: unknown): AdminLinkedDevice[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item): AdminLinkedDevice[] => {
    const row = asRecord(item);
    const id = row ? pickString(row.linked_device_id) : null;
    if (!row || !id) {
      return [];
    }
    return [
      {
        linked_device_id: id,
        label: pickString(row.label) ?? "",
        platform: pickEnum(row.platform, ["ios", "android"] as const),
        app_version: pickString(row.app_version),
        // Anything that is not explicitly "active" is shown as revoked, so the
        // revoke action is never offered on a row we cannot classify.
        status: row.status === "active" ? "active" : "revoked",
        paired_by: normalizePerson(row.paired_by),
        paired_at: pickString(row.paired_at),
        last_seen_at: pickString(row.last_seen_at),
        absolute_expires_at: pickString(row.absolute_expires_at),
        revoked_at: pickString(row.revoked_at),
        revoked_reason: pickString(row.revoked_reason),
      },
    ];
  });
}

function normalizeFamilyAccess(value: unknown): AdminFamilyAccess | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return {
    supervision: pickEnum(record.supervision, ["pending_guardian", "active"] as const),
    supervised_login: normalizeSupervisedLogin(record.supervised_login),
    linked_devices: normalizeLinkedDevices(record.linked_devices),
  };
}

function normalizeDetailPayload(payload: unknown): AdminUserDetail | null {
  const record = readRecordAtPath(payload, ["data"]) ?? asRecord(payload);
  if (!record) {
    return null;
  }

  const base = normalizeAdminUser(record);
  if (!base) {
    return null;
  }

  return {
    ...base,
    gender: pickString(record.gender),
    birthday: pickString(record.birthday),
    blood: pickString(record.blood),
    baptism: pickBoolean(record.baptism),
    baptism_date: pickString(record.baptism_date),
    user_image: pickString(record.user_image),
    modified_at: pickString(record.modified_at),
    classes: Array.isArray(record.classes) ? record.classes : [],
    club_assignments: Array.isArray(record.club_assignments) ? record.club_assignments : [],
    health:
      record.health === null ? null : normalizeHealthBlock(record.health),
    emergency_contacts:
      record.emergency_contacts === null
        ? null
        : Array.isArray(record.emergency_contacts)
          ? record.emergency_contacts
          : undefined,
    legal_representative: asRecord(record.legal_representative),
    guardianships: normalizeGuardianships(record.guardianships),
    family_access: normalizeFamilyAccess(record.family_access),
    scope: normalizeScope(record.scope),
  };
}

function normalizeEndpointState(error: ApiError): AdminUsersResult["endpointState"] {
  if (error.status === 401 || error.status === 403) {
    return "forbidden";
  }

  if (error.status === 429) {
    return "rate-limited";
  }

  return "missing";
}

function normalizeEndpointDetail(error: ApiError): string {
  if (error.status === 401) {
    return "Sesión expirada o token inválido. Cierra sesión y vuelve a iniciar.";
  }

  if (error.status === 403) {
    return "Tu rol no tiene alcance configurado para consultar usuarios. Contacta a un super-admin.";
  }

  if (error.status === 429) {
    return "Demasiadas solicitudes. Reintenta en unos segundos.";
  }

  if (error.status >= 500) {
    return "El servicio no está disponible temporalmente para consultar usuarios.";
  }

  return "La consulta de usuarios no está disponible en este momento.";
}

export function buildListParams(query: AdminUsersQuery) {
  const params: Record<string, string | number | boolean | undefined> = {};

  const search =
    (typeof query.search === "string" && query.search.trim().length > 0
      ? query.search
      : typeof query.q === "string" && query.q.trim().length > 0
        ? query.q
        : "")
      .trim();

  if (search) {
    params.search = search;
  }

  if (typeof query.role === "string" && query.role.trim().length > 0) {
    params.role = query.role.trim();
  }

  if (typeof query.active === "boolean") {
    params.active = query.active;
  } else if (query.status === "active") {
    params.active = true;
  } else if (query.status === "inactive") {
    params.active = false;
  }

  if (typeof query.unionId === "number" && Number.isFinite(query.unionId)) {
    params.unionId = Math.floor(query.unionId);
  }

  if (typeof query.localFieldId === "number" && Number.isFinite(query.localFieldId)) {
    params.localFieldId = Math.floor(query.localFieldId);
  }

  params.sortBy = query.sortBy === "created_at" ? "created_at" : "name";
  params.sortOrder = query.sortOrder === "desc" ? "desc" : "asc";

  if (typeof query.page === "number" && Number.isFinite(query.page) && query.page > 0) {
    params.page = Math.floor(query.page);
  }

  if (typeof query.limit === "number" && Number.isFinite(query.limit) && query.limit > 0) {
    params.limit = Math.min(100, Math.floor(query.limit));
  }

  return params;
}

async function fetchUsersPage(query: AdminUsersQuery) {
  const payload = await apiRequest<unknown>("/admin/users", {
    params: buildListParams(query),
  });

  return {
    items: normalizeUsers(payload),
    meta: normalizeListMeta(payload),
  };
}

function canRecover(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    ([401, 403, 404, 405, 429].includes(error.status) || error.status >= 500)
  );
}

function shouldFetchAllPages(query: AdminUsersQuery) {
  return typeof query.page === "undefined";
}

export async function listAdminUsers(query: AdminUsersQuery = {}): Promise<AdminUsersResult> {
  const checkedAt = new Date().toISOString();

  try {
    if (!shouldFetchAllPages(query)) {
      const { items, meta } = await fetchUsersPage(query);
      return {
        items,
        meta,
        endpointAvailable: true,
        endpointState: "available",
        endpointPath: "/api/v1/admin/users",
        endpointDetail: `Disponible (${meta?.total ?? items.length} registros).`,
        checkedAt,
      };
    }

    const limit =
      typeof query.limit === "number" && Number.isFinite(query.limit) && query.limit > 0
        ? Math.min(100, Math.floor(query.limit))
        : 100;

    const merged = new Map<string, AdminUser>();
    let page = 1;
    let latestMeta: AdminUsersListMeta | null = null;
    const maxPages = 50;

    while (page <= maxPages) {
      const { items, meta } = await fetchUsersPage({ ...query, page, limit });
      latestMeta = meta;

      for (const user of items) {
        merged.set(user.user_id, user);
      }

      const hasNext =
        typeof meta?.hasNextPage === "boolean"
          ? meta.hasNextPage
          : typeof meta?.totalPages === "number"
            ? page < meta.totalPages
            : false;

      if (!hasNext) {
        break;
      }

      page += 1;
    }

    const items = Array.from(merged.values());

    const aggregateMeta: AdminUsersListMeta = latestMeta
      ? {
          ...latestMeta,
          page: 1,
          limit,
          total: latestMeta.total || items.length,
          totalPages: latestMeta.totalPages || 1,
          hasNextPage: false,
          hasPreviousPage: false,
        }
      : {
          page: 1,
          limit,
          total: items.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          scope: null,
        };

    const scopeLabel = aggregateMeta.scope ? ` Alcance: ${aggregateMeta.scope.type}.` : "";

    return {
      items,
      meta: aggregateMeta,
      endpointAvailable: true,
      endpointState: "available",
      endpointPath: "/api/v1/admin/users",
      endpointDetail: `Disponible (${aggregateMeta.total} registros).${scopeLabel}`,
      checkedAt,
    };
  } catch (error) {
    if (canRecover(error)) {
      return {
        items: [],
        meta: null,
        endpointAvailable: false,
        endpointState: normalizeEndpointState(error),
        endpointPath: "/api/v1/admin/users",
        endpointDetail: normalizeEndpointDetail(error),
        checkedAt,
      };
    }

    throw error;
  }
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error("Usuario invalido");
  }

  const payload = await apiRequest<unknown>(`/admin/users/${encodeURIComponent(normalized)}`);
  const detail = normalizeDetailPayload(payload);

  if (!detail) {
    throw new Error("No se pudo normalizar el detalle del usuario");
  }

  return detail;
}

/**
 * GET /admin/users/:userId/guardianships/:guardianshipId/consent-evidence
 * Signed URL (TTL 900 s) of the current signed consent form. Client-side only
 * (triggered by a click). Requires `legal_representative:read` (or the
 * transitional `users:read_detail`); every read is audited by the backend.
 */
export async function getAdminGuardianshipConsentEvidenceFromClient(
  userId: string,
  guardianshipId: string,
): Promise<AdminGuardianshipEvidence> {
  const payload = await apiRequestFromClient<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/guardianships/${encodeURIComponent(guardianshipId)}/consent-evidence`,
  );
  const data =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data: unknown }).data
      : payload;
  return data as AdminGuardianshipEvidence;
}

// ─── Family access (supervised login + linked devices) ──────────────────────

/** Minimum length of the reason the backend requires (trimmed). */
export const FAMILY_ACCESS_REASON_MIN_LENGTH = 5;
export const FAMILY_ACCESS_REASON_MAX_LENGTH = 500;

function buildReasonBody(reason: string): { reason: string } {
  const trimmed = reason.trim();
  if (trimmed.length < FAMILY_ACCESS_REASON_MIN_LENGTH) {
    throw new Error("El motivo debe tener al menos 5 caracteres");
  }
  return { reason: trimmed.slice(0, FAMILY_ACCESS_REASON_MAX_LENGTH) };
}

function unwrapData<T>(payload: unknown): T {
  return payload && typeof payload === "object" && "data" in payload
    ? (payload as { data: T }).data
    : (payload as T);
}

/**
 * POST /admin/users/:userId/supervised-login/disable
 * Turns off the own login of a minor. Irreversible for the admin: there is no
 * admin route to enable, reactivate or reset a password (the guardian does it).
 * Requires `users:update_admin` + the sensitive `legal_representative:update`.
 */
export async function disableSupervisedLoginFromClient(
  userId: string,
  reason: string,
): Promise<AdminDisabledSupervisedLogin> {
  const body = buildReasonBody(reason);
  const payload = await apiRequestFromClient<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/supervised-login/disable`,
    { method: "POST", body },
  );
  return unwrapData<AdminDisabledSupervisedLogin>(payload);
}

/**
 * POST /admin/users/:userId/linked-devices/:deviceId/revoke
 * Revokes a device a guardian linked to a child (idempotent).
 */
export async function revokeLinkedDeviceFromClient(
  userId: string,
  deviceId: string,
  reason: string,
): Promise<AdminRevokedLinkedDevice> {
  const body = buildReasonBody(reason);
  const payload = await apiRequestFromClient<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/linked-devices/${encodeURIComponent(deviceId)}/revoke`,
    { method: "POST", body },
  );
  return unwrapData<AdminRevokedLinkedDevice>(payload);
}

/**
 * GET /admin/users/:userId/sessions
 * Active sessions; items answer camelCase and carry `kind` ("user" | "device")
 * and `linkedDeviceId`. Client-side only.
 */
export async function listAdminUserSessionsFromClient(
  userId: string,
): Promise<AdminUserSession[]> {
  const payload = await apiRequestFromClient<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/sessions`,
  );
  const data = asRecord(unwrapData<unknown>(payload));
  const rows = Array.isArray(data?.sessions) ? data.sessions : [];
  return rows.flatMap((item): AdminUserSession[] => {
    const row = asRecord(item);
    const sessionId = row ? pickString(row.sessionId) : null;
    if (!row || !sessionId) {
      return [];
    }
    return [
      {
        sessionId,
        userId: pickString(row.userId) ?? "",
        createdAt: pickString(row.createdAt),
        expiresAt: pickString(row.expiresAt),
        ipAddress: pickString(row.ipAddress),
        userAgent: pickString(row.userAgent),
        kind: row.kind === "device" ? "device" : "user",
        linkedDeviceId: pickString(row.linkedDeviceId),
      },
    ];
  });
}

export type UpdateAdminUserPayload = {
  access_app?: boolean;
  access_panel?: boolean;
  active?: boolean;
};

export type AdminCreatableRole =
  | "user"
  | "coordinator"
  | "zone-coordinator"
  | "general-coordinator"
  | "pastor"
  | "assistant-lf"
  | "director-lf"
  | "assistant-union"
  | "director-union"
  | "assistant-dia"
  | "director-dia"
  | "admin";

export type CreateAdminUserPayload = {
  name: string;
  paternal_last_name: string;
  maternal_last_name?: string | null;
  email: string;
  role: AdminCreatableRole;
  country_id?: number | null;
  union_id?: number | null;
  local_field_id?: number | null;
};

export type CreateAdminUserResponse = {
  user_id: string;
  email: string;
  invite_email_sent: boolean;
};

function buildCreateUserBody(payload: CreateAdminUserPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: payload.name.trim(),
    paternal_last_name: payload.paternal_last_name.trim(),
    email: payload.email.trim().toLowerCase(),
    role: payload.role,
  };

  const maternal = payload.maternal_last_name?.trim();
  if (maternal) body.maternal_last_name = maternal;
  if (typeof payload.country_id === "number") body.country_id = payload.country_id;
  if (typeof payload.union_id === "number") body.union_id = payload.union_id;
  if (typeof payload.local_field_id === "number") body.local_field_id = payload.local_field_id;

  return body;
}

function unwrapCreateResponse(payload: unknown): CreateAdminUserResponse {
  const obj = payload as { status?: string; data?: CreateAdminUserResponse } | null;
  if (obj && obj.data && typeof obj.data === "object") {
    return obj.data;
  }
  return payload as CreateAdminUserResponse;
}

export async function createAdminUser(
  payload: CreateAdminUserPayload,
): Promise<CreateAdminUserResponse> {
  const raw = await apiRequest<unknown>("/admin/users", {
    method: "POST",
    body: buildCreateUserBody(payload),
  });
  return unwrapCreateResponse(raw);
}

export async function createAdminUserFromClient(
  payload: CreateAdminUserPayload,
): Promise<CreateAdminUserResponse> {
  const raw = await apiRequestFromClient<unknown>("/admin/users", {
    method: "POST",
    body: buildCreateUserBody(payload),
  });
  return unwrapCreateResponse(raw);
}

// ─── Bulk upload ───────────────────────────────────────────────────────────────

export type BulkUserRowResult = {
  row: number;
  email: string | null;
  status: "success" | "error";
  user_id?: string;
  invite_email_sent?: boolean;
  error_code?: string;
  error_message?: string;
};

export type BulkUsersResult = {
  total: number;
  succeeded: number;
  failed: number;
  results: BulkUserRowResult[];
};

function unwrapBulkResponse(payload: unknown): BulkUsersResult {
  const obj = payload as
    | { status?: string; data?: BulkUsersResult }
    | BulkUsersResult
    | null;

  if (obj && typeof obj === "object" && "data" in obj && obj.data && typeof obj.data === "object") {
    return obj.data as BulkUsersResult;
  }

  return payload as BulkUsersResult;
}

/**
 * Uploads an xlsx/csv file for bulk user creation.
 * Uses FormData — axios sets the correct multipart Content-Type automatically.
 */
export async function bulkUploadAdminUsersFromClient(
  file: File,
): Promise<BulkUsersResult> {
  const formData = new FormData();
  formData.append("file", file);

  const raw = await apiRequestFromClient<unknown>("/admin/users/bulk", {
    method: "POST",
    body: formData,
  });

  return unwrapBulkResponse(raw);
}

/**
 * Fetches the xlsx template file for bulk uploads.
 * Returns a Blob — the caller triggers the browser download.
 * Must be called from the browser only.
 */
export async function downloadAdminUsersBulkTemplate(): Promise<Blob> {
  const token = await getClientAuthToken();
  const url = `${API_BASE_URL}/admin/users/bulk-template`;
  const headers: HeadersInit = { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*" };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Template download failed: ${response.status}`);
  }

  return response.blob();
}
