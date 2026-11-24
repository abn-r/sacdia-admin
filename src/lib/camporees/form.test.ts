import { describe, expect, it } from "vitest";
import {
  buildCamporeeUpdate,
  buildLocalCreatePayload,
  buildUnionCreatePayload,
  emptyFormValues,
  formValuesFromCamporee,
  isFormDirty,
  validateCamporeeForm,
} from "./form";
import { normalizeCamporee } from "./normalize";

const stored = normalizeCamporee(
  {
    local_camporee_id: 12,
    name: "Camporee Valle Alto 2027",
    start_date: "2027-02-10T00:00:00.000Z",
    end_date: "2027-02-12T00:00:00.000Z",
    club_registration_deadline: "2027-01-20T23:59:00.000Z",
    member_registration_deadline: "2027-01-31T23:59:00.000Z",
    payment_deadline: "2027-02-05T23:59:00.000Z",
    agenda_visible_from: "2027-02-01T08:00:00.000Z",
    local_camporee_place: "Rancho El Encino",
    local_field_id: 4,
    lat: 19.4,
    long: -99.1,
    registration_cost: 450,
  },
  "local",
);

describe("buildCamporeeUpdate", () => {
  it("sends nothing when nothing changed, so every plazo is preserved", () => {
    const initial = formValuesFromCamporee(stored);
    expect(buildCamporeeUpdate(initial, { ...initial }, "local")).toEqual({});
  });

  it("sends only the changed field and never touches the deadlines", () => {
    const initial = formValuesFromCamporee(stored);
    const body = buildCamporeeUpdate(initial, { ...initial, name: "Camporee 2027" }, "local");
    expect(body).toEqual({ name: "Camporee 2027" });
    expect(body).not.toHaveProperty("payment_deadline");
    expect(body).not.toHaveProperty("agenda_visible_from");
  });

  it("sends null when the user clears a deadline on purpose", () => {
    const initial = formValuesFromCamporee(stored);
    const body = buildCamporeeUpdate(initial, { ...initial, payment_deadline: "" }, "local");
    expect(body).toEqual({ payment_deadline: null });
  });

  it("sends a changed deadline as an ISO timestamp", () => {
    const initial = formValuesFromCamporee(stored);
    const body = buildCamporeeUpdate(
      initial,
      { ...initial, club_registration_deadline: "2027-01-22T10:00" },
      "local",
    );
    expect(typeof body.club_registration_deadline).toBe("string");
    expect(String(body.club_registration_deadline)).toMatch(/Z$/);
  });

  it("uses the union field names for a union camporee", () => {
    const initial = emptyFormValues(2);
    const body = buildCamporeeUpdate(
      initial,
      { ...initial, place: "Parque del Lago", owner_id: "9" },
      "union",
    );
    expect(body).toEqual({ union_camporee_place: "Parque del Lago", union_id: 9 });
  });

  it("sends coordinates only as a pair", () => {
    const initial = formValuesFromCamporee(stored);
    expect(
      buildCamporeeUpdate(initial, { ...initial, lat: "20.5", long: "-100.2" }, "local"),
    ).toEqual({ lat: 20.5, long: -100.2 });
    expect(buildCamporeeUpdate(initial, { ...initial, lat: "" }, "local")).toEqual({});
  });
});

describe("validateCamporeeForm", () => {
  const valid = {
    ...emptyFormValues(4),
    name: "Camporee",
    start_date: "2027-02-10",
    end_date: "2027-02-12",
    place: "Rancho El Encino",
  };

  it("accepts a complete form", () => {
    expect(validateCamporeeForm(valid, "local")).toEqual({});
  });

  it("flags the required fields", () => {
    const errors = validateCamporeeForm(emptyFormValues(), "local");
    expect(errors).toMatchObject({
      name: "name_required",
      start_date: "start_date_required",
      end_date: "end_date_required",
      place: "place_required",
      owner_id: "local_field_required",
    });
  });

  it("asks for the union on a union camporee", () => {
    expect(validateCamporeeForm({ ...valid, owner_id: "" }, "union").owner_id).toBe(
      "union_required",
    );
  });

  it("rejects an end before the start and half a coordinate pair", () => {
    const errors = validateCamporeeForm(
      { ...valid, start_date: "2027-02-12", end_date: "2027-02-10", lat: "19.4" },
      "local",
    );
    expect(errors.end_date).toBe("end_date_after_start_full");
    expect(errors.long).toBe("coordinates_pair_required");
  });

  it("rejects out-of-range coordinates", () => {
    expect(
      validateCamporeeForm({ ...valid, lat: "120", long: "10" }, "local").lat,
    ).toBe("coordinates_invalid");
  });
});

describe("create payloads", () => {
  it("builds the local payload with the owner and place", () => {
    const payload = buildLocalCreatePayload({
      ...emptyFormValues(4),
      name: " Camporee ",
      start_date: "2027-02-10",
      end_date: "2027-02-12",
      place: "Rancho",
      registration_cost: "450",
    });
    expect(payload).toMatchObject({
      name: "Camporee",
      local_field_id: 4,
      local_camporee_place: "Rancho",
      registration_cost: 450,
      includes_pathfinders: true,
    });
  });

  it("builds the union payload", () => {
    const payload = buildUnionCreatePayload({
      ...emptyFormValues(9),
      name: "Unión",
      start_date: "2027-04-17",
      end_date: "2027-04-18",
      place: "Parque",
    });
    expect(payload).toMatchObject({ union_id: 9, union_camporee_place: "Parque" });
  });
});

describe("isFormDirty", () => {
  it("detects a change", () => {
    const initial = emptyFormValues();
    expect(isFormDirty(initial, initial)).toBe(false);
    expect(isFormDirty(initial, { ...initial, name: "x" })).toBe(true);
  });
});
