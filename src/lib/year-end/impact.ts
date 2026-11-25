import type { YearEndEnrollmentDetail } from "@/lib/api/year-end";

export type ClubImpactRow = {
  clubName: string;
  clubTypes: string[];
  enrollments: number;
};

/**
 * Collapses the preview's one-row-per-enrollment list into one row per club
 * (a club can enroll several sections), sorted by enrollments then name.
 */
export function groupImpactByClub(details: YearEndEnrollmentDetail[]): ClubImpactRow[] {
  const byClub = new Map<string, ClubImpactRow>();
  for (const detail of details) {
    const name = detail.clubName.trim();
    const row = byClub.get(name) ?? { clubName: name, clubTypes: [], enrollments: 0 };
    row.enrollments += 1;
    const type = detail.clubType.trim();
    if (type && !row.clubTypes.includes(type)) row.clubTypes.push(type);
    byClub.set(name, row);
  }
  return [...byClub.values()].sort(
    (a, b) => b.enrollments - a.enrollments || a.clubName.localeCompare(b.clubName),
  );
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * limit;
  return { items: items.slice(start, start + limit), page: current, totalPages, total: items.length };
}
