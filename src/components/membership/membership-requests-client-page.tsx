"use client";

import { useState } from "react";
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
import { CoordinatorConsentQueue } from "@/components/membership/coordinator-consent-queue";
import { PendingMembersTable } from "@/components/membership/pending-members-table";
import {
  getConsentErrorCode,
  listMembershipRequestsFromClient,
  type MembershipRequest,
} from "@/lib/api/membership-requests";
import { ApiError } from "@/lib/api/client";
import type { MembershipReviewMode } from "@/lib/auth/membership-review-mode";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionOption = {
  club_section_id: number;
  label: string;
  /** Review mode for this section; falls back to the page `mode`. */
  mode?: MembershipReviewMode;
};

interface MembershipRequestsClientPageProps {
  sections: SectionOption[];
  /**
   * Default mode for sections that do not carry their own. `verify-only` for
   * consent:verify reviewers without club_members:approve.
   */
  mode?: MembershipReviewMode;
  /**
   * The coordination scope says the viewer is a coordinator: offer "all my
   * sections" (one aggregate queue of consent forms) as the default view, next
   * to the per-section picker.
   */
  coordinatorQueue?: boolean;
}

const ALL_SECTIONS = "all";

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * One section at a time: the list is fetched lazily when a section is picked
 * (react-query, 60 s stale), never for every covered section at once. The
 * endpoint is not paginated; a section's list is bounded by its pending
 * requests (verify-only: just the minors with a pending form).
 *
 * With `coordinatorQueue` the default view is "all my sections": the aggregate
 * consent queue (paginated by offset). Its section summary does NOT filter the
 * loaded page client-side (that would hide forms on other pages); a chip
 * switches the picker to that section's own list instead.
 */

export function MembershipRequestsClientPage({
  sections,
  mode = "approve",
  coordinatorQueue = false,
}: MembershipRequestsClientPageProps) {
  const t = useTranslations("membership");
  const tQueue = useTranslations("membership.queue");
  const [view, setView] = useState<number | typeof ALL_SECTIONS>(
    coordinatorQueue ? ALL_SECTIONS : (sections[0]?.club_section_id ?? 0),
  );
  const showQueue = coordinatorQueue && view === ALL_SECTIONS;
  const selectedSectionId = view === ALL_SECTIONS ? 0 : view;

  // Per section: a coordinator-only section is verify-only even when the
  // viewer holds club_members:approve through their own club elsewhere.
  const sectionMode: MembershipReviewMode =
    sections.find((section) => section.club_section_id === selectedSectionId)?.mode ?? mode;

  const {
    data: requests = [],
    isFetching: isLoading,
    error: queryError,
  } = useQuery<MembershipRequest[], Error>({
    queryKey: ["membership", "requests", selectedSectionId],
    queryFn: () => listMembershipRequestsFromClient(selectedSectionId),
    enabled: !showQueue && selectedSectionId > 0,
    staleTime: 60_000,
  });

  const loadError = (() => {
    if (!queryError) return null;
    // Section left the coordinator's scope (assignment ended or changed).
    if (getConsentErrorCode(queryError) === "GUARD_CLUB_SCOPE_REQUIRED") {
      return t("client.load_error_scope");
    }
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
          value={String(view)}
          onValueChange={(value) => setView(value === ALL_SECTIONS ? ALL_SECTIONS : Number(value))}
        >
          <SelectTrigger id="section-select">
            <SelectValue placeholder={t("client.section_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {coordinatorQueue && (
              <SelectItem value={ALL_SECTIONS}>{tQueue("all_sections")}</SelectItem>
            )}
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

      {/* Aggregate queue: all the coordinator's sections */}
      {showQueue && <CoordinatorConsentQueue onSelectSection={setView} />}

      {/* Loading state */}
      {!showQueue && isLoading && (
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
      {!showQueue && !isLoading && loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      )}

      {/* Table */}
      {!showQueue && !isLoading && !loadError && selectedSectionId > 0 && (
        <PendingMembersTable
          key={selectedSectionId}
          clubSectionId={selectedSectionId}
          initialRequests={requests}
          mode={sectionMode}
        />
      )}
    </div>
  );
}
