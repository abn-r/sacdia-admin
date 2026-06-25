"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
import { TransfersTable } from "@/components/requests/transfers-table";
import { listMembershipRequestsFromClient } from "@/lib/api/membership-requests";
import { getTransferRequests } from "@/lib/api/requests";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = {
  club_section_id?: number;
  club_type_id?: number;
  club_type?: { name?: string } | null;
  name?: string;
  active?: boolean;
};

interface PendingMembersPanelProps {
  sections: Section[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PendingMembersPanel({ sections }: PendingMembersPanelProps) {
  const t = useTranslations("membership");
  const activeSections = sections.filter(
    (s) => s.active !== false && s.club_section_id,
  );

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    activeSections[0]?.club_section_id ?? null,
  );

  const {
    data: requests = [],
    isFetching: isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["membership-requests", selectedSectionId],
    queryFn: () => listMembershipRequestsFromClient(selectedSectionId!),
    enabled: selectedSectionId !== null,
    staleTime: 30_000,
  });
  const {
    data: transferRequests = [],
    isFetching: isLoadingTransfers,
    error: transferQueryError,
    refetch: refetchTransfers,
  } = useQuery({
    queryKey: ["transfer-requests", selectedSectionId],
    queryFn: () =>
      getTransferRequests({ sectionId: selectedSectionId!, status: "PENDING" }),
    enabled: selectedSectionId !== null,
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

  if (activeSections.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title={t("pending.no_active_sections_title")}
        description={t("pending.no_active_sections_description")}
      />
    );
  }

  const getSectionLabel = (section: Section): string => {
    return (
      section.name ??
      section.club_type?.name ??
      t("pending.section_fallback", { id: section.club_section_id ?? "?" })
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("pending.description")}
      </p>

      {/* Section selector */}
      {activeSections.length > 1 && (
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="section-select">{t("pending.section_label")}</Label>
          <Select
            value={String(selectedSectionId)}
            onValueChange={(value) => setSelectedSectionId(Number(value))}
          >
            <SelectTrigger id="section-select">
              <SelectValue placeholder={t("pending.section_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {activeSections.map((section) => (
                <SelectItem
                  key={section.club_section_id}
                  value={String(section.club_section_id)}
                >
                  {getSectionLabel(section)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {activeSections.length === 1 && (
        <p className="text-sm font-medium">
          {getSectionLabel(activeSections[0])}
        </p>
      )}

      {/* Loading state */}
      {(isLoading || isLoadingTransfers) && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-md border p-4"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16 ml-auto" />
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
      {!isLoading && !loadError && selectedSectionId && (
        <PendingMembersTable
          key={selectedSectionId}
          clubSectionId={selectedSectionId}
          initialRequests={requests}
        />
      )}

      {!isLoadingTransfers && transferLoadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{transferLoadError}</p>
        </div>
      )}

      {!isLoadingTransfers && !transferLoadError && selectedSectionId && (
        <div className="space-y-3 border-t pt-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Solicitudes de cambio de club
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Aprueba o rechaza miembros que solicitan integrarse a esta
              sección.
            </p>
          </div>
          <TransfersTable
            requests={transferRequests}
            onRefresh={() => void refetchTransfers()}
          />
        </div>
      )}
    </div>
  );
}
