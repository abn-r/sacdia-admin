"use client";

import { useTranslations } from "next-intl";
import { Eye, MapPin, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import type { CoordinationZone, CoordinatorAssignment } from "@/lib/api/coordination";
import {
  activeZoneDistricts,
  districtLabel,
  zoneCoordinatorIds,
} from "@/lib/coordination/zone-view";

const VISIBLE_DISTRICTS = 3;

type CoordinationZonesPanelProps = {
  zones: CoordinationZone[];
  assignments: CoordinatorAssignment[];
  canManage: boolean;
  onOpen: (zone: CoordinationZone) => void;
  onToggle: (zone: CoordinationZone) => void;
  onCreate?: () => void;
};

export function CoordinationZonesPanel({
  zones,
  assignments,
  canManage,
  onOpen,
  onToggle,
  onCreate,
}: CoordinationZonesPanelProps) {
  const t = useTranslations("coordinationAdmin");
  const tc = useTranslations("people.community.coordination");

  if (zones.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title={tc("zones.emptyTitle")}
        description={canManage ? tc("zones.emptyDescription") : t("zones.empty")}
      >
        {canManage && onCreate ? (
          <Button type="button" onClick={onCreate}>
            {tc("actions.newZone")}
          </Button>
        ) : null}
      </EmptyState>
    );
  }

  const statusLabels = { active: t("status.active"), inactive: t("status.inactive") };

  function districtTags(zone: CoordinationZone) {
    const memberships = activeZoneDistricts(zone);
    if (memberships.length === 0) {
      return <span className="text-muted-foreground text-sm">{t("zones.noDistricts")}</span>;
    }
    const shown = memberships.slice(0, VISIBLE_DISTRICTS);
    const rest = memberships.length - shown.length;
    return (
      <ul className="flex flex-wrap gap-1.5">
        {shown.map((membership) => (
          <li key={membership.zone_district_id}>
            <Badge variant="secondary">{districtLabel(membership)}</Badge>
          </li>
        ))}
        {rest > 0 ? (
          <li>
            <Badge variant="outline">{tc("zones.more", { count: rest })}</Badge>
          </li>
        ) : null}
      </ul>
    );
  }

  function rowActions(zone: CoordinationZone) {
    return (
      <RowActions
        label={zone.name}
        actions={[
          { label: tc("actions.viewDetail"), icon: Eye, onSelect: () => onOpen(zone) },
          {
            label: zone.active ? tc("actions.deactivateZone") : tc("actions.activateZone"),
            icon: Power,
            destructive: zone.active,
            hidden: !canManage,
            onSelect: () => onToggle(zone),
          },
        ]}
      />
    );
  }

  return (
    <>
      <DataTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc("zones.colZone")}</TableHead>
              <TableHead>{t("fields.districts")}</TableHead>
              <TableHead className="text-right">{tc("zones.colCoordinators")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
              <RowActionsHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {zones.map((zone) => (
              <TableRow key={zone.zone_id}>
                <TableCell className="max-w-[260px] whitespace-normal">
                  <button
                    type="button"
                    className="block max-w-full truncate text-left font-medium text-foreground outline-none hover:underline focus-visible:underline"
                    onClick={() => onOpen(zone)}
                  >
                    {zone.name}
                  </button>
                  {zone.description ? (
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {zone.description}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="whitespace-normal">{districtTags(zone)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {zoneCoordinatorIds(zone, assignments).length}
                </TableCell>
                <TableCell>
                  <ExceptionStatus
                    value={zone.active ? "active" : "inactive"}
                    normal={["active"]}
                    labels={statusLabels}
                    intents={{ inactive: "neutral" }}
                  />
                </TableCell>
                <TableCell className="text-right">{rowActions(zone)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <ul className="divide-y rounded-xl bg-card shadow-card md:hidden">
        {zones.map((zone) => (
          <li key={zone.zone_id} className="flex items-start gap-2 px-4 py-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="min-w-0 truncate text-left font-medium outline-none hover:underline focus-visible:underline"
                  onClick={() => onOpen(zone)}
                >
                  {zone.name}
                </button>
                <ExceptionStatus
                  value={zone.active ? "active" : "inactive"}
                  normal={["active"]}
                  labels={statusLabels}
                  intents={{ inactive: "neutral" }}
                />
              </div>
              <p className="flex flex-wrap gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                <span>
                  {tc("zones.districtCount", { count: activeZoneDistricts(zone).length })}
                </span>
                <span>
                  {tc("zones.coordinatorCount", {
                    count: zoneCoordinatorIds(zone, assignments).length,
                  })}
                </span>
              </p>
            </div>
            {rowActions(zone)}
          </li>
        ))}
      </ul>
    </>
  );
}
