"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, PlusCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CamporeeClubsPanel } from "@/components/camporees/camporee-clubs-panel";
import { EnrollClubDialog } from "@/components/camporees/enroll-club-dialog";
import { getEnrolledClubs, getUnionEnrolledClubs } from "@/lib/api/camporees";
import {
  closeCamporeeClubRegistrationAction,
  reopenCamporeeClubRegistrationAction,
} from "@/lib/camporees/actions";
import type { CamporeeClub } from "@/lib/api/camporees";

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
  clubRegistrationClosedAt?: string | null;
  canManageClubRegistration?: boolean;
  onAfterChange?: () => void;
}

type ClosureDialog = "close" | "reopen" | null;

function formatClosedAt(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CamporeeClubsTab({
  camporeeId,
  initialClubs,
  isUnionCamporee = false,
  localFieldId,
  includesAdventurers = false,
  includesPathfinders = false,
  includesMasterGuides = false,
  clubRegistrationClosedAt = null,
  canManageClubRegistration = false,
  onAfterChange,
}: CamporeeClubsTabProps) {
  const router = useRouter();
  const [clubs, setClubs] = useState<CamporeeClub[]>(initialClubs);
  const [closedAt, setClosedAt] = useState<string | null>(clubRegistrationClosedAt);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [closureDialog, setClosureDialog] = useState<ClosureDialog>(null);
  const [isClosurePending, startClosureTransition] = useTransition();

  const isClosed = Boolean(closedAt);
  const canCloseRegistration = clubs.length > 0;

  useEffect(() => {
    setClosedAt(clubRegistrationClosedAt);
  }, [clubRegistrationClosedAt]);

  const refreshClubs = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const payload = isUnionCamporee
        ? await getUnionEnrolledClubs(camporeeId)
        : await getEnrolledClubs(camporeeId);
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
  }, [camporeeId, isUnionCamporee, onAfterChange]);

  function submitClosureAction(next: Exclude<ClosureDialog, null>) {
    startClosureTransition(async () => {
      const formData = new FormData();
      formData.set("camporee_id", String(camporeeId));
      formData.set("is_union", String(isUnionCamporee));

      const result =
        next === "close"
          ? await closeCamporeeClubRegistrationAction({}, formData)
          : await reopenCamporeeClubRegistrationAction({}, formData);

      if (result.error) {
        toast.error(result.error);
        setClosureDialog(null);
        return;
      }

      toast.success(result.success ?? "Estado de inscripción actualizado.");
      setClosedAt(next === "close" ? new Date().toISOString() : null);
      setClosureDialog(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{clubs.length}</span>{" "}
            {clubs.length === 1 ? "club inscrito" : "clubes inscritos"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isClosed
              ? `Inscripción de clubes cerrada${formatClosedAt(closedAt) ? ` · ${formatClosedAt(closedAt)}` : ""}. Las secciones participantes quedaron congeladas para scoring.`
              : "Inscripción de clubes abierta. Cerrala antes de configurar o capturar scoring."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageClubRegistration && (
            <Button
              type="button"
              variant={isClosed ? "outline" : "secondary"}
              size="sm"
              disabled={isClosurePending || (!isClosed && !canCloseRegistration)}
              onClick={() => setClosureDialog(isClosed ? "reopen" : "close")}
            >
              {isClosed ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
              {isClosed ? "Reabrir inscripción" : "Cerrar inscripción"}
            </Button>
          )}
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
          <Button size="sm" onClick={() => setEnrollOpen(true)} disabled={isClosed}>
            <PlusCircle className="size-4" />
            Inscribir club
          </Button>
        </div>
      </div>

      {isClosed && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          Inscripción de clubes cerrada: las secciones participantes están congeladas para scoring.
          Reabrila sólo si necesitás corregir la lista de clubes.
        </div>
      )}
      {!isClosed && canManageClubRegistration && !canCloseRegistration && (
        <div className="rounded-lg border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Inscribí al menos un club antes de cerrar la inscripción de clubes.
        </div>
      )}

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
        clubRegistrationClosed={isClosed}
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

      <AlertDialog
        open={closureDialog !== null}
        onOpenChange={(open) => {
          if (!open) setClosureDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {closureDialog === "reopen"
                ? "¿Reabrir inscripción de clubes?"
                : "¿Cerrar inscripción de clubes?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {closureDialog === "reopen"
                ? "Esto permitirá volver a modificar clubes inscritos. Scoring quedará sujeto a la nueva lista cuando vuelvas a cerrar."
                : "Esto congela las secciones participantes para configurar jueces, rúbricas y puntajes. La inscripción de miembros no se ve afectada."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosurePending}>Volver</AlertDialogCancel>
            <Button
              type="button"
              disabled={isClosurePending || !closureDialog}
              onClick={() => closureDialog && submitClosureAction(closureDialog)}
            >
              {closureDialog === "reopen" ? "Reabrir" : "Cerrar inscripción"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
