import type {
  PendingValidation,
  ValidationStatus,
} from "@/lib/api/validation";

type RawUser = {
  user_id: string;
  name?: string | null;
  paternal_last_name?: string | null;
  maternal_last_name?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type RawUserHonor = {
  user_honor_id: number;
  created_at?: string | null;
  validation_status?: string | null;
  users?: RawUser | null;
  honors?: { honor_id: number; name: string } | null;
};

type PendingReviewsResponse = {
  honors?: RawUserHonor[];
};

function mapUser(user?: RawUser | null): PendingValidation["user"] {
  if (!user) return null;
  const firstName = user.first_name ?? user.name ?? null;
  const lastName =
    user.last_name ??
    ([user.paternal_last_name, user.maternal_last_name].filter(Boolean).join(" ") || null);
  return {
    user_id: user.user_id,
    first_name: firstName,
    last_name: lastName || null,
    email: user.email ?? null,
  };
}

function mapUserHonor(row: RawUserHonor): PendingValidation {
  return {
    validation_id: row.user_honor_id,
    entity_type: "honor",
    entity_id: row.user_honor_id,
    status: (row.validation_status as ValidationStatus) ?? "PENDING",
    submitted_at: row.created_at ?? null,
    user: mapUser(row.users),
    entity: row.honors ? { id: row.honors.honor_id, name: row.honors.name } : null,
    section: null,
  };
}

export function normalizePendingValidationsResponse(
  payload: unknown,
): PendingValidation[] {
  if (Array.isArray(payload)) {
    return payload as PendingValidation[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if ("data" in record && Array.isArray(record.data)) {
      return record.data as PendingValidation[];
    }

    if ("honors" in record) {
      const typed = record as PendingReviewsResponse;
      return (typed.honors ?? []).map(mapUserHonor);
    }
  }

  return [];
}
