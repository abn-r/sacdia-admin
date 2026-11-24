import type { FinanceClubSection } from "@/lib/finances/club-sections";

/** A club the actor can reach, with the sections that can be picked. */
export type ClubContextClub = {
  club_id: number;
  name: string;
  /** Local field / district name; used to group the picker. */
  group?: string;
  local_field_id?: number;
  sections: FinanceClubSection[];
};

/** Resolved selection; `sectionId` is null when the module accepts "all sections". */
export type ClubContextSelection = {
  club: ClubContextClub | null;
  section: FinanceClubSection | null;
};
