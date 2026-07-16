"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PendingMembersTable } from "@/components/membership/pending-members-table";
import {
  listMembershipRequestsFromClient,
  type MembershipRequest,
} from "@/lib/api/membership-requests";
import { ApiError } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionOption = {
  club_section_id: number;
  label: string;
};

interface MembershipRequestsClientPageProps {
  sections: SectionOption[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MembershipRequestsClientPage({
  sections,
}: MembershipRequestsClientPageProps) {
  const t = useTranslations("membership");
  const [selectedSectionId, setSelectedSectionId] = useState<number>(
    sections[0]?.club_section_id ?? 0,
  );

  const {
    data: requests = [],
    isFetching: isLoading,
    error: queryError,
  } = useQuery<MembershipRequest[], Error>({
    queryKey: ["membership", "requests", selectedSectionId],
    queryFn: () => listMembershipRequestsFromClient(selectedSectionId),
    enabled: selectedSectionId > 0,
    staleTime: 60_000,
  });

  const loadError = (() => {
    if (!queryError) return null;
    if (
      queryError instanceof ApiError &&
      (queryError.status === 403 || queryError.status === 401)
    ) {
      return t("client.load_error_permission");
    }
    return queryError instanceof ApiError
      ? queryError.message
      : t("client.load_error_generic");
  })();

  return (
    <div className="space-y-4">
      {/* Section selector */}
      <div className="max-w-md space-y-1.5">
        <Label htmlFor="section-select">{t("client.section_label")}</Label>
        <Select
          value={String(selectedSectionId)}
          onValueChange={(value) => setSelectedSectionId(Number(value))}
        >
          <SelectTrigger id="section-select">
            <SelectValue placeholder={t("client.section_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => (
              <SelectItem
                key={section.club_section_id}
                value={String(section.club_section_id)}
              >
                {section.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-md border p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-8 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !loadError && selectedSectionId > 0 && (
        <PendingMembersTable
          key={selectedSectionId}
          clubSectionId={selectedSectionId}
          initialRequests={requests}
        />
      )}
    </div>
  );
}
