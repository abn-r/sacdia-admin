import { z } from "zod";
import type {
  Activity,
  CreateActivityPayload,
  CreateActivitySeriesPayload,
  UpdateActivityPayload,
} from "@/lib/api/activities";
import { isEmptyOrHttpUrl, optionalText } from "@/lib/activities/helpers";

export const PLATFORM_IN_PERSON = 0;
export const PLATFORM_VIRTUAL = 1;
export const PLATFORM_HYBRID = 2;

/** The backend requires a place; a virtual activity stores this word (identical in every panel language). */
export const VIRTUAL_PLACE = "Virtual";

const NAME_MIN_LENGTH = 3;

/** Keys of `people.activities.validation.*` the schema can report. */
export type ActivityValidationKey =
  | "nameRequired"
  | "nameTooShort"
  | "typeRequired"
  | "sectionRequired"
  | "classesRequired"
  | "imageInvalid"
  | "dateRequired"
  | "endBeforeStart"
  | "untilRequired"
  | "untilBeforeStart"
  | "linkRequired"
  | "linkInvalid"
  | "placeRequired"
  | "pinRequired";

export type ActivityValidationMessages = (key: ActivityValidationKey) => string;

/**
 * A pin is real when it is inside the valid ranges and not the (0, 0) point
 * that an untouched form used to submit.
 */
