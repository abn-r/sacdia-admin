import { describe, expect, it } from "vitest";
import { buildAdminReportsParams } from "./monthly-reports";

describe("buildAdminReportsParams", () => {
  it("maps hierarchy filters to the monthly reports admin query contract", () => {
    expect(
      buildAdminReportsParams({
        divisionId: 1,
        unionId: 2,
        localFieldId: 3,
        clubTypeId: 4,
      }),
    ).toEqual({
      division_id: 1,
      union_id: 2,
      local_field_id: 3,
      club_type_id: 4,
    });
  });
});
