"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  assignDistrictToCoordinationZone,
  extractCoordinationConflictReason,
  removeDistrictFromCoordinationZone,
  type CoordinationZone,
  type CoordinationZoneDistrict,
  type CoordinatorAssignment,
} from "@/lib/api/coordination";
import type { AdminDistrict } from "@/lib/catalogs/districts/types";
import {
  coordinationErrorMessage,
  formatCoordinatorName,
} from "@/components/coordination/coordination-labels";
import {
  activeZoneDistricts,
  districtLabel,
  zoneAssignments,
  zoneCoordinatorNames,
} from "@/lib/coordination/zone-view";

type CoordinationZoneSheetProps = {
  zone: CoordinationZone | null;
  assignments: CoordinatorAssignment[];
  /** Districts of the local field that no active zone has taken. */
  availableDistricts: AdminDistrict[];
  canManage: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
  /** Asks the parent to confirm activating / deactivating the zone. */
  onToggle: (zone: CoordinationZone) => void;
};

export function CoordinationZoneSheet({
  zone,
  assignments,
  availableDistricts,
  canManage,
  onClose,
  onChanged,
  onToggle,
}: CoordinationZoneSheetProps) {
  const t = useTranslations("coordinationAdmin");
  const tc = useTranslations("people.community.coordination");
  const format = useFormatter();
  const [districtId, setDistrictId] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<CoordinationZoneDistrict | null>(null);

  function messageFor(error: unknown): string {
    return coordinationErrorMessage(
      extractCoordinationConflictReason(error),
      getActionErrorMessage(error, t("errors.generic")),
      t as unknown as (key: string) => string,
    );
  }

  async function handleAdd() {
    if (!zone) return;
    const id = Number(districtId);
    if (!Number.isFinite(id) || id <= 0) {
      toast.error(t("errors.zoneAndDistrictRequired"));
      return;
    }
    setAdding(true);
    try {
      await assignDistrictToCoordinationZone(zone.zone_id, id);
      setDistrictId("");
      toast.success(t("success.districtAssigned"));
      await onChanged();
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove() {
    if (!zone || !removing) return;
    try {
      await removeDistrictFromCoordinationZone(zone.zone_id, removing.districlub_type_id);
    } catch (error) {
      // ConfirmDialog keeps itself open and shows the message inline.
      throw new Error(messageFor(error));
    }
    toast.success(t("success.districtRemoved"));
    await onChanged();
  }

  const memberships = zone ? activeZoneDistricts(zone) : [];
  const zoneRows = zone ? zoneAssignments(zone, assignments) : [];
  const affected = zone
    ? zoneCoordinatorNames(zone, assignments, (a) => formatCoordinatorName(a.users) || a.user_id)
    : [];
  const coordinatorCount = new Set(zoneRows.map((row) => row.user_id)).size;

  return (
    <>
      <Sheet open={zone !== null} onOpenChange={(next) => (next ? undefined : onClose())}>
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-md">
          {zone ? (
            <>
              <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-5 pr-14">
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle className="text-lg">{zone.name}</SheetTitle>
                  <ExceptionStatus
                    value={zone.active ? "active" : "inactive"}
                    normal={["active"]}
                    labels={{ active: t("status.active"), inactive: t("status.inactive") }}
                    intents={{ inactive: "neutral" }}
                  />
                </div>
                <SheetDescription>
                  {tc("zoneSheet.summary", {
                    districts: memberships.length,
                    coordinators: coordinatorCount,
                  })}
                  {zone.description ? ` · ${zone.description}` : ""}
                </SheetDescription>
              </SheetHeader>

              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <section aria-labelledby="zone-districts-heading" className="space-y-3">
                  <h3 id="zone-districts-heading" className="font-semibold text-sm">
                    {t("fields.districts")}
                  </h3>
                  {memberships.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("zones.noDistricts")}</p>
                  ) : (
                    <ul className="divide-y rounded-xl border bg-card">
                      {memberships.map((membership) => (
                        <li
                          key={membership.zone_district_id}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                        >
                          <span className="min-w-0 truncate">{districtLabel(membership)}</span>
                          {canManage ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              aria-label={tc("zoneSheet.removeAria", {
                                district: districtLabel(membership),
                                zone: zone.name,
                              })}
                              onClick={() => setRemoving(membership)}
                            >
                              {tc("actions.remove")}
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}

                  {canManage && zone.active ? (
                    <div className="space-y-2">
                      <Label htmlFor="zone-sheet-district">{tc("zoneSheet.addDistrict")}</Label>
                      <div className="flex gap-2">
                        <Select value={districtId || undefined} onValueChange={setDistrictId}>
                          <SelectTrigger id="zone-sheet-district" className="min-w-0 flex-1">
                            <SelectValue placeholder={t("fields.selectDistrict")} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDistricts.map((district) => (
                              <SelectItem
                                key={district.district_id}
                                value={String(district.district_id)}
                              >
                                {district.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          loading={adding}
                          disabled={!districtId}
                          onClick={() => void handleAdd()}
                        >
                          {tc("actions.add")}
                        </Button>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {availableDistricts.length === 0
                          ? tc("zoneSheet.noAvailableDistricts")
                          : tc("zoneSheet.addHint")}
                      </p>
                    </div>
                  ) : null}
                </section>

                <section aria-labelledby="zone-coordinators-heading" className="space-y-3">
                  <h3 id="zone-coordinators-heading" className="font-semibold text-sm">
                    {tc("zoneSheet.coordinators")}
                  </h3>
                  {zoneRows.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {tc("zoneSheet.noCoordinators")}
                    </p>
                  ) : (
                    <ul className="divide-y rounded-xl border bg-card">
                      {zoneRows.map((row) => (
                        <li
                          key={row.assignment_id}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                        >
                          <span className="min-w-0 truncate">
                            {formatCoordinatorName(row.users) || row.user_id}
                          </span>
                          {row.club_types?.name ? (
                            <span className="shrink-0 text-muted-foreground">
                              {row.club_types.name}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <SheetFooter className="shrink-0 flex-row items-center border-t px-6 py-4">
                {canManage ? (
                  <Button type="button" variant="outline" onClick={() => onToggle(zone)}>
                    {zone.active ? tc("actions.deactivateZone") : tc("actions.activateZone")}
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" className="ml-auto" onClick={onClose}>
                  {tc("actions.close")}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => (next ? undefined : setRemoving(null))}
        tone="destructive"
        title={tc("removeDistrict.title", {
          district: removing ? districtLabel(removing) : "",
          zone: zone?.name ?? "",
        })}
        description={
          affected.length > 0
            ? tc("removeDistrict.withCoordinators", {
                district: removing ? districtLabel(removing) : "",
                names: format.list(affected, { type: "conjunction" }),
                count: affected.length,
              })
            : tc("removeDistrict.withoutCoordinators")
        }
        confirmLabel={tc("removeDistrict.confirm")}
        onConfirm={handleRemove}
      />
    </>
  );
}
