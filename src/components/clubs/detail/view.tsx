"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Building2,
  Loader2,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditClubForm } from "@/components/clubs/edit-club-form";
import { PendingMembersPanel } from "@/components/membership/pending-members-panel";
import { UnitsTab } from "@/components/units/units-tab";
import {
  getClubLeadershipFromClient,
  getClubOverviewFromClient,
} from "@/lib/api/club-detail";
import type { ClubActionState } from "@/lib/clubs/actions";
import { usePanelPath } from "@/lib/v2/panel-path-context";
import { ClubOverviewTab } from "./overview-tab";
import { ClubHistoryTab } from "./history-tab";
import { ClubInfoPanel } from "./info-panel";
import { ClubSectionsTab } from "./sections-tab";
import { ClubResponsablesTab } from "./responsables-tab";
import { ClubDetailStats } from "./stats";
import { ClubTabsNav } from "./tabs-nav";
import type { ClubMainTabId } from "./tabs-nav";
import {
  buildSectionViews,
  getActiveUnits,
  getClubLocations,
} from "./helpers";
import type { ClubFull } from "./types";
import { listUnits } from "@/lib/api/units";

interface SelectOption {
  label: string;
  value: number;
}

interface ClubDetailViewProps {
  club: ClubFull;
  clubId: number;
  defaultTab: ClubMainTabId;
  defaultEditOpen?: boolean;
  localFieldOptions: SelectOption[];
  districtOptions: SelectOption[];
  churchOptions: SelectOption[];
  clubTypeOptions: SelectOption[];
  updateAction: (
    prevState: ClubActionState,
    formData: FormData,
  ) => Promise<ClubActionState>;
  deleteAction: (formData: FormData) => Promise<void>;
  pendingMembershipCount?: number;
}

