import type {
  MasterHonorPayload,
  MasterHonorRuleGroupPayload,
  MasterHonorRuleGroupType,
} from "@/lib/api/phase-e-catalogs";

export type MasterHonorRawRecord = {
  philosophy?: unknown;
  notes?: unknown;
  applicability_scope?: unknown;
  division_ids?: unknown;
  master_honor_divisions?: unknown;
  requirement_groups?: unknown;
};

function toPositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function toNonNegativeInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function isMasterHonorGroupType(value: unknown): value is MasterHonorRuleGroupType {
  return value === "EXPLICIT_OPTIONS" || value === "CATEGORY_COUNT";
}

function normalizeText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function normalizeMasterHonorsGroup(
  raw: unknown,
  fallbackDisplayOrder: number,
): MasterHonorRuleGroupPayload {
  if (!raw || typeof raw !== "object") {
    return {
      group_type: "EXPLICIT_OPTIONS",
      minimum_required: 0,
      display_order: fallbackDisplayOrder,
      options: [],
    };
  }

  const group = raw as Record<string, unknown>;
  const groupType = isMasterHonorGroupType(group.group_type)
    ? group.group_type
    : "EXPLICIT_OPTIONS";
  const minimumRequired = Math.max(0, toNonNegativeInt(group.minimum_required) ?? 0);
  const displayOrder = Math.max(0, toNonNegativeInt(group.display_order) ?? fallbackDisplayOrder);
  const title = normalizeText(group.title);
  const description = normalizeText(group.description);
  const groupId = toPositiveInt(group.group_id);
  const honorsCategoryId = toPositiveInt(group.honors_category_id);
  const rawOptions = Array.isArray(group.options) ? group.options : [];

  const options = groupType === "EXPLICIT_OPTIONS"
    ? rawOptions
      .filter(
        (option): option is Record<string, unknown> =>
          option !== null && typeof option === "object",
      )
      .map((option, index) => {
        const optionRecord = option as Record<string, unknown>;
        const optionId = toPositiveInt(optionRecord.option_id);
        const label = normalizeText(optionRecord.label) ?? "";
        const honorIdsFromFlat = Array.isArray(optionRecord.honor_ids)
          ? optionRecord.honor_ids.map((id) => toPositiveInt(id)).filter((value): value is number => value !== null)
          : [];

        const honorIdsFromNested = Array.isArray(optionRecord.honors)
          ? optionRecord.honors
            .map((honorRecord) => {
              if (typeof honorRecord === "number") {
                return toPositiveInt(honorRecord);
              }
              if (!honorRecord || typeof honorRecord !== "object") {
                return null;
              }
              const honorObject = honorRecord as Record<string, unknown>;
              if ("honor_id" in honorObject) {
                return toPositiveInt(honorObject.honor_id);
              }
              if (
                "honor" in honorObject &&
                honorObject.honor !== null &&
                typeof honorObject.honor === "object"
              ) {
                return toPositiveInt((honorObject.honor as Record<string, unknown>).honor_id);
              }
              return null;
            })
            .filter((value): value is number => value !== null)
          : [];

        const honor_ids = Array.from(new Set([
          ...honorIdsFromFlat,
          ...honorIdsFromNested,
        ]));

        return {
          ...(optionId ? { option_id: optionId } : {}),
          label,
          display_order: Math.max(0, toNonNegativeInt(optionRecord.display_order) ?? index + 1),
          honor_ids,
          ...(typeof optionRecord.active === "boolean" ? { active: optionRecord.active } : {}),
        };
      })
    : [];

  const normalized: MasterHonorRuleGroupPayload = {
    group_type: groupType,
    minimum_required: minimumRequired,
    display_order: displayOrder,
    options,
    ...(groupId ? { group_id: groupId } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(typeof group.active === "boolean" ? { active: group.active } : {}),
  };

  if (groupType === "CATEGORY_COUNT" && honorsCategoryId) {
    normalized.honors_category_id = honorsCategoryId;
  }

  return normalized;
}

export function normalizeMasterHonorsDivisionIds(
  rawScope: unknown,
  rawDivisionIds: unknown,
  rawDivisionRecords: unknown,
): number[] {
  if (rawScope !== "SELECTED_DIVISIONS") return [];
  const flatIds = Array.isArray(rawDivisionIds)
    ? rawDivisionIds.map((id) => toPositiveInt(id)).filter((value): value is number => value !== null)
    : [];

  const nestedDivisionIds = Array.isArray(rawDivisionRecords)
    ? rawDivisionRecords
      .map((entry) =>
        entry && typeof entry === "object" && "division_id" in entry
          ? toPositiveInt((entry as Record<string, unknown>).division_id)
          : null,
      )
      .filter((value): value is number => value !== null)
    : [];

  return Array.from(new Set([...flatIds, ...nestedDivisionIds]));
}

export function normalizeMasterHonorsPayload(item?: MasterHonorRawRecord | null): MasterHonorPayload {
  const requirementGroups = Array.isArray(item?.requirement_groups)
    ? item?.requirement_groups
    : [];

  return {
    ...(normalizeText(item?.philosophy) ? { philosophy: normalizeText(item?.philosophy) as string } : {}),
    ...(normalizeText(item?.notes) ? { notes: normalizeText(item?.notes) as string } : {}),
    applicability_scope:
      item?.applicability_scope === "SELECTED_DIVISIONS"
        ? "SELECTED_DIVISIONS"
        : "ALL",
    division_ids: normalizeMasterHonorsDivisionIds(
      item?.applicability_scope,
      item?.division_ids,
      item?.master_honor_divisions,
    ),
    requirement_groups: requirementGroups.map((group, index) =>
      normalizeMasterHonorsGroup(group, index + 1),
    ),
  };
}

