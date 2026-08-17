"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  assignDistrictToCoordinationZone,
  createCoordinationZone,
  extractCoordinationConflictReason,
  removeDistrictFromCoordinationZone,
  updateCoordinationZone,
  type CoordinationZone,
} from "@/lib/api/coordination";
import type { AdminDistrict } from "@/lib/catalogs/districts/types";
import { coordinationErrorMessage } from "@/components/coordination/coordination-labels";

type CoordinationZonesPanelProps = {
  localFieldId: number;
  zones: CoordinationZone[];
  districts: AdminDistrict[];
  onChanged: () => Promise<void>;
};

function activeDistrictIds(zones: CoordinationZone[]): Set<number> {
  const ids = new Set<number>();
  for (const zone of zones) {
    for (const membership of zone.districts ?? []) {
      if (membership.active) ids.add(membership.districlub_type_id);
    }
  }
  return ids;
}

export function CoordinationZonesPanel({
  localFieldId,
  zones,
  districts,
  onChanged,
}: CoordinationZonesPanelProps) {
  const t = useTranslations("coordinationAdmin");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [districtByZone, setDistrictByZone] = useState<Record<number, string>>(
    {},
  );

  const takenDistrictIds = useMemo(() => activeDistrictIds(zones), [zones]);
  const availableDistricts = districts.filter(
    (district) => district.active && !takenDistrictIds.has(district.district_id),
  );

  function toastFromError(error: unknown) {
    toast.error(
      coordinationErrorMessage(
        extractCoordinationConflictReason(error),
        getActionErrorMessage(error, t("errors.generic")),
        t as unknown as (key: string) => string,
      ),
    );
  }

  async function handleCreateZone() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error(t("errors.zoneNameRequired"));
      return;
    }

    setCreating(true);
    try {
      await createCoordinationZone(localFieldId, {
        name: trimmed,
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      toast.success(t("success.zoneCreated"));
      await onChanged();
    } catch (error) {
      toastFromError(error);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleZone(zone: CoordinationZone) {
    const key = `zone-${zone.zone_id}`;
    setPendingKey(key);
    try {
      await updateCoordinationZone(zone.zone_id, { active: !zone.active });
      toast.success(
        zone.active ? t("success.zoneDeactivated") : t("success.zoneActivated"),
      );
      await onChanged();
    } catch (error) {
      toastFromError(error);
    } finally {
      setPendingKey(null);
    }
  }

  async function handleAssignDistrict(zoneId: number) {
    const districtId = Number(districtByZone[zoneId]);
    if (!Number.isFinite(districtId) || districtId <= 0) {
      toast.error(t("errors.zoneAndDistrictRequired"));
      return;
    }

    const key = `assign-${zoneId}`;
    setPendingKey(key);
    try {
      await assignDistrictToCoordinationZone(zoneId, districtId);
      setDistrictByZone((current) => ({ ...current, [zoneId]: "" }));
      toast.success(t("success.districtAssigned"));
      await onChanged();
    } catch (error) {
      toastFromError(error);
    } finally {
      setPendingKey(null);
    }
  }

  async function handleRemoveDistrict(zoneId: number, districtId: number) {
    const key = `remove-${zoneId}-${districtId}`;
    setPendingKey(key);
    try {
      await removeDistrictFromCoordinationZone(zoneId, districtId);
      toast.success(t("success.districtRemoved"));
      await onChanged();
    } catch (error) {
      toastFromError(error);
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("zones.title")}</CardTitle>
        <CardDescription>{t("zones.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="zone-name">{t("fields.name")}</Label>
            <Input
              id="zone-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("zones.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zone-description">{t("fields.description")}</Label>
            <Textarea
              id="zone-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("zones.descriptionPlaceholder")}
              className="min-h-9 py-2"
            />
          </div>
          <Button onClick={handleCreateZone} disabled={creating}>
            <Plus className="size-4" />
            {t("actions.createZone")}
          </Button>
        </div>

        {zones.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title={t("zones.empty")}
            description={t("zones.description")}
          />
        ) : (
          <div className="space-y-4">
            {zones.map((zone) => {
              const memberships = (zone.districts ?? []).filter(
                (membership) => membership.active,
              );
              return (
                <div
                  key={zone.zone_id}
                  className="space-y-3 rounded-xl border border-border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{zone.name}</p>
                        <StatusBadge
                          intent={zone.active ? "success" : "neutral"}
                          label={
                            zone.active ? t("status.active") : t("status.inactive")
                          }
                        />
                      </div>
                      {zone.description ? (
                        <p className="text-muted-foreground text-sm">
                          {zone.description}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingKey === `zone-${zone.zone_id}`}
                      onClick={() => handleToggleZone(zone)}
                    >
                      {zone.active
                        ? t("actions.deactivate")
                        : t("actions.activate")}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {memberships.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {t("zones.noDistricts")}
                      </p>
                    ) : (
                      memberships.map((membership) => (
                        <Button
                          key={membership.zone_district_id}
                          type="button"
                          variant="secondary"
                          size="xs"
                          disabled={
                            pendingKey ===
                            `remove-${zone.zone_id}-${membership.districlub_type_id}`
                          }
                          onClick={() =>
                            handleRemoveDistrict(
                              zone.zone_id,
                              membership.districlub_type_id,
                            )
                          }
                        >
                          {membership.districts?.name ??
                            `#${membership.districlub_type_id}`}
                          <span className="text-muted-foreground">×</span>
                        </Button>
                      ))
                    )}
                  </div>

                  {zone.active ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Label>{t("fields.district")}</Label>
                        <Select
                          value={districtByZone[zone.zone_id] || undefined}
                          onValueChange={(value) =>
                            setDistrictByZone((current) => ({
                              ...current,
                              [zone.zone_id]: value,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
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
                      </div>
                      <Button
                        variant="outline"
                        disabled={pendingKey === `assign-${zone.zone_id}`}
                        onClick={() => handleAssignDistrict(zone.zone_id)}
                      >
                        {t("actions.assignDistrict")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
