"use client";

import { ClubSectionsPanel } from "@/components/clubs/club-sections-panel";
import { SectionHistoryPanel } from "@/components/clubs/detail/section-history";

interface ClubSectionsTabProps {
  clubId: number;
  rawSections: Array<{
    club_section_id?: number;
    club_type_id?: number;
    club_type?: { name?: string } | null;
    name?: string;
    active?: boolean;
    souls_target?: number | null;
    fee?: number | null;
    meeting_day?: Array<{ day?: string }>;
    meeting_time?: Array<{ time?: string }>;
    members_count?: number;
  }>;
  clubTypeOptions: Array<{ club_type_id: number; name: string }>;
  onAssignResponsible: () => void;
  onSectionSelect: (sectionId: number | null) => void;
}

export function ClubSectionsTab({
  clubId,
  rawSections,
  clubTypeOptions,
  onAssignResponsible,
  onSectionSelect,
}: ClubSectionsTabProps) {
  return (
    <div className="space-y-4">
      <ClubSectionsPanel
        clubId={clubId}
        sections={rawSections}
        clubTypes={clubTypeOptions}
        onAssignResponsible={onAssignResponsible}
        onSectionSelect={onSectionSelect}
      />
      <SectionHistoryPanel clubId={clubId} />
    </div>
  );
}
