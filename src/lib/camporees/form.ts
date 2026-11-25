import type { CamporeePayload, UnionCamporeePayload } from "@/lib/api/camporees";
import type { CamporeeKind, NormalizedCamporee } from "@/lib/camporees/normalize";

/** Every control of the camporee form as the text the user sees. */
export type CamporeeFormValues = {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  club_registration_deadline: string;
  member_registration_deadline: string;
  payment_deadline: string;
  agenda_visible_from: string;
  place: string;
  lat: string;
  long: string;
  /** Local field id (local) or union id (union), as text. */
  owner_id: string;
  registration_cost: string;
  includes_adventurers: boolean;
  includes_pathfinders: boolean;
  includes_master_guides: boolean;
};

export type CamporeeFormErrorKey =
  | "name_required"
  | "start_date_required"
  | "end_date_required"
  | "place_required"
  | "coordinates_invalid"
  | "coordinates_pair_required"
  | "local_field_required"
  | "union_required"
  | "end_date_after_start_full";

export type CamporeeFormErrors = Partial<
  Record<keyof CamporeeFormValues, CamporeeFormErrorKey>
>;

export function toDateInput(value?: string | null): string {
  if (!value) return "";
  return value.split("T")[0] ?? "";
}

/** ISO timestamp to the `datetime-local` input value (browser timezone). */
export function toDateTimeInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** `datetime-local` value to an ISO timestamp with offset. */
export function toApiDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function emptyFormValues(ownerId: number | null = null): CamporeeFormValues {
  return {
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    club_registration_deadline: "",
    member_registration_deadline: "",
    payment_deadline: "",
    agenda_visible_from: "",
    place: "",
    lat: "",
    long: "",
    owner_id: ownerId && ownerId > 0 ? String(ownerId) : "",
    registration_cost: "",
    includes_adventurers: false,
    includes_pathfinders: true,
    includes_master_guides: false,
  };
}

export function formValuesFromCamporee(
  camporee: NormalizedCamporee,
): CamporeeFormValues {
  const ownerId =
    camporee.kind === "union" ? camporee.union_id : camporee.local_field_id;
  return {
    name: camporee.name,
    description: camporee.description ?? "",
    start_date: toDateInput(camporee.start_date),
    end_date: toDateInput(camporee.end_date),
    club_registration_deadline: toDateTimeInput(camporee.club_registration_deadline),
    member_registration_deadline: toDateTimeInput(
      camporee.member_registration_deadline,
    ),
    payment_deadline: toDateTimeInput(camporee.payment_deadline),
    agenda_visible_from: toDateTimeInput(camporee.agenda_visible_from),
    place: camporee.local_camporee_place ?? "",
    lat: camporee.lat != null ? String(camporee.lat) : "",
    long: camporee.long != null ? String(camporee.long) : "",
    owner_id: ownerId ? String(ownerId) : "",
    registration_cost:
      camporee.registration_cost != null ? String(camporee.registration_cost) : "",
    includes_adventurers: camporee.includes_adventurers ?? false,
    includes_pathfinders: camporee.includes_pathfinders ?? true,
    includes_master_guides: camporee.includes_master_guides ?? false,
  };
}

function parseCoordinate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function validateCamporeeForm(
  values: CamporeeFormValues,
  kind: CamporeeKind,
): CamporeeFormErrors {
  const errors: CamporeeFormErrors = {};
  if (!values.name.trim()) errors.name = "name_required";
  if (!values.start_date) errors.start_date = "start_date_required";
  if (!values.end_date) errors.end_date = "end_date_required";
  else if (values.start_date && values.start_date > values.end_date) {
    errors.end_date = "end_date_after_start_full";
  }
  if (!values.place.trim()) errors.place = "place_required";
  const ownerId = Number(values.owner_id);
  if (!Number.isInteger(ownerId) || ownerId < 1) {
    errors.owner_id = kind === "union" ? "union_required" : "local_field_required";
  }
  const lat = parseCoordinate(values.lat);
  const long = parseCoordinate(values.long);
  if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
    errors.lat = "coordinates_invalid";
  }
  if (long !== null && (Number.isNaN(long) || long < -180 || long > 180)) {
    errors.long = "coordinates_invalid";
  }
  if (!errors.lat && !errors.long && (lat === null) !== (long === null)) {
    errors.long = "coordinates_pair_required";
  }
  return errors;
}

