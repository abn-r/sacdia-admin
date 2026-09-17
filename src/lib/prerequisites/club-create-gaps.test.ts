import { describe, expect, it } from "vitest";

import { findClubCreateGaps } from "@/lib/prerequisites/club-create-gaps";

const localFields = [{ label: "Norte", value: 10 }];
const districts = [{ label: "Centro", value: 20, localFieldId: 10 }];
const churches = [{ label: "Central", value: 30, districtId: 20 }];
const clubTypes = [{ label: "Conquistadores", value: 1 }];

describe("findClubCreateGaps", () => {
  it("reports missing local fields before asking for districts", () => {
    expect(
      findClubCreateGaps({
        localFields: [],
        districts,
        churches,
        clubTypes,
        selectedLocalFieldId: null,
        selectedDistrictId: null,
      }),
    ).toEqual([{ id: "local-fields", screenId: "catalogs-local-fields" }]);
  });

  it("reports missing club types even when geography is ready", () => {
    expect(
      findClubCreateGaps({
        localFields,
        districts,
        churches,
        clubTypes: [],
        selectedLocalFieldId: 10,
        selectedDistrictId: 20,
      }),
    ).toEqual([{ id: "club-types", screenId: "catalogs-club-types" }]);
  });

  it("reports districts only after a field is chosen", () => {
    expect(
      findClubCreateGaps({
        localFields,
        districts: [],
        churches: [],
        clubTypes,
        selectedLocalFieldId: null,
        selectedDistrictId: null,
      }),
    ).toEqual([]);

    expect(
      findClubCreateGaps({
        localFields,
        districts: [],
        churches: [],
        clubTypes,
        selectedLocalFieldId: 10,
        selectedDistrictId: null,
      }),
    ).toEqual([
      {
        id: "districts",
        screenId: "catalogs-districts",
        contextName: "Norte",
      },
    ]);
  });

  it("reports churches only after a district is chosen", () => {
    expect(
      findClubCreateGaps({
        localFields,
        districts,
        churches: [],
        clubTypes,
        selectedLocalFieldId: 10,
        selectedDistrictId: null,
      }),
    ).toEqual([]);

    expect(
      findClubCreateGaps({
        localFields,
        districts,
        churches: [],
        clubTypes,
        selectedLocalFieldId: 10,
        selectedDistrictId: 20,
      }),
    ).toEqual([
      {
        id: "churches",
        screenId: "catalogs-churches",
        contextName: "Centro",
      },
    ]);
  });
});
