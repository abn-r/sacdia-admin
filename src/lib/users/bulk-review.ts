/**
 * Whole-file review of the bulk user upload, done in the browser before
 * anything is sent (same idea as the clubs import). The template asks for
 * union and local-field NAMES; they are resolved to catalog ids here, so the
 * file that reaches the API carries ids (see `bulk-send.ts`).
 *
 * Old files with `country_id` / `union_id` / `local_field_id` columns keep
 * working: those columns are read as ids.
 */

export const BULK_TEMPLATE_HEADERS = [
  "email",
  "name",
  "paternal_last_name",
  "maternal_last_name",
  "role",
  "country",
  "union",
  "local_field",
] as const;

export const BULK_REVIEW_MAX_ROWS = 500;
export const BULK_REVIEW_MAX_BYTES = 5 * 1024 * 1024;

const REQUIRED_HEADERS = ["email", "name", "paternal_last_name", "role"] as const;
const MAX_LENGTH = { email: 120, name: 50, paternal_last_name: 50, maternal_last_name: 50 } as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type BulkCatalogs = {
  countries: Array<{ id: number; name: string }>;
  unions: Array<{ id: number; name: string; countryId: number | null }>;
  localFields: Array<{ id: number; name: string; unionId: number | null }>;
};

export type BulkReviewContext = {
  /** Roles the actor may assign (slugs). */
  allowedRoles: readonly string[];
  /** Every role slug the file may name, with its label in the panel language. */
  roleLabels: Readonly<Record<string, string>>;
  /** Roles that cannot be created without a local field. */
  localFieldRequiredRoles: readonly string[];
  catalogs: BulkCatalogs;
};

export type BulkRequiredField = (typeof REQUIRED_HEADERS)[number];

export type BulkIssue =
  | { code: "missingRequired"; fields: BulkRequiredField[] }
  | { code: "emailInvalid"; value: string }
  | { code: "duplicateEmail"; row: number }
  | { code: "roleUnknown"; value: string }
  | { code: "roleNotAllowed"; value: string }
  | { code: "localFieldRequired" }
  | { code: "countryUnknown"; value: string }
  | { code: "unionUnknown"; value: string }
  | { code: "localFieldUnknown"; value: string }
  | { code: "unionOutsideCountry"; value: string; parent: string }
  | { code: "localFieldOutsideUnion"; value: string; parent: string }
  | { code: "ambiguous"; value: string }
  | { code: "tooLong"; field: keyof typeof MAX_LENGTH; max: number };

export type BulkReviewRow = {
  /** Row number in the user's sheet (header = 1). */
  row: number;
  email: string;
  name: string;
  paternalLastName: string;
  maternalLastName: string;
  /** Role slug when recognised, otherwise what the file said. */
  role: string;
  countryId?: number;
  unionId?: number;
  localFieldId?: number;
  issues: BulkIssue[];
};

export type BulkReviewResult =
  | { ok: true; rows: BulkReviewRow[] }
  | { ok: false; reason: "empty" }
  | { ok: false; reason: "missing-headers"; missing: string[] }
  | { ok: false; reason: "too-many-rows"; total: number };

/** Case- and accent-insensitive key. */
export function normalizeBulkText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

type Geo = { id: number; name: string; parentId: number | null };

type GeoMatch =
  | { ok: true; entry: Geo }
  | { ok: false; reason: "blank" | "unknown" | "outsideParent" | "ambiguous" };

function matchGeo(
  raw: string,
  options: Geo[],
  parent: { id: number } | null,
  asId: boolean,
): GeoMatch {
  if (!raw) return { ok: false, reason: "blank" };
  let found: Geo[];
  if (asId) {
    const id = Number(raw);
    found = Number.isInteger(id) ? options.filter((option) => option.id === id) : [];
  } else {
    const key = normalizeBulkText(raw);
    found = options.filter((option) => normalizeBulkText(option.name) === key);
  }
  if (found.length === 0) return { ok: false, reason: "unknown" };
  if (parent) {
    const underParent = found.filter((option) => option.parentId === parent.id);
    if (underParent.length === 0) return { ok: false, reason: "outsideParent" };
    return underParent.length > 1
      ? { ok: false, reason: "ambiguous" }
      : { ok: true, entry: underParent[0]! };
  }
  return found.length > 1 ? { ok: false, reason: "ambiguous" } : { ok: true, entry: found[0]! };
}

