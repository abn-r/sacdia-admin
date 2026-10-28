import { describe, expect, it } from "vitest";
import { buildSchema } from "./activity-form-dialog";

const t = ((key: string) => key) as unknown as Parameters<typeof buildSchema>[0];

const valid = {
  name: "Campamento",
  activity_type_id: 1,
  club_type_id: 1,
  club_section_id: 1,
  lat: 19.17,
  long: -96.13,
  activity_place: "Iglesia central",
  activity_date: "2026-11-05",
};

function dateError(values: Record<string, unknown>) {
  const result = buildSchema(t).safeParse(values);
  if (result.success) return null;
  return result.error.issues.find((issue) => issue.path[0] === "activity_date")?.message ?? null;
}

describe("activity form schema: activity_date", () => {
  it("accepts an activity with a date", () => {
    expect(dateError(valid)).toBeNull();
  });

  it("requires the date (empty, as an old activity without date loads)", () => {
    expect(dateError({ ...valid, activity_date: "" })).toBe("activity_date_required");
  });

  it("requires the date when it is missing", () => {
    const rest: Record<string, unknown> = { ...valid };
    delete rest.activity_date;
    expect(dateError(rest)).not.toBeNull();
  });
});
