type GenericRecord = Record<string, unknown>;

export type CertificationListItem = {
  certification_id: number;
  name: string;
  description: string | null;
  duration_weeks: number | null;
  modules_count: number | null;
  active: boolean;
};

export type CertificationListPage = {
  items: CertificationListItem[];
  total: number;
};

function positiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function extractItems(payload: unknown): GenericRecord[] {
  if (Array.isArray(payload)) return payload as GenericRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as GenericRecord;
    if (Array.isArray(root.data)) return root.data as GenericRecord[];
    const nested = root.data;
    if (nested && typeof nested === "object" && Array.isArray((nested as GenericRecord).data)) {
      return (nested as GenericRecord).data as GenericRecord[];
    }
  }
  return [];
}

function extractTotal(payload: unknown, fallback: number): number {
  if (payload && typeof payload === "object") {
    const meta = (payload as GenericRecord).meta;
    if (meta && typeof meta === "object") {
      const total = Number((meta as GenericRecord).total);
      if (Number.isFinite(total) && total >= 0) return total;
    }
  }
  return fallback;
}

export function normalizeCertificationItem(item: GenericRecord): CertificationListItem {
  const modulesRaw = item.modules;
  return {
    certification_id: positiveNumber(item.certification_id) ?? positiveNumber(item.id) ?? 0,
    name: typeof item.name === "string" ? item.name : "",
    description:
      typeof item.description === "string" && item.description.trim() ? item.description : null,
    duration_weeks: positiveNumber(item.duration_weeks) ?? positiveNumber(item.durationWeeks),
    modules_count:
      positiveNumber(item.modules_count) ??
      positiveNumber(item.modulesCount) ??
      (Array.isArray(modulesRaw) ? modulesRaw.length : null),
    active: item.active !== false,
  };
}

/** Reads `GET /certifications/certifications` (`{ data: [...], meta: { total } }`). */
export function normalizeCertificationListPage(payload: unknown): CertificationListPage {
  const items = extractItems(payload).map(normalizeCertificationItem);
  return { items, total: extractTotal(payload, items.length) };
}

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * The API has no `search` param for certifications, so the query filters the
 * loaded page (name and description, accent- and case-insensitive).
 */
export function filterCertifications(
  items: CertificationListItem[],
  query: string,
): CertificationListItem[] {
  const needle = fold(query.trim());
  if (!needle) return items;
  return items.filter((item) => fold(`${item.name} ${item.description ?? ""}`).includes(needle));
}
