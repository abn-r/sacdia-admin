"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { EditClubForm } from "@/components/clubs/edit-club-form";
import { ClubSectionsPanel } from "@/components/clubs/club-sections-panel";
import { PendingMembersPanel } from "@/components/membership/pending-members-panel";
import { UnitsTab } from "@/components/units/units-tab";
import { listUnits } from "@/lib/api/units";
import {
  getClubLeadershipFromClient,
  getClubOverviewFromClient,
} from "@/lib/api/club-detail";
import type { ClubActionState } from "@/lib/clubs/actions";
import { ClubDetailHero } from "./hero";
import { ClubDetailStats } from "./stats";
import { ClubTabsNav } from "./tabs-nav";
import type { ClubTabId } from "./tab-utils";
import { ClubOverviewTab } from "./overview-tab";
import { ClubHistoryTab } from "./history-tab";
import { ClubInfoPanel } from "./info-panel";
import {
  ClubRightSidebar,
  LeadershipPanel,
} from "./right-sidebar";
import { buildSectionViews, getActiveUnits } from "./helpers";
import type { ClubFull, ClubSectionRaw } from "./types";

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
  updateAction: (
    prevState: ClubActionState,
    formData: FormData,
  ) => Promise<ClubActionState>;
  deleteAction: (formData: FormData) => Promise<unknown> | void;
}

export function ClubDetailView({
  club,
  clubId,
  defaultTab,
  localFieldOptions,
  districtOptions,
  churchOptions,
  updateAction,
  deleteAction,
}: ClubDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ClubTabId>(defaultTab);

  const { data: units = [] } = useQuery({
    queryKey: ["club-detail-units", clubId],
    queryFn: () => listUnits(clubId),
    staleTime: 30_000,
  });

  const {
    data: overview,
    isLoading: isLoadingOverview,
    error: overviewErrorRaw,
  } = useQuery({
    queryKey: ["club-detail-overview", clubId],
    queryFn: () => getClubOverviewFromClient(clubId),
    staleTime: 60_000,
  });
  const overviewError = overviewErrorRaw instanceof Error ? overviewErrorRaw : null;

  const {
    data: leadership,
    isLoading: isLoadingLeadership,
    error: leadershipErrorRaw,
  } = useQuery({
    queryKey: ["club-detail-leadership", clubId],
    queryFn: () => getClubLeadershipFromClient(clubId),
    staleTime: 60_000,
  });
  const leadershipError =
    leadershipErrorRaw instanceof Error ? leadershipErrorRaw : null;

  const pendingRequests = overview?.funnel.pending_requests ?? null;
  const upcomingEvents = overview?.upcoming_events ?? null;

  const activeUnits = useMemo(() => getActiveUnits(units), [units]);
  const sections = useMemo(() => buildSectionViews(club, activeUnits), [club, activeUnits]);
  const sectionLookup = useMemo(() => {
    const map = new Map<number, ClubSectionRaw>();
    for (const s of sections) {
      if (s.sectionId != null) map.set(s.sectionId, s.raw);
    }
    return map;
  }, [sections]);

  const rawSections = useMemo(
    () =>
      (club.club_sections ?? club.sections ?? []).map((s) => ({
        ...s,
        name: s.name ?? undefined,
      })),
    [club.club_sections, club.sections],
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

  const tabs = useMemo(
    () => [
      { id: "overview" as const, label: "Resumen" },
      { id: "sections" as const, label: "Secciones", count: sections.length },
      { id: "units" as const, label: "Unidades", count: activeUnits.length },
      { id: "membership" as const, label: "Solicitudes" },
      { id: "info" as const, label: "Información" },
      { id: "history" as const, label: "Historial" },
      { id: "edit" as const, label: "Editar" },
    ],
    [sections.length, activeUnits.length],
  );

  function setActiveTab(next: ClubTabId) {
    setTab(next);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleDelete() {
    if (typeof window === "undefined") return;
    if (
      !window.confirm(
        "¿Eliminar este club? Esta acción lo desactivará en el sistema.",
      )
    ) {
      return;
    }
    const data = new FormData();
    data.set("id", String(clubId));
    void deleteAction(data);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          Detalle de club
        </p>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
          Operación completa del club
        </h2>
      </div>

      <ClubDetailHero
        club={club}
        sections={sections}
        unitsCount={activeUnits.length}
        onEdit={() => setActiveTab("edit")}
        onDelete={handleDelete}
      />

      <ClubDetailStats
        sections={sections}
        unitsCount={activeUnits.length}
        pendingRequests={pendingRequests}
      />

      <ClubTabsNav tabs={tabs} value={tab} onChange={setActiveTab} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {tab === "overview" && (
            <ClubOverviewTab
              sections={sections}
              units={activeUnits}
              sectionLookup={sectionLookup}
              overview={overview}
              isLoadingOverview={isLoadingOverview}
              overviewError={overviewError}
            />
          )}

          {tab === "sections" && (
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <header className="mb-4">
                <h3 className="text-sm font-bold text-foreground">
                  Secciones del club
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tres rangos por edad — cada uno con sus propias unidades.
                </p>
              </header>
              <ClubSectionsPanel clubId={clubId} sections={rawSections} />
            </section>
          )}

          {tab === "units" && (
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <UnitsTab
                clubId={clubId}
                localFieldId={club.local_field_id ?? null}
              />
            </section>
          )}

          {tab === "membership" && (
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <header className="mb-4">
                <h3 className="text-sm font-bold text-foreground">
                  Solicitudes de membresía
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Aprueba o rechaza nuevos miembros por sección.
                </p>
              </header>
              <PendingMembersPanel sections={rawSections} />
            </section>
          )}

          {tab === "info" && (
            <ClubInfoPanel
              club={club}
              sections={sections}
              onEdit={() => setActiveTab("edit")}
            />
          )}

          {tab === "history" && <ClubHistoryTab clubId={clubId} />}

          {tab === "edit" && (
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <header className="mb-4">
                <h3 className="text-sm font-bold text-foreground">
                  Editar información del club
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Actualiza la identidad, ubicación y datos generales.
                </p>
              </header>
              <EditClubForm
                club={editClubProps}
                localFields={localFieldOptions}
                districts={districtOptions}
                churches={churchOptions}
                formAction={updateAction}
              />
            </section>
          )}
        </div>

        <ClubRightSidebar
          clubId={clubId}
          pendingRequests={pendingRequests}
          upcomingEvents={upcomingEvents}
          isLoadingEvents={isLoadingOverview}
          onEdit={() => setActiveTab("edit")}
          onDelete={handleDelete}
        />
      </div>

      <LeadershipPanel
        leadership={leadership}
        isLoading={isLoadingLeadership}
        error={leadershipError}
      />
    </div>
  );
}

export function ClubDetailLoadingSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

