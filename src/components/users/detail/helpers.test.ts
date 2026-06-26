import { describe, expect, it, vi } from "vitest";
import {
  extractAssignmentLocation,
  extractAllAssignments,
  extractEmergencyContacts,
  extractPrimaryAssignment,
  formatBaptismDisplay,
} from "./helpers";

describe("formatBaptismDisplay()", () => {
  const labels = {
    yes: "Sí",
    no: "No",
    yesWithDate: (date: string) => `Sí, el ${date}`,
  };

  it("formats baptized users with a date through the translated date placeholder", () => {
    expect(formatBaptismDisplay(true, "2026-06-18T12:00:00.000Z", labels, "es-MX")).toBe(
      "Sí, el 18 de junio de 2026",
    );
  });

  it("uses the plain yes label when baptized users do not have a baptism date", () => {
    const yesWithDate = vi.fn((date: string) => `Sí, el ${date}`);

    expect(
      formatBaptismDisplay(
        true,
        null,
        {
          ...labels,
          yesWithDate,
        },
        "es-MX",
      ),
    ).toBe("Sí");
    expect(yesWithDate).not.toHaveBeenCalled();
  });

  it("formats false and unknown baptism values safely", () => {
    expect(formatBaptismDisplay(false, "2026-06-18", labels, "es-MX")).toBe(
      "No",
    );
    expect(formatBaptismDisplay(null, null, labels, "es-MX")).toBe("—");
  });
});

describe("club assignment helpers", () => {
  const assignments = [
    {
      assignment_id: "assignment-director",
      role_name: "director",
      club_name: "ACV",
      section_name: "Conquistadores",
      district_name: "Distrito Veracruz Centro",
      church_name: "Iglesia Central",
      club: {
        type: "pathfinders",
        instance_id: 12,
        club: {
          club_id: 7,
          name: "ACV",
        },
      },
    },
  ];

  it("extracts backend club assignment labels without leaving blank table rows", () => {
    expect(extractAllAssignments(assignments, (role) => role ?? "")).toEqual([
      {
        id: "assignment-director",
        clubName: "ACV",
        sectionName: "Conquistadores",
        roleName: "director",
      },
    ]);
  });

  it("extracts the primary assignment from the backend detail shape", () => {
    expect(extractPrimaryAssignment(assignments, (role) => role ?? "")).toEqual({
      clubName: "ACV",
      sectionName: "Conquistadores",
      roleName: "director",
    });
  });

  it("extracts district and church names from the assigned club context", () => {
    expect(extractAssignmentLocation(assignments)).toEqual({
      districtName: "Distrito Veracruz Centro",
      churchName: "Iglesia Central",
    });
  });
});

describe("extractEmergencyContacts()", () => {
  it("uses relationship type names instead of exposing internal ids", () => {
    expect(
      extractEmergencyContacts([
        {
          emergency_id: 1,
          name: "Ivette Zúñiga",
          phone: "2299280198",
          primary: true,
          relationship_type_id: "eedc51e0-1c5b-4d2e-99e0-1ed2a737450a",
          relationship_types: {
            name: "Madre",
          },
        },
      ]),
    ).toEqual([
      {
        id: "1",
        name: "Ivette Zúñiga",
        phone: "2299280198",
        relationship: "Madre",
        primary: true,
      },
    ]);
  });
});
