import { describe, expect, it } from "vitest";
import {
  extractCamporeeRecord,
  extractPagedList,
  normalizeCamporee,
} from "./normalize";

const localRaw = {
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
  local_fields: { local_field_id: 4, name: "Asociación Valle Alto", abbreviation: "AVA" },
  orders_enabled: true,
  orders_opens_at: "2027-01-01T00:00:00.000Z",
  orders_deadline: "2027-01-25T00:00:00.000Z",
};

describe("normalizeCamporee", () => {
  it("keeps the deadlines, agenda date and order settings (edit must not wipe them)", () => {
    const camporee = normalizeCamporee(localRaw, "local");
    expect(camporee.club_registration_deadline).toBe("2027-01-20T23:59:00.000Z");
    expect(camporee.member_registration_deadline).toBe("2027-01-31T23:59:00.000Z");
    expect(camporee.payment_deadline).toBe("2027-02-05T23:59:00.000Z");
    expect(camporee.agenda_visible_from).toBe("2027-02-01T08:00:00.000Z");
    expect(camporee.orders_enabled).toBe(true);
    expect(camporee.orders_deadline).toBe("2027-01-25T00:00:00.000Z");
    expect(camporee.local_field_id).toBe(4);
    expect(camporee.local_field?.name).toBe("Asociación Valle Alto");
  });

  it("reads the union flavour of the place and owner", () => {
    const camporee = normalizeCamporee(
      {
        union_camporee_id: 3,
        name: "Camporee de Unión",
        start_date: "2027-04-17",
        end_date: "2027-04-18",
        union_camporee_place: "Parque del Lago",
        unions: { union_id: 9, name: "Unión Norte" },
      },
      "union",
    );
    expect(camporee.camporee_id).toBe(3);
    expect(camporee.kind).toBe("union");
    expect(camporee.union_id).toBe(9);
    expect(camporee.union_name).toBe("Unión Norte");
    expect(camporee.local_camporee_place).toBe("Parque del Lago");
  });

  it("defaults section flags like the API (pathfinders on)", () => {
    const camporee = normalizeCamporee({ name: "X" }, "local");
    expect(camporee.includes_pathfinders).toBe(true);
    expect(camporee.includes_adventurers).toBe(false);
  });
});

describe("extractCamporeeRecord", () => {
  it("unwraps data envelopes", () => {
    expect(extractCamporeeRecord({ data: localRaw }, "local")?.name).toBe(
      "Camporee Valle Alto 2027",
    );
    expect(extractCamporeeRecord({ data: { data: localRaw } }, "local")).toBe(localRaw);
    expect(extractCamporeeRecord(null, "local")).toBeNull();
  });
});

describe("extractPagedList", () => {
  it("returns rows with the meta of the server", () => {
    const paged = extractPagedList<{ id: number }>({
      data: [{ id: 1 }],
      meta: { total: 41, page: 2, limit: 20, totalPages: 3 },
    });
    expect(paged).toMatchObject({ total: 41, page: 2, limit: 20, totalPages: 3 });
    expect(paged.rows).toHaveLength(1);
  });

  it("falls back to the row count for a bare array", () => {
    const paged = extractPagedList<number>([1, 2, 3]);
    expect(paged.total).toBe(3);
    expect(paged.page).toBe(1);
  });
});
