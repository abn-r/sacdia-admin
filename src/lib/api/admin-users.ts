import { ApiError, apiRequest } from "@/lib/api/client";

export type ScopeType = "ALL" | "UNION" | "LOCAL_FIELD";

export type ScopeMeta = {
  type: ScopeType;
  roles: string[];
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
  q?: string;
  status?: "active" | "inactive" | "pending" | "approved";
};

export type AdminApprovalDecision = "approve" | "reject";

export type UpdateAdminUserApprovalPayload = {
  userId: string;
  decision: AdminApprovalDecision;
  reason?: string;
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
  if (typeRaw !== "ALL" && typeRaw !== "UNION" && typeRaw !== "LOCAL_FIELD") {
    return null;
  }

  return {
    type: typeRaw,
    roles: normalizeRoles(record.roles),
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
    return "Sesion expirada o token invalido. Cierra sesion y vuelve a iniciar.";
  }

  if (error.status === 403) {
    return "Tu rol no tiene alcance configurado para consultar usuarios. Contacta a un super_admin.";
  }

  if (error.status === 429) {
    return "Demasiadas solicitudes. Reintenta en unos segundos.";
  }

  if (error.status >= 500) {
    return "El backend no esta disponible temporalmente para consultar usuarios.";
  }

  return "Endpoint no publicado o metodo no habilitado en backend.";
}

function buildListParams(query: AdminUsersQuery) {
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

function normalizeApprovalPayload(payload: UpdateAdminUserApprovalPayload) {
  const approved = payload.decision === "approve";
  const rejectionReason =
    !approved && payload.reason && payload.reason.trim().length > 0
      ? payload.reason.trim()
      : undefined;

  return {
    approved,
    approval: approved ? 1 : 0,
    status: approved ? "approved" : "rejected",
    rejection_reason: rejectionReason,
  };
}

export type UpdateAdminUserPayload = {
  access_app?: boolean;
  access_panel?: boolean;
  active?: boolean;
  approval_status?: "pending" | "approved" | "rejected";
};

export async function updateAdminUserApproval(payload: UpdateAdminUserApprovalPayload) {
  const userId = payload.userId.trim();

  if (!userId) {
    throw new Error("Usuario invalido");
  }

  const data = normalizeApprovalPayload(payload);
  const attempts = [
    {
      path: `/admin/users/${encodeURIComponent(userId)}/approval`,
      body: {
        approved: data.approved,
        rejection_reason: data.rejection_reason,
      },
    },
    {
      path: `/admin/users/${encodeURIComponent(userId)}`,
      body: {
        approval: data.approval,
        status: data.status,
        rejection_reason: data.rejection_reason,
      },
    },
  ] as const;

  let lastKnownError: ApiError | null = null;

  for (const attempt of attempts) {
    try {
      return await apiRequest<unknown>(attempt.path, {
        method: "PATCH",
        body: attempt.body,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        lastKnownError = error;

        if ([404, 405, 422].includes(error.status)) {
          continue;
        }

        throw error;
      }

      throw error;
    }
  }

  if (lastKnownError) {
    throw lastKnownError;
  }

  throw new Error("No se pudo actualizar la aprobacion del usuario");
}
