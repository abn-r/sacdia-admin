import { ecclesiasticalYearLabel } from "@/lib/api/reports";

type YearLike = {
  ecclesiastical_year_id?: number;
  year_id?: number;
  start_date?: string | null;
  end_date?: string | null;
};

/**
 * Display label ("2027") for an ecclesiastical year id. The panel keeps ids for
 * the API; people read the year, never the id.
 */
export function resolveYearLabel(
  years: YearLike[],
  yearId: number | null | undefined,
): string | null {
  if (yearId == null) return null;
  const match = years.find((year) => (year.ecclesiastical_year_id ?? year.year_id) === yearId);
  return ecclesiasticalYearLabel(match);
}
