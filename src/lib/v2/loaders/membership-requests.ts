import { ApiError, apiRequest } from "@/lib/api/client";

export type MembershipSectionOption = {
  club_section_id: number;
  label: string;
};

export type MembershipRequestsListResult = {
  sections: MembershipSectionOption[];
  available: boolean;
  error: { message: string; status: number | null } | null;
};

type ClubSection = {
  club_section_id: number;
  club_type_id: number;
  club_type?: { name?: string } | null;
  name: string;
  active: boolean;
  club?: { club_id?: number; name?: string } | null;
};

type Club = {
  club_id?: number;
  id?: number;
  name?: string;
  sections?: ClubSection[];
};

function extractClubs(payload: unknown): Club[] {
  if (Array.isArray(payload)) return payload as Club[];
  if (payload && typeof payload === "object") {
    const res = payload as { data?: unknown };
    if (Array.isArray(res.data)) return res.data as Club[];
  }
  return [];
}

export async function loadMembershipRequestsList(): Promise<MembershipRequestsListResult> {
  try {
    const payload = await apiRequest<unknown>("/clubs");
    const clubs = extractClubs(payload);
    const sections: MembershipSectionOption[] = [];

    for (const club of clubs) {
      const clubName = club.name ?? "Club";
      for (const section of club.sections ?? []) {
        if (section.active && section.club_section_id) {
          const typeName = section.club_type?.name ?? section.name ?? "Sección";
          sections.push({
            club_section_id: section.club_section_id,
            label: `${clubName} — ${typeName}`,
          });
        }
      }
    }

    return { sections, available: true, error: null };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        sections: [],
        available: false,
        error: { message: error.message, status: error.status },
      };
    }

    return {
      sections: [],
      available: false,
      error: { message: "", status: null },
    };
  }
}
