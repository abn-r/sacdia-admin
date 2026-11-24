import type { Camporee, UnionCamporee } from "@/lib/api/camporees";
import { isClubRegistrationClosed } from "@/lib/camporees/club-registration";
import type { CamporeeKind } from "@/lib/camporees/normalize";

export type CamporeeRegistrationState = "open" | "closed" | "inactive";

export type CamporeeListRow = {
  id: number;
  kind: CamporeeKind;
  name: string;
  start_date: string;
  end_date: string;
  place: string | null;
  /** Union name for union camporees, local field name for local ones. */
  owner: string | null;
  active: boolean;
  registrationClosedAt: string | null;
  registration: CamporeeRegistrationState;
};

export type CamporeeRangeFilter = "upcoming" | "past" | "all";

export function registrationStateOf(input: {
  active: boolean;
  closedAt?: string | null;
}): CamporeeRegistrationState {
  if (!input.active) return "inactive";
  return isClubRegistrationClosed(input.closedAt) ? "closed" : "open";
}

function pickId(...values: Array<number | null | undefined>): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

export function toLocalListRow(raw: Camporee): CamporeeListRow {
  const active = raw.active !== false;
  const closedAt = raw.club_registration_closed_at ?? null;
  return {
    id: pickId(raw.local_camporee_id, raw.camporee_id, raw.id),
    kind: "local",
    name: raw.name,
    start_date: raw.start_date,
    end_date: raw.end_date,
    place: raw.local_camporee_place?.trim() || null,
    // The list returns the Prisma relation as `local_fields`; normalized records use `local_field`.
    owner:
      raw.local_field?.name?.trim() ||
      (raw as { local_fields?: { name?: string } }).local_fields?.name?.trim() ||
      null,
    active,
    registrationClosedAt: closedAt,
    registration: registrationStateOf({ active, closedAt }),
  };
}

export function toUnionListRow(raw: UnionCamporee): CamporeeListRow {
  const active = raw.active !== false;
  const closedAt = raw.club_registration_closed_at ?? null;
  return {
    id: pickId(raw.union_camporee_id, raw.id),
    kind: "union",
    name: raw.name,
    start_date: raw.start_date,
    end_date: raw.end_date,
    place: (raw.union_camporee_place ?? raw.place)?.trim() || null,
    owner: raw.union_name?.trim() || null,
    active,
    registrationClosedAt: closedAt,
    registration: registrationStateOf({ active, closedAt }),
  };
}

function dayOf(value: string): string {
  return value.slice(0, 10);
}

/** `today` is `YYYY-MM-DD`. A camporee is "upcoming" until its last day ends. */
export function matchesRange(
  row: Pick<CamporeeListRow, "end_date">,
  range: CamporeeRangeFilter,
  today: string,
): boolean {
  if (range === "all") return true;
  const ended = dayOf(row.end_date) < today;
  return range === "past" ? ended : !ended;
}

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function filterCamporeeRows(
  rows: CamporeeListRow[],
  filters: { query: string; range: CamporeeRangeFilter; today: string },
): CamporeeListRow[] {
  const query = fold(filters.query.trim());
  return rows.filter((row) => {
    if (!matchesRange(row, filters.range, filters.today)) return false;
    if (!query) return true;
    return [row.name, row.place ?? "", row.owner ?? ""].some((text) =>
      fold(text).includes(query),
    );
  });
}

/** Rows with registration open (active and not closed): the list's finding. */
export function countOpenRegistration(rows: CamporeeListRow[]): number {
  return rows.filter((row) => row.registration === "open").length;
}
