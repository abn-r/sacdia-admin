"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Landmark } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { getActionErrorMessage } from "@/lib/api/action-error";
import { listAdminClubTypes } from "@/lib/api/admin-club-types";
import { listAdminDistricts } from "@/lib/api/admin-districts";
import {
  listCoordinationZones,
  listCoordinatorAssignments,
  type CoordinationZone,
  type CoordinatorAssignment,
} from "@/lib/api/coordination";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";
import type { AdminDistrict } from "@/lib/catalogs/districts/types";
import type { LocalField } from "@/lib/api/geography";
import {
  canAdminFilterByLocalField,
  type AdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import { fetchClubsList, getClubListId } from "@/lib/clubs/fetch-list";
import { CoordinationZonesPanel } from "@/components/coordination/coordination-zones-panel";
import { CoordinationAssignmentsPanel } from "@/components/coordination/coordination-assignments-panel";
import { CoordinationBackfillDialog } from "@/components/coordination/coordination-backfill-dialog";

type CoordinationAdminClientProps = {
  localFields: LocalField[];
  territoryScope: AdminTerritoryScope;
};

export function CoordinationAdminClient({
  localFields,
  territoryScope,
}: CoordinationAdminClientProps) {
  const t = useTranslations("coordinationAdmin");
  const canPickLocalField = canAdminFilterByLocalField(territoryScope);
  const defaultLocalFieldId =
    territoryScope.level === "local_field"
      ? territoryScope.localFieldId
      : localFields[0]?.local_field_id;

  const [localFieldId, setLocalFieldId] = useState<number | undefined>(
    defaultLocalFieldId,
  );
  const [zones, setZones] = useState<CoordinationZone[]>([]);
  const [assignments, setAssignments] = useState<CoordinatorAssignment[]>([]);
  const [districts, setDistricts] = useState<AdminDistrict[]>([]);
  const [clubTypes, setClubTypes] = useState<AdminClubType[]>([]);
  const [clubs, setClubs] = useState<Array<{ club_id: number; name: string }>>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedField = useMemo(
    () =>
      localFields.find((field) => field.local_field_id === localFieldId) ?? null,
    [localFieldId, localFields],
  );

  const refresh = useCallback(async () => {
    if (!localFieldId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [nextZones, nextAssignments, nextDistricts, nextClubTypes, clubsResult] =
        await Promise.all([
          listCoordinationZones(localFieldId),
          listCoordinatorAssignments(localFieldId),
          listAdminDistricts({ localFieldId }),
          listAdminClubTypes(),
          fetchClubsList({
            page: 1,
            limit: 100,
            active: true,
            localFieldId,
          }),
        ]);

      setZones(Array.isArray(nextZones) ? nextZones : []);
      setAssignments(Array.isArray(nextAssignments) ? nextAssignments : []);
      setDistricts(nextDistricts);
      setClubTypes(nextClubTypes);
      setClubs(
        clubsResult.items
          .map((club) => {
            const clubId = getClubListId(club);
            if (!clubId || !club.name) return null;
            return { club_id: clubId, name: club.name };
          })
          .filter((club): club is { club_id: number; name: string } =>
            Boolean(club),
          ),
      );
    } catch (error) {
      const message = getActionErrorMessage(error, t("errors.generic"));
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [localFieldId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (localFields.length === 0 || !localFieldId) {
    return (
      <EmptyState
        icon={Landmark}
        title={t("emptyNoLocalField.title")}
        description={t("emptyNoLocalField.description")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md space-y-2">
          <Label>{t("localField.title")}</Label>
          <p className="text-muted-foreground text-sm">
            {t("localField.description")}
          </p>
          {canPickLocalField ? (
            <Select
              value={String(localFieldId)}
              onValueChange={(value) => setLocalFieldId(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("localField.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {localFields.map((field) => (
                  <SelectItem
                    key={field.local_field_id}
                    value={String(field.local_field_id)}
                  >
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="font-medium text-foreground">
              {selectedField?.name ?? `Campo local #${localFieldId}`}
            </p>
          )}
        </div>
        <CoordinationBackfillDialog
          localFieldId={localFieldId}
          onApplied={refresh}
        />
      </div>

      {loadError ? (
        <EndpointErrorBanner state="missing" detail={loadError} />
      ) : null}

      {loading && zones.length === 0 && assignments.length === 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <CoordinationZonesPanel
            localFieldId={localFieldId}
            zones={zones}
            districts={districts}
            onChanged={refresh}
          />
          <CoordinationAssignmentsPanel
            localFieldId={localFieldId}
            zones={zones}
            clubTypes={clubTypes}
            clubs={clubs}
            assignments={assignments}
            onChanged={refresh}
          />
        </div>
      )}
    </div>
  );
}
