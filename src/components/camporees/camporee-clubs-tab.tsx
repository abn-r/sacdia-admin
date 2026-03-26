"use client";

import { useState, useCallback } from "react";
import { PlusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CamporeeClubsPanel } from "@/components/camporees/camporee-clubs-panel";
import { EnrollClubDialog } from "@/components/camporees/enroll-club-dialog";
import { getEnrolledClubs } from "@/lib/api/camporees";
import type { CamporeeClub } from "@/lib/api/camporees";

interface CamporeeClubsTabProps {
  camporeeId: number;
  initialClubs: CamporeeClub[];
  isUnionCamporee?: boolean;
  onAfterChange?: () => void;
}

export function CamporeeClubsTab({
  camporeeId,
  initialClubs,
  isUnionCamporee = false,
  onAfterChange,
}: CamporeeClubsTabProps) {
  const [clubs, setClubs] = useState<CamporeeClub[]>(initialClubs);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const refreshClubs = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const payload = await getEnrolledClubs(camporeeId);
      const raw = payload as unknown;
      let list: CamporeeClub[] = [];
      if (Array.isArray(raw)) {
        list = raw as CamporeeClub[];
      } else if (raw && typeof raw === "object") {
        const r = raw as Record<string, unknown>;
        if (Array.isArray(r.data)) {
          list = r.data as CamporeeClub[];
        }
      }
      setClubs(list);
      onAfterChange?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la lista de clubes";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [camporeeId, onAfterChange]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{clubs.length}</span>{" "}
          {clubs.length === 1 ? "club inscrito" : "clubes inscritos"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={refreshClubs}
            disabled={isLoading}
            title="Actualizar lista"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="sr-only">Actualizar</span>
          </Button>
          <Button size="sm" onClick={() => setEnrollOpen(true)}>
            <PlusCircle className="mr-2 size-4" />
            Inscribir club
          </Button>
        </div>
      </div>

      {/* Error */}
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
        onSuccess={refreshClubs}
      />
    </div>
  );
}
