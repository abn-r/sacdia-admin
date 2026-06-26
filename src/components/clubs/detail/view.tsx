"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, Building2, Loader2, MapPin, Trash2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EditClubForm } from "@/components/clubs/edit-club-form";
import { ClubSectionsPanel } from "@/components/clubs/club-sections-panel";
import { ClubSectionResponsablesPanel } from "@/components/clubs/club-section-responsables-panel";
import { ClubSectionHistoryPanel } from "@/components/clubs/club-section-history-panel";
import { PendingMembersPanel } from "@/components/membership/pending-members-panel";
import { UnitsTab } from "@/components/units/units-tab";
import {
  getClubLeadershipFromClient,
  getClubOverviewFromClient,
} from "@/lib/api/club-detail";
import type { ClubActionState } from "@/lib/clubs/actions";
import { ClubOverviewTab } from "./overview-tab";
import { ClubHistoryTab } from "./history-tab";
import { ClubInfoPanel } from "./info-panel";
import {
  buildSectionViews,
  getActiveUnits,
  getClubLocations,
  getTotalMembers,
} from "./helpers";
import type { ClubTabId } from "./tabs-nav";
import type { ClubFull, ClubSectionRaw } from "./types";
import { listUnits } from "@/lib/api/units";

interface SelectOption {
  label: string;
  value: number;
}

interface ClubDetailViewProps {
  club: ClubFull;
  clubId: number;
  defaultTab: ClubTabId;
  localFieldOptions: SelectOption[];
  districtOptions: SelectOption[];
  churchOptions: SelectOption[];
  clubTypeOptions: SelectOption[];
  updateAction: (
    prevState: ClubActionState,
    formData: FormData,
  ) => Promise<ClubActionState>;
  deleteAction: (formData: FormData) => Promise<void>;
}

const TAB_ITEMS = [
  { id: "overview" as const, labelKey: "tabOverview" as const },
  { id: "sections" as const, labelKey: "tabSections" as const },
  { id: "responsables" as const, labelKey: "tabResponsables" as const },
  { id: "units" as const, labelKey: "tabUnits" as const },
  { id: "membership" as const, labelKey: "tabMembership" as const },
  { id: "info" as const, labelKey: "tabInfo" as const },
  { id: "history" as const, labelKey: "tabHistory" as const },
  { id: "edit" as const, labelKey: "tabEdit" as const },
];

export function ClubDetailView({
  club,
  clubId,
  defaultTab,
  localFieldOptions,
  districtOptions,
  churchOptions,
  clubTypeOptions,
  updateAction,
  deleteAction,
}: ClubDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("clubs.pages.v2.detail");
  const tDetail = useTranslations("clubs.pages.detail");
  const [tab, setTab] = useState<ClubTabId>(defaultTab);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
  const sectionLookup = useMemo(() => {
    const map = new Map<number, ClubSectionRaw>();
    for (const section of sections) {
      if (section.sectionId != null) map.set(section.sectionId, section.raw);
    }
    return map;
  }, [sections]);

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
  const members = getTotalMembers(sections);

  function setActiveTab(next: ClubTabId) {
    setTab(next);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={club.name ?? t("fallbackTitle")}
        description={t("description")}
        breadcrumbs={[
          { label: t("breadcrumbList"), href: "/dashboard/clubs" },
          { label: club.name ?? t("fallbackTitle") },
        ]}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setActiveTab("edit")}>
            {t("editButton")}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            {tDetail("deleteDialogConfirm")}
          </Button>
        </div>
      </PageHeader>

      <section className="rounded-xl border bg-muted/15 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">{club.name ?? "—"}</h2>
                <Badge variant={club.active !== false ? "soft-success" : "outline"}>
                  {club.active !== false ? t("statusActive") : t("statusInactive")}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {club.description?.trim() || t("noDescription")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {church && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {church}
                    {district ? ` · ${district}` : ""}
                  </span>
                )}
                {localField && <span>{localField}</span>}
                <span>
                  {members} {t("membersLabel")} · {activeUnits.length} {t("unitsLabel")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Tabs value={tab} onValueChange={(value) => setActiveTab(value as ClubTabId)}>
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-muted/30 px-0"
        >
          {TAB_ITEMS.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="min-h-11 px-4">
              {t(item.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <ClubOverviewTab
              sections={sections}
              units={activeUnits}
              sectionLookup={sectionLookup}
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
            />
          </div>
        </TabsContent>

        <TabsContent value="sections" className="mt-5 space-y-5">
          <div className="rounded-xl border bg-card shadow-sm">
            <ClubSectionsPanel
              clubId={clubId}
              sections={rawSections}
              clubTypes={clubTypeOptions.map((option) => ({
                club_type_id: option.value,
                name: option.label,
              }))}
              onAssignResponsible={() => setActiveTab("responsables")}
              onSectionSelect={setSelectedSectionId}
            />
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <ClubSectionHistoryPanel clubId={clubId} />
          </div>
        </TabsContent>

        <TabsContent value="responsables" className="mt-5">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            {responsablesSections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noSectionsForResponsables")}
              </p>
            ) : (
              <ClubSectionResponsablesPanel
                clubId={clubId}
                sections={responsablesSections}
                defaultSectionId={selectedSectionId ?? undefined}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="units" className="mt-5">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <UnitsTab clubId={clubId} localFieldId={club.local_field_id ?? null} />
          </div>
        </TabsContent>

        <TabsContent value="membership" className="mt-5">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <header className="mb-4">
              <h3 className="text-sm font-bold text-foreground">{t("membershipTitle")}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("membershipLead")}</p>
            </header>
            <PendingMembersPanel sections={rawSections} />
          </div>
        </TabsContent>

        <TabsContent value="info" className="mt-5">
          <ClubInfoPanel club={club} sections={sections} onEdit={() => setActiveTab("edit")} />
        </TabsContent>

        <TabsContent value="history" className="mt-5">
          <ClubHistoryTab clubId={clubId} />
        </TabsContent>

        <TabsContent value="edit" className="mt-5">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <header className="mb-4">
              <h3 className="text-sm font-bold text-foreground">{t("editTitle")}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("editLead")}</p>
            </header>
            <EditClubForm
              club={editClubProps}
              localFields={localFieldOptions}
              districts={districtOptions}
              churches={churchOptions}
              formAction={updateAction}
              googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
            />
          </div>
        </TabsContent>
      </Tabs>

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
