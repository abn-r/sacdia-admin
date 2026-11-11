const PREVIOUS_YEARS = 4;

export type YearRow = {
  ecclesiastical_year_id: number;
  name: string;
  start_date?: string;
};

/** Active year, the next one when it exists, and the 4 before the active one (newest first). */
export function pickYearOptions(
  years: ReadonlyArray<YearRow>,
  activeId: number | null,
): Array<{ value: string; label: string }> {
  // Ids are not chronological (years were loaded out of order): sort by date, then name.
  const yearKey = (y: YearRow) => y.start_date ?? y.name;
  const sorted = [...years].sort((a, b) => yearKey(b).localeCompare(yearKey(a)));
  const activeIndex = sorted.findIndex((y) => y.ecclesiastical_year_id === activeId);
  // Without a known active year there is nothing to anchor on: offer the latest ones.
  const slice =
    activeIndex === -1
      ? sorted.slice(0, PREVIOUS_YEARS + 1)
      : sorted.slice(Math.max(0, activeIndex - 1), activeIndex + 1 + PREVIOUS_YEARS);
  return slice.map((y) => ({ value: String(y.ecclesiastical_year_id), label: y.name }));
}
