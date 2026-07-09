"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { PendingMembersTable } from "@/components/membership/pending-members-table";
import { TransfersTable } from "@/components/requests/transfers-table";
import { SectionColumn } from "@/components/clubs/detail/section-column";
import { sortBySectionKind } from "@/components/clubs/detail/helpers";
import type { SectionKind } from "@/components/clubs/detail/types";
import { listMembershipRequestsFromClient } from "@/lib/api/membership-requests";
import { getTransferRequests } from "@/lib/api/requests";

type Section = {
  club_section_id?: number;
  club_type_id?: number;
  club_type?: { name?: string } | null;
  name?: string;
  active?: boolean;
};

interface PendingSectionRowProps {
  section: Section;
  label: string;
  accent?: string;
}

function PendingSectionRow({ section, label, accent }: PendingSectionRowProps) {
  const t = useTranslations("membership");
  const sectionId = section.club_section_id!;

  const {
    data: requests = [],
    isFetching: isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["membership-requests", sectionId],
    queryFn: () => listMembershipRequestsFromClient(sectionId),
    staleTime: 30_000,
  });

  const {
    data: transferRequests = [],
    isFetching: isLoadingTransfers,
    error: transferQueryError,
    refetch: refetchTransfers,
  } = useQuery({
    queryKey: ["transfer-requests", sectionId],
    queryFn: () => getTransferRequests({ sectionId, status: "PENDING" }),
    staleTime: 30_000,
  });

  const loadError =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? t("pending.load_error")
        : null;
  const transferLoadError =
    transferQueryError instanceof Error
      ? transferQueryError.message
      : transferQueryError
        ? t("pending.load_error")
        : null;

  const pendingCount = requests.length + transferRequests.length;

  return (
    <SectionColumn
      title={label}
      accent={accent}
      countLabel={t("pending.column_count", { count: pendingCount })}
      className="min-w-0"
    >
      <div className="space-y-4">
        {isLoading || isLoadingTransfers ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : null}

        {!isLoading && loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : null}

        {!isLoading && !loadError ? (
          requests.length === 0 && transferRequests.length === 0 && !isLoadingTransfers ? (
            <p className="text-sm text-muted-foreground">
              {t("pending.column_empty")}
            </p>
          ) : requests.length > 0 ? (
            <PendingMembersTable
              clubSectionId={sectionId}
              initialRequests={requests}
            />
          ) : null
        ) : null}

        {!isLoadingTransfers && transferLoadError ? (
          <p className="text-sm text-destructive">{transferLoadError}</p>
        ) : null}

        {!isLoadingTransfers && !transferLoadError && transferRequests.length > 0 ? (
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium text-foreground">
              {t("pending.transfers_title")}
            </p>
            <TransfersTable
              requests={transferRequests}
              onRefresh={() => void refetchTransfers()}
            />
          </div>
        ) : null}
      </div>
    </SectionColumn>
  );
}

interface PendingMembersPanelProps {
  sections: Section[];
  sectionMeta?: Array<{
    sectionId: number;
    label: string;
    accent: string;
    kind: SectionKind;
  }>;
}

export function PendingMembersPanel({
  sections,
  sectionMeta = [],
}: PendingMembersPanelProps) {
  const t = useTranslations("membership");

  const activeSections = useMemo(() => {
    const filtered = sections.filter(
      (section) => section.active !== false && section.club_section_id,
    );
    return sortBySectionKind(filtered, (section) => {
      const meta = sectionMeta.find(
        (item) => item.sectionId === section.club_section_id,
      );
      return meta?.kind ?? "unknown";
    });
  }, [sections, sectionMeta]);

  if (activeSections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("pending.no_active_sections_description")}
      </p>
    );
  }

  const getSectionLabel = (section: Section): string => {
    const meta = sectionMeta.find(
      (item) => item.sectionId === section.club_section_id,
    );
    return (
      meta?.label ??
      section.name ??
      section.club_type?.name ??
      t("pending.section_fallback", { id: section.club_section_id ?? "?" })
    );
  };

  const getAccent = (sectionId: number) =>
    sectionMeta.find((meta) => meta.sectionId === sectionId)?.accent;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("pending.description")}</p>
      <div className="space-y-4">
        {activeSections.map((section) => (
          <PendingSectionRow
            key={section.club_section_id}
            section={section}
            label={getSectionLabel(section)}
            accent={getAccent(section.club_section_id!)}
          />
        ))}
      </div>
    </div>
  );
}