export function hasRealCoordinates(lat: unknown, long: unknown): boolean {
  const latitude = typeof lat === "number" ? lat : Number(lat);
  const longitude = typeof long === "number" ? long : Number(long);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return false;
  return !(latitude === 0 && longitude === 0);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const PLATFORM_VALUES = [PLATFORM_IN_PERSON, PLATFORM_VIRTUAL, PLATFORM_HYBRID] as const;

/** Fields that belong to each step, for "Continuar" and for sending server errors back. */
export const ACTIVITY_STEP_FIELDS = [
  ["name", "description", "activity_type_id", "club_section_id", "audience", "class_ids", "image"],
  ["activity_date", "activity_time", "activity_end_date", "until", "platform", "link_meet", "activity_place", "lat", "long"],
] as const;

export function buildActivityFormSchema(msg: ActivityValidationMessages, options: { mode: "create" | "edit" }) {
  const isCreate = options.mode === "create";
  return z
    .object({
      name: z.string().trim().min(1, msg("nameRequired")).min(NAME_MIN_LENGTH, msg("nameTooShort")),
      description: z.string().optional(),
      activity_type_id: z.number().int().min(1, msg("typeRequired")),
      club_section_id: z.number().int().min(1, msg("sectionRequired")),
      audience: z.enum(["all", "board", "classes"]),
      class_ids: z.array(z.number().int()),
      image: z.string().optional().refine(isEmptyOrHttpUrl, msg("imageInvalid")),
      activity_date: z.string().min(1, msg("dateRequired")),
      activity_time: z.string().optional(),
      activity_end_date: z.string().optional(),
      repeat: z.boolean(),
      repeat_kind: z.enum(["weekly", "interval"]),
      weekday: z.number().int().min(1).max(7),
      interval_days: z.number().int().min(1).max(365),
      until: z.string().optional(),
      platform: z.number().int().min(0).max(2),
      link_meet: z.string().optional(),
      activity_place: z.string().optional(),
      lat: z.number(),
      long: z.number(),
    })
    .superRefine((values, ctx) => {
      const fail = (path: string, key: ActivityValidationKey) =>
        ctx.addIssue({ code: "custom", path: [path], message: msg(key) });

      if (isCreate && values.audience === "classes" && values.class_ids.length === 0) {
        fail("class_ids", "classesRequired");
      }

      const virtual = values.platform === PLATFORM_VIRTUAL;
      const link = values.link_meet?.trim() ?? "";
      if (virtual && link === "") fail("link_meet", "linkRequired");
      else if (link !== "" && !isHttpUrl(link)) fail("link_meet", "linkInvalid");

      if (!virtual) {
        if (!values.activity_place?.trim()) fail("activity_place", "placeRequired");
        // The place is picked on the map; typed or default (0, 0) coordinates are not a place.
        if (!hasRealCoordinates(values.lat, values.long)) fail("lat", "pinRequired");
      }

      if (values.activity_date && values.activity_end_date && values.activity_end_date < values.activity_date && !values.repeat) {
        fail("activity_end_date", "endBeforeStart");
      }

      if (isCreate && values.repeat) {
        if (!values.until) fail("until", "untilRequired");
        else if (values.activity_date && values.until < values.activity_date) fail("until", "untilBeforeStart");
      }
    });
}

export type ActivityFormValues = z.infer<ReturnType<typeof buildActivityFormSchema>>;

export function defaultActivityFormValues(args: {
  sectionId: number;
  today: string;
  activity?: Activity | null;
}): ActivityFormValues {
  const { activity } = args;
  if (activity) {
    const virtual = activity.platform === PLATFORM_VIRTUAL;
    const pinned = hasRealCoordinates(activity.lat, activity.long);
    return {
      name: activity.name,
      description: activity.description ?? "",
      activity_type_id: activity.activity_type_id || 1,
      club_section_id: activity.club_section_id,
      audience: activity.audience ?? "all",
      class_ids: [],
      image: activity.image ?? "",
      activity_date: activity.activity_date ?? "",
      activity_time: activity.activity_time ?? "09:00",
      activity_end_date: activity.activity_end_date ?? "",
      repeat: false,
      repeat_kind: "weekly",
      weekday: 7,
      interval_days: 7,
      until: "",
      platform: activity.platform ?? PLATFORM_IN_PERSON,
      link_meet: activity.link_meet ?? "",
      activity_place: virtual ? "" : activity.activity_place,
      lat: pinned ? activity.lat : 0,
      long: pinned ? activity.long : 0,
    };
  }
  return {
    name: "",
    description: "",
    activity_type_id: 1,
    club_section_id: args.sectionId,
    audience: "all",
    class_ids: [],
    image: "",
    activity_date: args.today,
    activity_time: "09:00",
    activity_end_date: "",
    repeat: false,
    repeat_kind: "weekly",
    weekday: 7,
    interval_days: 7,
    until: "",
    platform: PLATFORM_IN_PERSON,
    link_meet: "",
    activity_place: "",
    lat: 0,
    long: 0,
  };
}

function placeFields(values: ActivityFormValues): { activity_place: string; lat: number; long: number } {
  if (values.platform === PLATFORM_VIRTUAL) return { activity_place: VIRTUAL_PLACE, lat: 0, long: 0 };
  return { activity_place: values.activity_place?.trim() ?? "", lat: values.lat, long: values.long };
}

function audienceFields(values: ActivityFormValues) {
  return values.audience === "classes"
    ? { audience: "classes" as const, classes: values.class_ids }
    : { audience: values.audience };
}

/** Body of `POST /clubs/:id/activities`. */
export function buildCreatePayload(values: ActivityFormValues, clubTypeId: number): CreateActivityPayload {
  return {
    name: values.name.trim(),
    description: optionalText(values.description),
    activity_type_id: values.activity_type_id,
    club_type_id: clubTypeId,
    club_section_id: values.club_section_id,
    activity_time: values.activity_time || undefined,
    activity_date: values.activity_date,
    activity_end_date: values.activity_end_date || undefined,
    image: optionalText(values.image),
    platform: values.platform,
    link_meet: values.platform === PLATFORM_IN_PERSON ? undefined : optionalText(values.link_meet),
    ...placeFields(values),
    ...audienceFields(values),
  };
}

/** Body of `POST /clubs/:id/activity-series`. */
export function buildSeriesPayload(values: ActivityFormValues, clubTypeId: number): CreateActivitySeriesPayload {
  const { activity_end_date: _endDate, ...base } = buildCreatePayload(values, clubTypeId);
  void _endDate;
  return {
    ...base,
    activity_date: values.activity_date,
    recurrence: {
      kind: values.repeat_kind,
      interval_days: values.repeat_kind === "interval" ? values.interval_days : undefined,
      weekdays: values.repeat_kind === "weekly" ? [values.weekday] : undefined,
      until: values.until || undefined,
    },
  };
}

/** Body of `PATCH /activities/:id` (section and audience are not editable). */
export function buildUpdatePayload(values: ActivityFormValues): UpdateActivityPayload {
  return {
    name: values.name.trim(),
    description: values.description ?? "",
    activity_type_id: values.activity_type_id,
    activity_time: values.activity_time || undefined,
    activity_date: values.activity_date,
    activity_end_date: values.activity_end_date || undefined,
    image: optionalText(values.image),
    platform: values.platform,
    link_meet: values.platform === PLATFORM_IN_PERSON ? "" : (values.link_meet?.trim() ?? ""),
    ...placeFields(values),
  };
}
