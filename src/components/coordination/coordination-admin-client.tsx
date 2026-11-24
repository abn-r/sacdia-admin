"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Building2, Landmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { ScopePicker } from "@/components/shared/scope-picker";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import { useRememberedScope } from "@/hooks/use-remembered-scope";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { getActionErrorMessage } from "@/lib/api/action-error";
import { listClubTypes, type ClubType } from "@/lib/api/catalogs";
import {
  extractCoordinationConflictReason,
  listCoordinationZones,
  listCoordinatorAssignments,
  updateCoordinationZone,
  type CoordinationZone,
  type CoordinatorAssignment,
} from "@/lib/api/coordination";
import {
  listDistricts,
  type District,
  type LocalField,
} from "@/lib/api/geography";
import { unwrapApiData } from "@/lib/api/unwrap";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";
import type { AdminDistrict } from "@/lib/catalogs/districts/types";
import {
  canAdminFilterByLocalField,
  type AdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import { fetchClubsList, getClubListId } from "@/lib/clubs/fetch-list";
import {
  parseCoordinationTab,
  takenDistrictIds,
  zoneAssignments,
} from "@/lib/coordination/zone-view";
import { CoordinationZonesPanel } from "@/components/coordination/coordination-zones-panel";
import { CoordinationZoneSheet } from "@/components/coordination/coordination-zone-sheet";
import { CoordinationZoneDialog } from "@/components/coordination/coordination-zone-dialog";
import { CoordinationAssignmentsPanel } from "@/components/coordination/coordination-assignments-panel";
import { CoordinationBackfillDialog } from "@/components/coordination/coordination-backfill-dialog";
import {
  coordinationErrorMessage,
} from "@/components/coordination/coordination-labels";

// The pickers only offer active districts and club types, so they read the
// public catalogs. /admin/districts and /admin/club-types admit only catalog
// editors (admin, assistant-admin, super-admin): a local field or union
// director got 403 there, and the whole page failed to load.
async function loadActiveDistricts(localFieldId: number): Promise<AdminDistrict[]> {
  const rows = unwrapApiData<District[]>(await listDistricts(localFieldId));
  return rows.map((row) => ({
    district_id: row.district_id,
    name: row.name,
    local_field_id: row.local_field_id,
    active: true,
    created_at: null,
    modified_at: null,
  }));
}

async function loadActiveClubTypes(): Promise<AdminClubType[]> {
  const rows = unwrapApiData<ClubType[]>(await listClubTypes());
  return rows.map((row) => ({
    club_type_id: row.club_type_id,
    name: row.name,
    active: true,
    created_at: null,
    modified_at: null,
  }));
}

type CoordinationAdminClientProps = {
  localFields: LocalField[];
  territoryScope: AdminTerritoryScope;
  /** `coordination.manage`: false hides every write control (read-only view). */
  canManage: boolean;
};

type ClubOption = { club_id: number; name: string };

type LoadedData = {
  zones: CoordinationZone[];
  assignments: CoordinatorAssignment[];
  districts: AdminDistrict[];
  clubTypes: AdminClubType[];
  clubs: ClubOption[];
  at: Date;
};

export function CoordinationAdminClient({
  localFields,
  territoryScope,
  canManage,
}: CoordinationAdminClientProps) {
  const t = useTranslations("coordinationAdmin");
  const tc = useTranslations("people.community.coordination");
  const canPickLocalField = canAdminFilterByLocalField(territoryScope);
  const [rememberedField, rememberField] = useRememberedScope("local_field");
  const tab = parseCoordinationTab(useUrlTab("tab", "zones"));

  const fixedLocalFieldId =
    territoryScope.level === "local_field" ? territoryScope.localFieldId : undefined;
  const rememberedId = Number(rememberedField);
  const localFieldId =
    fixedLocalFieldId ??
    (localFields.some((field) => field.local_field_id === rememberedId)
      ? rememberedId
      : localFields[0]?.local_field_id);

  const selectedField = useMemo(
    () => localFields.find((field) => field.local_field_id === localFieldId) ?? null,
    [localFieldId, localFields],
  );
  const localFieldName = selectedField?.name ?? tc("scope.fallback");

  const [data, setData] = useState<LoadedData | null>(null);
  // Local field whose first load has settled (success or error). Until it
  // matches the selected field the tabs must not render: their empty states
  // ("no zones", "no assignments") would flash before the data arrives.
  const [settledFieldId, setSettledFieldId] = useState<number | undefined>();
  const [failure, setFailure] = useState<ErrorStateFromError | null>(null);
  const latestRequest = useRef(0);

  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [openZoneId, setOpenZoneId] = useState<number | null>(null);
  const [togglingZone, setTogglingZone] = useState<CoordinationZone | null>(null);

  const refresh = useCallback(async () => {
    if (!localFieldId) return;
    const requestId = ++latestRequest.current;
    try {
      const [zones, assignments, districts, clubTypes, clubsResult] = await Promise.all([
        listCoordinationZones(localFieldId),
        listCoordinatorAssignments(localFieldId),
        loadActiveDistricts(localFieldId),
        loadActiveClubTypes(),
        fetchClubsList({ page: 1, limit: 100, active: true, localFieldId }),
      ]);

      if (requestId !== latestRequest.current) return;
      setFailure(null);
      setData({
        zones: Array.isArray(zones) ? zones : [],
        assignments: Array.isArray(assignments) ? assignments : [],
        districts,
        clubTypes,
        clubs: clubsResult.items
          .map((club) => {
            const clubId = getClubListId(club);
            if (!clubId || !club.name) return null;
            return { club_id: clubId, name: club.name };
          })
          .filter((club): club is ClubOption => Boolean(club)),
        at: new Date(),
      });
    } catch (error) {
      if (requestId !== latestRequest.current) return;
      setFailure(errorStateFromError(error));
    } finally {
      if (requestId === latestRequest.current) setSettledFieldId(localFieldId);
    }
  }, [localFieldId]);

  // A different local field starts from scratch: nothing from the previous one
  // may stay on screen as if it belonged to the new one.
  const dataFieldRef = useRef(localFieldId);
  useEffect(() => {
    if (dataFieldRef.current !== localFieldId) {
      dataFieldRef.current = localFieldId;
      setData(null);
      setFailure(null);
      setOpenZoneId(null);
    }
    void refresh();
  }, [localFieldId, refresh]);

  const initialLoading = settledFieldId !== localFieldId;

  if (localFields.length === 0 || !localFieldId) {
    return (
      <EmptyState
        icon={Landmark}
        title={t("emptyNoLocalField.title")}
        description={t("emptyNoLocalField.description")}
      />
    );
  }

  const zones = data?.zones ?? [];
  const assignments = data?.assignments ?? [];
  const openZone = zones.find((zone) => zone.zone_id === openZoneId) ?? null;
  const takenIds = takenDistrictIds(zones);
  const availableDistricts = (data?.districts ?? []).filter(
    (district) => district.active && !takenIds.has(district.district_id),
  );

  async function confirmToggleZone() {
    if (!togglingZone) return;
    const next = !togglingZone.active;
    try {
      await updateCoordinationZone(togglingZone.zone_id, { active: next });
    } catch (error) {
      throw new Error(
        coordinationErrorMessage(
          extractCoordinationConflictReason(error),
          getActionErrorMessage(error, t("errors.generic")),
          t as unknown as (key: string) => string,
        ),
      );
    }
    toast.success(next ? t("success.zoneActivated") : t("success.zoneDeactivated"));
    await refresh();
  }

  const showActions = canManage && data !== null;
  const actions = showActions ? (
    tab === "zones" ? (
      <Button type="button" onClick={() => setZoneDialogOpen(true)}>
        <Plus className="size-4" />
        {tc("actions.newZone")}
      </Button>
    ) : (
      <>
        <Button type="button" variant="outline" onClick={() => setBackfillOpen(true)}>
          {tc("actions.migrate")}
        </Button>
        <Button type="button" onClick={() => setAssignmentDialogOpen(true)}>
          <Plus className="size-4" />
          {tc("actions.newAssignment")}
        </Button>
      </>
    )
  ) : undefined;

  const togglingAssignments = togglingZone ? zoneAssignments(togglingZone, assignments) : [];

  return (
    <div className="space-y-6">
      {canPickLocalField && selectedField ? (
        <ScopePicker
          value={{ id: String(localFieldId), name: localFieldName }}
          options={localFields.map((field) => ({
            id: String(field.local_field_id),
            name: field.name,
          }))}
          allLabel={localFieldName}
          loading={initialLoading}
          onChange={(id) => {
            // The picker always offers an "all" entry; a coordination screen
            // always works inside one local field, so it keeps the current one.
            if (id !== null) rememberField(id);
          }}
        />
      ) : (
        <p
          className="inline-flex h-8 max-w-full items-center gap-2 rounded-full border bg-background px-3 text-sm"
          data-testid="coordination-field"
        >
          <Building2 className="size-4 shrink-0" aria-hidden />
          <span className="truncate font-semibold">{localFieldName}</span>
        </p>
      )}

      <PageHeader
        title={t("page.title")}
        description={tc("page.description")}
        actions={actions}
      />

      <UrlTabs
        ariaLabel={tc("tabs.label")}
        defaultValue="zones"
        tabs={[
          {
            value: "zones",
            label: tc("tabs.zones"),
            ...(data ? { count: data.zones.length } : {}),
          },
          {
            value: "assignments",
            label: tc("tabs.assignments"),
            ...(data ? { count: data.assignments.length } : {}),
          },
        ]}
      />

      {initialLoading ? (
        <div role="status" aria-busy="true" data-testid="coordination-loading">
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : data === null ? (
        <ErrorState
          kind={failure?.kind ?? "error"}
          detail={failure?.detail}
          title={tc("loadError.title")}
          icon={Landmark}
          onRetry={() => void refresh()}
        />
      ) : (
        <>
          {failure ? <StaleDataNotice at={data.at} onRetry={() => void refresh()} /> : null}

          {tab === "zones" ? (
            <CoordinationZonesPanel
              zones={zones}
              assignments={assignments}
              canManage={canManage}
              onOpen={(zone) => setOpenZoneId(zone.zone_id)}
              onToggle={setTogglingZone}
              onCreate={() => setZoneDialogOpen(true)}
            />
          ) : (
            <CoordinationAssignmentsPanel
              localFieldId={localFieldId}
              localFieldName={localFieldName}
              zones={zones}
              clubTypes={data.clubTypes}
              clubs={data.clubs}
              assignments={assignments}
              canManage={canManage}
              dialogOpen={assignmentDialogOpen}
              onDialogOpenChange={setAssignmentDialogOpen}
              onChanged={refresh}
            />
          )}
        </>
      )}

      {canManage ? (
        <>
          <CoordinationZoneDialog
            open={zoneDialogOpen}
            onOpenChange={setZoneDialogOpen}
            localFieldId={localFieldId}
            localFieldName={localFieldName}
            onCreated={refresh}
          />
          <CoordinationBackfillDialog
            open={backfillOpen}
            onOpenChange={setBackfillOpen}
            localFieldId={localFieldId}
            onApplied={refresh}
          />
        </>
      ) : null}

      <CoordinationZoneSheet
        zone={openZone}
        assignments={assignments}
        availableDistricts={availableDistricts}
        canManage={canManage}
        onClose={() => setOpenZoneId(null)}
        onChanged={refresh}
        onToggle={setTogglingZone}
      />

      <ConfirmDialog
        open={togglingZone !== null}
        onOpenChange={(next) => (next ? undefined : setTogglingZone(null))}
        tone={togglingZone?.active ? "destructive" : "default"}
        title={
          togglingZone
            ? tc(togglingZone.active ? "zoneToggle.deactivateTitle" : "zoneToggle.activateTitle", {
                zone: togglingZone.name,
              })
            : ""
        }
        description={
          togglingZone
            ? togglingZone.active
              ? tc("zoneToggle.deactivateDescription", { count: togglingAssignments.length })
              : tc("zoneToggle.activateDescription")
            : ""
        }
        confirmLabel={
          togglingZone?.active ? tc("actions.deactivateConfirm") : tc("actions.activateConfirm")
        }
        onConfirm={confirmToggleZone}
      />
    </div>
  );
}
