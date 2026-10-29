export type CatalogOption = {
  label: string;
  value: number;
  /** Parent id: local field of a district, district of a church. */
  parentId?: number | null;
};

/** Case- and accent-insensitive key used to match catalog names. */
export function normalizeName(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

/**
 * Decodes CSV bytes as UTF-8 and falls back to Windows-1252, which is what
 * Excel writes for "CSV (comma delimited)" on Spanish Windows.
 */
export function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function isCsvFile(file: { name: string; type: string }): boolean {
  return file.type === "text/csv" || /\.csv$/i.test(file.name);
}

export type LocationMatch =
  | { ok: true; id: number }
  | { ok: false; reason: "missing" | "unknown" | "outsideParent" };

/**
 * Finds a catalog entry by name. With `parentId`, only entries under that
 * parent count; a name that exists elsewhere is reported as `outsideParent`.
 */
export function matchCatalogName(
  raw: string,
  options: CatalogOption[],
  parentId?: number,
): LocationMatch {
  if (!raw.trim()) return { ok: false, reason: "missing" };
  const key = normalizeName(raw);
  const sameName = options.filter((option) => normalizeName(option.label) === key);
  if (sameName.length === 0) return { ok: false, reason: "unknown" };
  if (parentId === undefined) return { ok: true, id: sameName[0]!.value };
  const underParent = sameName.find((option) => option.parentId === parentId);
  return underParent
    ? { ok: true, id: underParent.value }
    : { ok: false, reason: "outsideParent" };
}
