import { describe, expect, it } from "vitest";
import {
  VIRTUAL_PLACE,
  buildActivityFormSchema,
  buildCreatePayload,
  buildSeriesPayload,
  buildUpdatePayload,
  defaultActivityFormValues,
  hasRealCoordinates,
  type ActivityFormValues,
} from "./form";

const schema = buildActivityFormSchema((key) => key, { mode: "create" });

function values(overrides: Partial<ActivityFormValues> = {}): ActivityFormValues {
  return {
    ...defaultActivityFormValues({ sectionId: 3, today: "2026-11-24" }),
    name: "Clase de nudos",
    activity_date: "2026-11-29",
    activity_place: "Parque del Lago",
    lat: 19.17,
    long: -96.13,
    ...overrides,
  };
}

function messages(input: ActivityFormValues, s = schema): Record<string, string> {
  const result = s.safeParse(input);
  if (result.success) return {};
  const first: Record<string, string> = {};
  for (const issue of result.error.issues) first[String(issue.path[0])] ??= issue.message;
  return first;
}

describe("hasRealCoordinates", () => {
  it("rejects the (0, 0) an untouched form used to send", () => {
    expect(hasRealCoordinates(0, 0)).toBe(false);
    expect(hasRealCoordinates("0", "0")).toBe(false);
  });

  it("rejects out-of-range and non-numeric values", () => {
    expect(hasRealCoordinates(91, 10)).toBe(false);
    expect(hasRealCoordinates(10, -181)).toBe(false);
    expect(hasRealCoordinates(Number.NaN, 10)).toBe(false);
  });

  it("accepts a real point, including one on a single zero axis", () => {
    expect(hasRealCoordinates(19.17, -96.13)).toBe(true);
    expect(hasRealCoordinates(0, -96.13)).toBe(true);
  });
});

describe("activity form schema", () => {
  it("accepts an in-person activity with a pinned place", () => {
    expect(messages(values())).toEqual({});
  });

  it("asks for the pin and the place when none was picked", () => {
    expect(messages(values({ lat: 0, long: 0 }))).toEqual({ lat: "pinRequired" });
    expect(messages(values({ activity_place: "  " }))).toEqual({ activity_place: "placeRequired" });
  });

  it("does not ask for a place on a virtual activity, but for the link", () => {
    expect(messages(values({ platform: 1, activity_place: "", lat: 0, long: 0 }))).toEqual({ link_meet: "linkRequired" });
    expect(
      messages(values({ platform: 1, activity_place: "", lat: 0, long: 0, link_meet: "https://meet.example.test/abc" })),
    ).toEqual({});
  });

  it("keeps the link optional on hybrid but validates it when present", () => {
    expect(messages(values({ platform: 2 }))).toEqual({});
    expect(messages(values({ platform: 2, link_meet: "no es un enlace" }))).toEqual({ link_meet: "linkInvalid" });
  });

  it("requires a name of 3 characters, a date and, for classes, at least one class", () => {
    expect(messages(values({ name: "" })).name).toBe("nameRequired");
    expect(messages(values({ name: "ab" })).name).toBe("nameTooShort");
    expect(messages(values({ activity_date: "" })).activity_date).toBe("dateRequired");
    expect(messages(values({ audience: "classes", class_ids: [] })).class_ids).toBe("classesRequired");
    expect(messages(values({ audience: "classes", class_ids: [4] }))).toEqual({});
  });

  it("rejects an end date before the start, but not when repeating", () => {
    expect(messages(values({ activity_end_date: "2026-11-28" })).activity_end_date).toBe("endBeforeStart");
    expect(messages(values({ activity_end_date: "2026-11-30" }))).toEqual({});
  });

  it("needs a closing date for a repeating activity, not before the first session", () => {
    expect(messages(values({ repeat: true, until: "" })).until).toBe("untilRequired");
    expect(messages(values({ repeat: true, until: "2026-11-01" })).until).toBe("untilBeforeStart");
    expect(messages(values({ repeat: true, until: "2026-12-20" }))).toEqual({});
  });

  it("does not ask edit mode for audience or repeat rules", () => {
    const edit = buildActivityFormSchema((key) => key, { mode: "edit" });
    expect(messages(values({ audience: "classes", class_ids: [], repeat: true, until: "" }), edit)).toEqual({});
  });
});

describe("payloads", () => {
  it("sends the picked place and pin for an in-person activity", () => {
    const payload = buildCreatePayload(values({ description: "  " }), 2);
    expect(payload).toMatchObject({
      name: "Clase de nudos",
      club_type_id: 2,
      club_section_id: 3,
      activity_place: "Parque del Lago",
      lat: 19.17,
      long: -96.13,
      platform: 0,
      audience: "all",
    });
    expect(payload.description).toBeUndefined();
    expect(payload.link_meet).toBeUndefined();
  });

  it("swaps place and pin for the link on a virtual activity", () => {
    const payload = buildCreatePayload(
      values({ platform: 1, activity_place: "", lat: 0, long: 0, link_meet: " https://meet.example.test/abc " }),
      2,
    );
    expect(payload).toMatchObject({
      activity_place: VIRTUAL_PLACE,
      lat: 0,
      long: 0,
      link_meet: "https://meet.example.test/abc",
    });
  });

  it("sends classes only for a class audience", () => {
    expect(buildCreatePayload(values({ audience: "classes", class_ids: [4, 5] }), 2)).toMatchObject({
      audience: "classes",
      classes: [4, 5],
    });
    expect(buildCreatePayload(values({ audience: "board" }), 2).classes).toBeUndefined();
  });

  it("builds the series recurrence without an end date", () => {
    const payload = buildSeriesPayload(
      values({ repeat: true, repeat_kind: "weekly", weekday: 7, until: "2026-12-20", activity_end_date: "2026-11-30" }),
      2,
    );
    expect(payload.recurrence).toEqual({ kind: "weekly", interval_days: undefined, weekdays: [7], until: "2026-12-20" });
    expect("activity_end_date" in payload).toBe(false);
  });

  it("clears the link when an edited activity becomes in person", () => {
    expect(buildUpdatePayload(values({ platform: 0, link_meet: "https://x.test" })).link_meet).toBe("");
  });
});

describe("defaults", () => {
  it("starts a new activity today in the chosen section", () => {
    const defaults = defaultActivityFormValues({ sectionId: 3, today: "2026-11-24" });
    expect(defaults).toMatchObject({ club_section_id: 3, activity_date: "2026-11-24", platform: 0, lat: 0, long: 0 });
  });

  it("loads an edited activity without a fake (0, 0) pin or the virtual placeholder", () => {
    const base = {
      activity_id: 9,
      name: "Reunión",
      club_id: 1,
      club_type_id: 2,
      club_section_id: 3,
      activity_type_id: 1,
      active: true,
    };
    const virtual = defaultActivityFormValues({
      sectionId: 3,
      today: "2026-11-24",
      activity: { ...base, lat: 0, long: 0, activity_place: VIRTUAL_PLACE, platform: 1, link_meet: "https://x.test" },
    });
    expect(virtual).toMatchObject({ activity_place: "", lat: 0, long: 0, link_meet: "https://x.test" });
  });
});