/**
 * `matrix` is the first sheet as rows of cells, blank rows INCLUDED
 * (`sheet_to_json` with `header: 1, blankrows: true`), so `row` matches the
 * number the user sees in Excel.
 */
export function reviewBulkUsers(matrix: unknown[][], ctx: BulkReviewContext): BulkReviewResult {
  const indexed = matrix
    .map((cells, index) => ({ cells, row: index + 1 }))
    .filter(({ cells }) => Array.isArray(cells) && cells.some((cell) => cellText(cell) !== ""));
  if (indexed.length === 0) return { ok: false, reason: "empty" };

  const headers = indexed[0]!.cells.map((cell) => normalizeBulkText(cell).replace(/ /g, "_"));
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length > 0) return { ok: false, reason: "missing-headers", missing: [...missing] };

  const data = indexed.slice(1);
  if (data.length === 0) return { ok: false, reason: "empty" };
  if (data.length > BULK_REVIEW_MAX_ROWS) {
    return { ok: false, reason: "too-many-rows", total: data.length };
  }

  const column = (...names: string[]) => {
    for (const name of names) {
      const index = headers.indexOf(name);
      if (index >= 0) return { index, asId: name.endsWith("_id") };
    }
    return null;
  };
  const cols = {
    email: column("email")!,
    name: column("name")!,
    paternal: column("paternal_last_name")!,
    maternal: column("maternal_last_name"),
    role: column("role")!,
    country: column("country", "country_id"),
    union: column("union", "union_id"),
    localField: column("local_field", "local_field_id"),
  };
  const read = (cells: unknown[], col: { index: number } | null) =>
    col ? cellText(cells[col.index]) : "";

  const roleBySlug = new Map<string, string>();
  for (const [slug, label] of Object.entries(ctx.roleLabels)) {
    roleBySlug.set(normalizeBulkText(slug), slug);
    roleBySlug.set(normalizeBulkText(label), slug);
  }

  const countries: Geo[] = ctx.catalogs.countries.map((c) => ({ id: c.id, name: c.name, parentId: null }));
  const unions: Geo[] = ctx.catalogs.unions.map((u) => ({ id: u.id, name: u.name, parentId: u.countryId }));
  const localFields: Geo[] = ctx.catalogs.localFields.map((l) => ({
    id: l.id,
    name: l.name,
    parentId: l.unionId,
  }));

  const firstRowByEmail = new Map<string, number>();
  const rows: BulkReviewRow[] = [];

  for (const { cells, row } of data) {
    const issues: BulkIssue[] = [];
    const email = read(cells, cols.email).toLowerCase();
    const name = read(cells, cols.name);
    const paternalLastName = read(cells, cols.paternal);
    const maternalLastName = read(cells, cols.maternal);
    const roleRaw = read(cells, cols.role);

    const absent: BulkRequiredField[] = [];
    if (!email) absent.push("email");
    if (!name) absent.push("name");
    if (!paternalLastName) absent.push("paternal_last_name");
    if (!roleRaw) absent.push("role");
    if (absent.length > 0) issues.push({ code: "missingRequired", fields: absent });

    if (email && !EMAIL_REGEX.test(email)) issues.push({ code: "emailInvalid", value: email });
    for (const [field, value] of [
      ["email", email],
      ["name", name],
      ["paternal_last_name", paternalLastName],
      ["maternal_last_name", maternalLastName],
    ] as const) {
      if (value.length > MAX_LENGTH[field]) {
        issues.push({ code: "tooLong", field, max: MAX_LENGTH[field] });
      }
    }

    if (email) {
      const first = firstRowByEmail.get(email);
      if (first !== undefined) issues.push({ code: "duplicateEmail", row: first });
      else firstRowByEmail.set(email, row);
    }

    let role = roleRaw;
    if (roleRaw) {
      const slug = roleBySlug.get(normalizeBulkText(roleRaw));
      if (!slug) issues.push({ code: "roleUnknown", value: roleRaw });
      else {
        role = slug;
        if (!ctx.allowedRoles.includes(slug)) issues.push({ code: "roleNotAllowed", value: roleRaw });
      }
    }

    // Geography: country → union → local field, each checked against its parent.
    let country: Geo | null = null;
    let union: Geo | null = null;
    let localField: Geo | null = null;

    const countryRaw = read(cells, cols.country);
    const unionRaw = read(cells, cols.union);
    const localFieldRaw = read(cells, cols.localField);

    const countryMatch = matchGeo(countryRaw, countries, null, cols.country?.asId ?? false);
    if (countryMatch.ok) country = countryMatch.entry;
    else if (countryMatch.reason === "unknown") issues.push({ code: "countryUnknown", value: countryRaw });
    else if (countryMatch.reason === "ambiguous") issues.push({ code: "ambiguous", value: countryRaw });

    const countryFailed = Boolean(countryRaw) && !country;
    const unionMatch = matchGeo(unionRaw, unions, country, cols.union?.asId ?? false);
    if (unionMatch.ok) union = unionMatch.entry;
    else if (unionMatch.reason === "unknown") issues.push({ code: "unionUnknown", value: unionRaw });
    else if (unionMatch.reason === "ambiguous") issues.push({ code: "ambiguous", value: unionRaw });
    else if (unionMatch.reason === "outsideParent") {
      issues.push({ code: "unionOutsideCountry", value: unionRaw, parent: countryRaw });
    }
    // The country was unreadable: judge the union on its own name.
    if (!union && countryFailed && unionRaw) {
      const alone = matchGeo(unionRaw, unions, null, cols.union?.asId ?? false);
      if (alone.ok) union = alone.entry;
    }

    const unionFailed = Boolean(unionRaw) && !union;
    const fieldMatch = matchGeo(localFieldRaw, localFields, union, cols.localField?.asId ?? false);
    if (fieldMatch.ok) localField = fieldMatch.entry;
    else if (fieldMatch.reason === "unknown") issues.push({ code: "localFieldUnknown", value: localFieldRaw });
    else if (fieldMatch.reason === "ambiguous") issues.push({ code: "ambiguous", value: localFieldRaw });
    else if (fieldMatch.reason === "outsideParent") {
      issues.push({ code: "localFieldOutsideUnion", value: localFieldRaw, parent: unionRaw });
    }
    if (!localField && unionFailed && localFieldRaw) {
      const alone = matchGeo(localFieldRaw, localFields, null, cols.localField?.asId ?? false);
      if (alone.ok) localField = alone.entry;
    }

    // Fill the parents a child implies, so a file may carry only the local field.
    if (localField && !union && localField.parentId !== null) {
      union = unions.find((u) => u.id === localField!.parentId) ?? null;
    }
    if (union && !country && union.parentId !== null) {
      country = countries.find((c) => c.id === union!.parentId) ?? null;
    }

    const needsLocalField = ctx.localFieldRequiredRoles.includes(role);
    if (needsLocalField && !localFieldRaw) issues.push({ code: "localFieldRequired" });

    rows.push({
      row,
      email,
      name,
      paternalLastName,
      maternalLastName,
      role,
      ...(country ? { countryId: country.id } : {}),
      ...(union ? { unionId: union.id } : {}),
      ...(localField ? { localFieldId: localField.id } : {}),
      issues,
    });
  }

  return { ok: true, rows };
}

export function summarizeBulkReview(rows: readonly BulkReviewRow[]) {
  const withErrors = rows.filter((row) => row.issues.length > 0).length;
  return { total: rows.length, ready: rows.length - withErrors, withErrors };
}
