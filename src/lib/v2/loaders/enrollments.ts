import { listEnrollments, type EnrollmentsQuery } from "@/lib/api/enrollments";

export function parseEnrollmentsSearchParams(
  raw: Record<string, string | string[] | undefined>,
): EnrollmentsQuery {
  const getString = (key: string) => {
    const v = raw[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  };
  const getNumber = (key: string) => {
    const v = getString(key);
    return v ? Number(v) : undefined;
  };

  return {
    search: getString("search"),
    ecclesiastical_year_id: getNumber("year"),
    page: getNumber("page") ?? 1,
    limit: getNumber("limit") ?? 20,
  };
}

export async function loadEnrollmentsList(
  raw: Record<string, string | string[] | undefined> | EnrollmentsQuery,
) {
  const query =
    "page" in raw && typeof raw.page === "number"
      ? (raw as EnrollmentsQuery)
      : parseEnrollmentsSearchParams(raw as Record<string, string | string[] | undefined>);
  const result = await listEnrollments(query);
  return { query, result };
}