type CommonPayload = Omit<
  CamporeePayload,
  "local_field_id" | "local_camporee_place"
>;

function optionalDeadline(value: string): string | undefined {
  return value ? toApiDateTime(value) : undefined;
}

function commonPayload(values: CamporeeFormValues): CommonPayload {
  const lat = parseCoordinate(values.lat);
  const long = parseCoordinate(values.long);
  const cost = values.registration_cost.trim();
  return {
    name: values.name.trim(),
    description: values.description.trim() || undefined,
    start_date: values.start_date,
    end_date: values.end_date,
    club_registration_deadline: optionalDeadline(values.club_registration_deadline),
    member_registration_deadline: optionalDeadline(values.member_registration_deadline),
    payment_deadline: optionalDeadline(values.payment_deadline),
    agenda_visible_from: optionalDeadline(values.agenda_visible_from) ?? null,
    lat: lat ?? undefined,
    long: long ?? undefined,
    registration_cost: cost ? Number(cost) : undefined,
    includes_adventurers: values.includes_adventurers,
    includes_pathfinders: values.includes_pathfinders,
    includes_master_guides: values.includes_master_guides,
  };
}

export function buildLocalCreatePayload(values: CamporeeFormValues): CamporeePayload {
  return {
    ...commonPayload(values),
    local_field_id: Number(values.owner_id),
    local_camporee_place: values.place.trim(),
  };
}

export function buildUnionCreatePayload(values: CamporeeFormValues): UnionCamporeePayload {
  return {
    ...commonPayload(values),
    union_id: Number(values.owner_id),
    union_camporee_place: values.place.trim(),
  };
}

const DEADLINE_FIELDS = [
  "club_registration_deadline",
  "member_registration_deadline",
  "payment_deadline",
  "agenda_visible_from",
] as const;

type UpdateBody = Record<string, string | number | boolean | null>;

/**
 * Edit sends ONLY what the user changed. Anything untouched (deadlines the form
 * could not show, fields added later by the backend) stays as stored. A cleared
 * deadline is sent as `null`, which the API reads as "remove it".
 */
export function buildCamporeeUpdate(
  initial: CamporeeFormValues,
  values: CamporeeFormValues,
  kind: CamporeeKind,
): UpdateBody {
  const body: UpdateBody = {};
  const changed = (key: keyof CamporeeFormValues) => initial[key] !== values[key];

  if (changed("name")) body.name = values.name.trim();
  if (changed("description")) body.description = values.description.trim();
  if (changed("start_date")) body.start_date = values.start_date;
  if (changed("end_date")) body.end_date = values.end_date;
  for (const field of DEADLINE_FIELDS) {
    if (changed(field)) {
      body[field] = values[field] ? toApiDateTime(values[field]) : null;
    }
  }
  if (changed("place")) {
    body[kind === "union" ? "union_camporee_place" : "local_camporee_place"] =
      values.place.trim();
  }
  if (changed("owner_id")) {
    body[kind === "union" ? "union_id" : "local_field_id"] = Number(values.owner_id);
  }
  if (changed("lat") || changed("long")) {
    const lat = parseCoordinate(values.lat);
    const long = parseCoordinate(values.long);
    // The API takes both or none; a half-cleared pair is rejected by validation.
    if (lat !== null && long !== null) {
      body.lat = lat;
      body.long = long;
    }
  }
  if (changed("registration_cost") && values.registration_cost.trim()) {
    body.registration_cost = Number(values.registration_cost);
  }
  if (changed("includes_adventurers")) body.includes_adventurers = values.includes_adventurers;
  if (changed("includes_pathfinders")) body.includes_pathfinders = values.includes_pathfinders;
  if (changed("includes_master_guides")) body.includes_master_guides = values.includes_master_guides;
  return body;
}

export function isFormDirty(
  initial: CamporeeFormValues,
  values: CamporeeFormValues,
): boolean {
  return (Object.keys(initial) as (keyof CamporeeFormValues)[]).some(
    (key) => initial[key] !== values[key],
  );
}