export function ClubDetailView({
  club,
  clubId,
  defaultTab,
  defaultEditOpen = false,
  localFieldOptions,
  districtOptions,
  churchOptions,
  clubTypeOptions,
  updateAction,
  deleteAction,
  pendingMembershipCount = 0,
}: ClubDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toPanelPath } = usePanelPath();
  const clubsListHref = toPanelPath("/dashboard/clubs");
  const t = useTranslations("clubs.pages.v2.detail");
  const tDetail = useTranslations("clubs.pages.detail");
  const [tab, setTab] = useState<ClubMainTabId>(defaultTab);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(defaultEditOpen);

  const { data: units = [] } = useQuery({
    queryKey: ["club-detail-units", clubId],
    queryFn: () => listUnits(clubId),
    staleTime: 30_000,
  });

  const {
    data: overview,
    isLoading: isLoadingOverview,
    isFetching: isFetchingOverview,
    error: overviewErrorRaw,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["club-detail-overview", clubId],
    queryFn: () => getClubOverviewFromClient(clubId),
    staleTime: 60_000,
  });
  const overviewError = overviewErrorRaw instanceof Error ? overviewErrorRaw : null;

  const {
    data: leadership,
    isLoading: isLoadingLeadership,
    isFetching: isFetchingLeadership,
    error: leadershipErrorRaw,
    refetch: refetchLeadership,
  } = useQuery({
    queryKey: ["club-detail-leadership", clubId],
    queryFn: () => getClubLeadershipFromClient(clubId),
    staleTime: 60_000,
  });
  const leadershipError =
    leadershipErrorRaw instanceof Error ? leadershipErrorRaw : null;

  const activeUnits = useMemo(() => getActiveUnits(units), [units]);
  const sections = useMemo(() => buildSectionViews(club, activeUnits), [club, activeUnits]);

  const rawSections = useMemo(
    () =>
      (club.club_sections ?? club.sections ?? []).map((section) => ({
        ...section,
        name: section.name ?? undefined,
      })),
    [club.club_sections, club.sections],
  );

  const responsablesSections = useMemo(() => {
    const existingByTypeId = new Map(
      rawSections.map((section) => [section.club_type_id, section]),
    );
    return clubTypeOptions
      .map((option) => {
        const section = existingByTypeId.get(option.value);
        if (!section?.club_section_id) return null;
        return {
          club_section_id: section.club_section_id,
          club_type_id: section.club_type_id ?? option.value,
          name: section.name ?? option.label,
          typeName: option.label,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
  }, [clubTypeOptions, rawSections]);

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    responsablesSections[0]?.club_section_id ?? null,
  );
  const [openAssignOnResponsables, setOpenAssignOnResponsables] = useState(false);

  const editClubProps = useMemo(
    () => ({
      name: club.name ?? undefined,
      description: club.description ?? undefined,
      active: club.active,
      local_field_id: club.local_field_id,
      district_id: club.district_id,
      church_id: club.church_id,
      address: club.address ?? undefined,
      latitude: club.latitude ?? undefined,
      longitude: club.longitude ?? undefined,
      coordinates: club.coordinates ?? undefined,
    }),
    [club],
  );

  const { localField, district, church } = getClubLocations(club);
  const pendingCount =
    pendingMembershipCount > 0
      ? pendingMembershipCount
      : overview?.funnel?.pending_requests ?? pendingMembershipCount;

  useEffect(() => {
    setTab(defaultTab);
    setEditOpen(defaultEditOpen);
  }, [defaultTab, defaultEditOpen]);

  function syncRoute(nextTab: ClubMainTabId) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("panel");
    if (nextTab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  function setActiveTab(next: ClubMainTabId) {
    setTab(next);
    syncRoute(next);
  }

  function openResponsablesTab(sectionId?: number, withAssign = false) {
    if (sectionId != null) setSelectedSectionId(sectionId);
    setOpenAssignOnResponsables(withAssign);
    setActiveTab("responsables");
  }

  const teamSections = sections
    .filter((section) => section.sectionId != null)
    .map((section) => ({
      sectionId: section.sectionId!,
      typeName: section.label,
      memberCount: section.members,
      active: section.active,
    }));

  const mainTabs = [
    { id: "overview" as const, label: t("tabOverview") },
    { id: "sections" as const, label: t("tabSections") },
    { id: "responsables" as const, label: t("tabResponsables") },
    { id: "units" as const, label: t("tabUnits") },
    {
      id: "membership" as const,
      label: t("tabMembership"),
      count: pendingCount > 0 ? pendingCount : null,
    },
    { id: "history" as const, label: t("tabHistory") },
    { id: "info" as const, label: t("tabInfo") },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardDescription className="text-xs">
            <Link
              href={clubsListHref}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("breadcrumbList")}
            </Link>
            <span className="text-muted-foreground"> / </span>
            <span>{club.name ?? t("fallbackTitle")}</span>
          </CardDescription>
          <CardTitle className="text-xl">{club.name ?? t("fallbackTitle")}</CardTitle>
          <CardDescription>
            {club.description?.trim() || t("noDescription")}
          </CardDescription>
          <CardAction className="flex flex-wrap items-center gap-2">
            <Badge variant={club.active !== false ? "soft-success" : "outline"}>
              {club.active !== false ? t("statusActive") : t("statusInactive")}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5" />
              {t("editButton")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-3.5" />
              {t("hubDeleteClub")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-muted">
              <Building2 className="size-4" />
            </span>
            {club.name ?? "—"}
          </span>
          {church ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {church}
              {district ? ` · ${district}` : ""}
            </span>
          ) : null}
          {localField ? <span>{localField}</span> : null}
        </CardContent>
      </Card>

      {pendingMembershipCount > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {t("pendingAlertTitle", { count: pendingMembershipCount })}
            </p>
            <p className="text-xs text-muted-foreground">{t("membershipLead")}</p>
          </div>
          <Button size="sm" onClick={() => setActiveTab("membership")}>
            {t("pendingAlertAction")}
          </Button>
        </div>
      ) : null}

      <ClubDetailStats
        sections={sections}
        unitsCount={activeUnits.length}
        pendingRequests={pendingCount}
      />

      <ClubTabsNav
        tabs={mainTabs}
        value={tab}
        onChange={setActiveTab}
        ariaLabel={t("tabsAriaLabel")}
      />

      <div className="space-y-4">
        {tab === "overview" ? (
          <ClubOverviewTab
            sections={sections}
            units={activeUnits}
            overview={overview}
            isLoadingOverview={isLoadingOverview}
            overviewError={overviewError}
            leadership={leadership}
            isLoadingLeadership={isLoadingLeadership}
            leadershipError={leadershipError}
            onRetryOverview={() => void refetchOverview()}
            onRetryLeadership={() => void refetchLeadership()}
            isRetryingOverview={isFetchingOverview && !isLoadingOverview}
            isRetryingLeadership={isFetchingLeadership && !isLoadingLeadership}
            teamSections={teamSections}
            onOpenResponsables={(sectionId) => openResponsablesTab(sectionId)}
            onOpenSections={() => setActiveTab("sections")}
          />
        ) : null}

        {tab === "sections" ? (
          <ClubSectionsTab
            clubId={clubId}
            rawSections={rawSections}
            clubTypeOptions={clubTypeOptions.map((option) => ({
              club_type_id: option.value,
              name: option.label,
            }))}
            onAssignResponsible={() =>
              openResponsablesTab(selectedSectionId ?? undefined, true)
            }
            onSectionSelect={setSelectedSectionId}
          />
        ) : null}

        {tab === "responsables" ? (
          <ClubResponsablesTab
            clubId={clubId}
            sections={responsablesSections}
            defaultSectionId={selectedSectionId ?? undefined}
            initialAssignOpen={openAssignOnResponsables}
            onAssignOpenConsumed={() => setOpenAssignOnResponsables(false)}
          />
        ) : null}

        {tab === "units" ? (
          <Card>
            <CardContent className="pt-6">
              <UnitsTab
                clubId={clubId}
                localFieldId={club.local_field_id ?? null}
                sections={sections
                  .filter((section) => section.sectionId != null)
                  .map((section) => ({
                    sectionId: section.sectionId!,
                    label: section.label,
                    accent: section.meta.donutHex,
                  }))}
              />
            </CardContent>
          </Card>
        ) : null}

        {tab === "membership" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-normal">{t("membershipTitle")}</CardTitle>
              <CardDescription>{t("membershipLead")}</CardDescription>
            </CardHeader>
            <CardContent>
              <PendingMembersPanel
                sections={rawSections}
                sectionMeta={sections
                  .filter((section) => section.sectionId != null)
                  .map((section) => ({
                    sectionId: section.sectionId!,
                    label: section.label,
                    accent: section.meta.donutHex,
                    kind: section.kind,
                  }))}
              />
            </CardContent>
          </Card>
        ) : null}

        {tab === "history" ? (
          <Card>
            <CardContent className="pt-6">
              <ClubHistoryTab clubId={clubId} sections={sections} />
            </CardContent>
          </Card>
        ) : null}

        {tab === "info" ? (
          <ClubInfoPanel club={club} sections={sections} />
        ) : null}
      </div>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{t("editTitle")}</SheetTitle>
            <SheetDescription>{t("editLead")}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <EditClubForm
              club={editClubProps}
              localFields={localFieldOptions}
              districts={districtOptions}
              churches={churchOptions}
              formAction={updateAction}
              googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 w-fit rounded-full bg-destructive/10 p-2.5">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">
              {tDetail("deleteDialogTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {tDetail("deleteDialogDesc", { name: club.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={clubId} />
            <AlertDialogFooter>
              <AlertDialogCancel>{tDetail("deleteDialogCancel")}</AlertDialogCancel>
              <DeleteClubButton
                confirmLabel={tDetail("deleteDialogConfirm")}
                pendingLabel={tDetail("deleteDialogDeleting")}
              />
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DeleteClubButton({
  confirmLabel,
  pendingLabel,
}: {
  confirmLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 className="size-4" aria-hidden="true" />
      )}
      {pending ? pendingLabel : confirmLabel}
    </Button>
  );
}
