import type { ClubDetailPayload, SectionMembersGroup } from "@/lib/clubs/types";

/** Fictitious club used by the club detail tests. */
export const CONQUISTADORES_ID = 11;
export const AVENTUREROS_ID = 12;

const conquistadores: SectionMembersGroup = {
  sectionId: CONQUISTADORES_ID,
  sectionName: "Conquistadores",
  clubTypeId: 2,
  clubTypeName: "Conquistadores",
  fee: 20,
  soulsTarget: 2,
  active: true,
  members: [
    { user_id: "u-mateo", name: "Mateo Herrera", role: "director", assignment_id: "as-1", current_class_name: "Guía Mayor" },
    { user_id: "u-paola", name: "Paola Núñez", role: "secretary", assignment_id: "as-2" },
    { user_id: "u-iker", name: "Iker Montes", role: "member", current_class_name: "Amigo" },
    { user_id: "u-valeria", name: "Valeria Ortiz", role: "member", current_class_name: "Compañero" },
    { user_id: "u-valeria", name: "Valeria Ortiz", role: "counselor", assignment_id: "as-3" },
  ],
};

const aventureros: SectionMembersGroup = {
  sectionId: AVENTUREROS_ID,
  sectionName: "Aventureros",
  clubTypeId: 1,
  clubTypeName: "Aventureros",
  fee: 15,
  soulsTarget: 1,
  active: true,
  members: [
    { user_id: "u-lucia", name: "Lucía Gómez", role: "director", assignment_id: "as-4" },
    { user_id: "u-tomas", name: "Tomás Vega", role: "member", current_class_name: "Abeja Laboriosa" },
  ],
};

export function buildClubDetail(overrides: Partial<ClubDetailPayload> = {}): ClubDetailPayload {
  return {
    club: { club_id: 7, name: "Club Orión", active: true, description: "Club fundado en 2008." },
    clubId: 7,
    clubTypes: [
      { club_type_id: 1, name: "Aventureros" },
      { club_type_id: 2, name: "Conquistadores" },
    ],
    sections: [
      { club_section_id: CONQUISTADORES_ID, club_type_id: 2, active: true },
      { club_section_id: AVENTUREROS_ID, club_type_id: 1, active: true },
    ],
    sectionMemberGroups: [conquistadores, aventureros],
    leadership: { director: null, deputies: [], secretaries: [], others: [] },
    clubRoles: [
      { role_id: "r-dir", name: "director" },
      { role_id: "r-dep", name: "deputy-director" },
      { role_id: "r-sec", name: "secretary" },
      { role_id: "r-tre", name: "treasurer" },
      { role_id: "r-sectre", name: "secretary-treasurer" },
    ],
    currentYearId: 11,
    canManageRoles: true,
    canCreateSections: true,
    canDesignateNextDirector: true,
    canSucceedDirector: true,
    canEnrollAnnualContinuations: true,
    nextYearId: 12,
    designationsBySectionId: {},
    ...overrides,
  };
}

/** jsdom lacks the pointer-capture and scroll APIs Radix Select relies on. */
export function installRadixPolyfills() {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => undefined;
  proto.releasePointerCapture ??= () => undefined;
  proto.scrollIntoView ??= () => undefined;
}
