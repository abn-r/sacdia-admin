import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  buildCoordinatorAssignmentPayload,
  extractCoordinationConflictReason,
} from "@/lib/api/coordination";

describe("buildCoordinatorAssignmentPayload", () => {
  it("sends only local-field fields for GENERAL", () => {
    expect(
      buildCoordinatorAssignmentPayload({
        userId: "11111111-1111-1111-1111-111111111111",
        assignmentType: "GENERAL",
        zoneId: 4,
        clubTypeId: 2,
        clubSectionId: 9,
      }),
    ).toEqual({
      user_id: "11111111-1111-1111-1111-111111111111",
      assignment_type: "GENERAL",
    });
  });

  it("requires zone and club type for ZONE", () => {
    expect(
      buildCoordinatorAssignmentPayload({
        userId: "11111111-1111-1111-1111-111111111111",
        assignmentType: "ZONE",
        zoneId: 4,
        clubTypeId: 2,
      }),
    ).toEqual({
      user_id: "11111111-1111-1111-1111-111111111111",
      assignment_type: "ZONE",
      zone_id: 4,
      club_type_id: 2,
    });
  });

  it("requires club section for SECTION", () => {
    expect(
      buildCoordinatorAssignmentPayload({
        userId: "11111111-1111-1111-1111-111111111111",
        assignmentType: "SECTION",
        clubSectionId: 99,
      }),
    ).toEqual({
      user_id: "11111111-1111-1111-1111-111111111111",
      assignment_type: "SECTION",
      club_section_id: 99,
    });
  });
});

describe("extractCoordinationConflictReason", () => {
  it("reads reason from namedArgs", () => {
    const error = new ApiError("conflict", 409, {
      namedArgs: { reason: "director_coordinator_same_section_conflict" },
    });
    expect(extractCoordinationConflictReason(error)).toBe(
      "director_coordinator_same_section_conflict",
    );
  });

  it("returns null for unrelated errors", () => {
    expect(extractCoordinationConflictReason(new Error("boom"))).toBeNull();
  });
});
