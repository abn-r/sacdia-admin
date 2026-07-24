"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PlusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CamporeeClubsPanel } from "@/components/camporees/camporee-clubs-panel";
import { EnrollClubDialog } from "@/components/camporees/enroll-club-dialog";
import { getEnrolledClubs, getUnionEnrolledClubs } from "@/lib/api/camporees";
import type { CamporeeClub } from "@/lib/api/camporees";
import {
  enrichCamporeeClubsWithRegistrarProfiles,
  normalizeCamporeeClubs,
} from "@/lib/camporees/club-display";

export interface CamporeeClubsTabProps {
  camporeeId: number;
  initialClubs: CamporeeClub[];
  isUnionCamporee?: boolean;
  /** Local field of the camporee — used to scope club selection in the enroll dialog. */
  localFieldId?: number | null;
  /** Section eligibility flags inherited from the camporee. */
  includesAdventurers?: boolean;
  includesPathfinders?: boolean;
  includesMasterGuides?: boolean;
  onAfterChange?: () => void;
}

export function CamporeeClubsTab({
  camporeeId,
  initialClubs,
  isUnionCamporee = false,
  localFieldId,
  includesAdventurers = false,
  includesPathfinders = false,
  includesMasterGuides = false,
  onAfterChange,
}: CamporeeClubsTabProps) {
  const t = useTranslations("camporees.clubsTab");
  const [clubs, setClubs] = useState<CamporeeClub[]>(
    normalizeCamporeeClubs(initialClubs),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const normalized = normalizeCamporeeClubs(initialClubs);
      const enriched = await enrichCamporeeClubsWithRegistrarProfiles(normalized);
      if (!cancelled) setClubs(enriched);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialClubs]);

  const refreshClubs = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const payload = isUnionCamporee
        ? await getUnionEnrolledClubs(camporeeId)
        : await getEnrolledClubs(camporeeId);
      const normalized = normalizeCamporeeClubs(payload);
      const enriched = await enrichCamporeeClubsWithRegistrarProfiles(normalized);
      setClubs(enriched);
      onAfterChange?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("loadFailed");
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [camporeeId, isUnionCamporee, onAfterChange, t]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{clubs.length}</span>{" "}
          {clubs.length === 1 ? t("countSingular") : t("countPlural")}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refreshClubs}
            disabled={isLoading}
            title={t("refreshListTitle")}
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">{t("refreshLabel")}</span>
          </Button>
          <Button size="sm" onClick={() => setEnrollOpen(true)}>
            <PlusCircle className="size-4" />
            {t("enrollClub")}
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <CamporeeClubsPanel
        camporeeId={camporeeId}
        clubs={clubs}
        onClubsChange={refreshClubs}
        isUnionCamporee={isUnionCamporee}
      />

      <EnrollClubDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        camporeeId={camporeeId}
        isUnionCamporee={isUnionCamporee}
        localFieldId={localFieldId}
        includesAdventurers={includesAdventurers}
        includesPathfinders={includesPathfinders}
        includesMasterGuides={includesMasterGuides}
        onSuccess={refreshClubs}
      />
    </div>
  );
}
