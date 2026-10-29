import type { EcclesiasticalYear } from "@/lib/api/catalogs";

type YearDates = {
  start_date?: string | null;
  end_date?: string | null;
};

type TemplateYearSource = {
  ecclesiastical_year_id: number;
  /** Year relation embedded in folder templates: ids and dates, never a name. */
  ecclesiastical_year?: YearDates | null;
};

function yearOf(date: string | null | undefined): number | null {
  const match = /^(\d{4})/.exec(date ?? "");
  return match ? Number(match[1]) : null;
}

/**
 * Same format the backend uses for the catalog `name`: "2026" when the year
 * starts and ends in the same calendar year, "2026-2027" when it spans two.
 */
export function ecclesiasticalYearLabelFromDates(
  year: YearDates | null | undefined,
): string | null {
  const startYear = yearOf(year?.start_date);
  if (startYear === null) return null;
  const endYear = yearOf(year?.end_date) ?? startYear;
  return startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;
}

/**
 * Label for the ecclesiastical year of a folder template. The template only
 * embeds the year dates, so prefer the catalog name, then derive it from the
 * dates, and only as a last resort fall back to the raw id.
 */
export function resolveTemplateYearLabel(
  template: TemplateYearSource,
  years: Pick<EcclesiasticalYear, "ecclesiastical_year_id" | "name">[],
  fallback: (id: number) => string,
): string {
  const fromCatalog = years
    .find((year) => year.ecclesiastical_year_id === template.ecclesiastical_year_id)
    ?.name?.trim();
  return (
    fromCatalog ||
    ecclesiasticalYearLabelFromDates(template.ecclesiastical_year) ||
    fallback(template.ecclesiastical_year_id)
  );
}

/**
 * Display label of a year picked by id from the catalog: its `name`, then the
 * label derived from its dates. Returns null when the year is not in the
 * catalog (callers omit the year rather than showing a raw id).
 */
export function resolveYearLabelById(
  years: Pick<EcclesiasticalYear, "ecclesiastical_year_id" | "name" | "start_date" | "end_date">[],
  yearId: number,
): string | null {
  const year = years.find((item) => item.ecclesiastical_year_id === yearId);
  if (!year) return null;
  return year.name?.trim() || ecclesiasticalYearLabelFromDates(year);
}
