export type ResourceRecord = Record<string, unknown>;
export type ClubTypeOption = { club_type_id: number; name: string };

export function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toRecord(value: unknown): ResourceRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as ResourceRecord;
}

function firstRecord(...values: unknown[]): ResourceRecord | null {
  for (const value of values) {
    const record = toRecord(value);
    if (record) return record;
  }
  return null;
}

export function pickResourceId(item: ResourceRecord): string | null {
  const raw = item.resource_id ?? item.id;
  if (typeof raw === "string") return toText(raw);
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return String(raw);
  return null;
}

export function pickCategoryName(item: ResourceRecord): string {
  const category = firstRecord(
    item.category,
    item.resource_categories,
    item.resource_category,
  );
  return toText(category?.name) ?? "—";
}

export function pickUploader(item: ResourceRecord): string {
  const uploader = firstRecord(item.uploader, item.users, item.uploaded_by_user);
  if (!uploader) return "—";

  const name = toText(uploader.name);
  const lastName = toText(uploader.last_name);
  if (name && lastName) return `${name} ${lastName}`;
  return name ?? toText(uploader.email) ?? "—";
}

export function pickClubTypeIdValue(item?: ResourceRecord | null): string {
  if (!item) return "all";
  const id = toPositiveNumber(item.club_type_id ?? firstRecord(item.club_types)?.club_type_id);
  return id ? String(Math.floor(id)) : "all";
}

export function pickClubTypeLabel(
  item: ResourceRecord,
  clubTypes: ClubTypeOption[],
): string {
  const relation = firstRecord(item.club_types, item.club_type);
  const relationName = toText(relation?.name);
  if (relationName) return relationName;

  if (typeof item.club_type === "string") {
    return toText(item.club_type) ?? "Todos";
  }

  const id = toPositiveNumber(item.club_type_id ?? relation?.club_type_id);
  if (!id) return "Todos";

  return clubTypes.find((clubType) => clubType.club_type_id === Math.floor(id))?.name ?? "—";
}

export function extractResourceSignedUrl(payload: unknown): string | null {
  const record = toRecord(payload);
  const directUrl = toText(record?.signed_url) ?? toText(record?.url);
  if (directUrl) return directUrl;

  const data = toRecord(record?.data);
  return toText(data?.signed_url) ?? toText(data?.url);
}
