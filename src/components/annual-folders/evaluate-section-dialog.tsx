"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Eye, FileText, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { evaluateSection } from "@/lib/api/annual-folders";
import { ApiError } from "@/lib/api/client";
import type { FolderEvidence } from "@/lib/api/annual-folders";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EvaluateSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  sectionId: string;
  sectionName: string;
  maxPoints: number;
  evidences?: FolderEvidence[];
  onPreviewEvidence?: (
    evidence: FolderEvidence,
    evidences: FolderEvidence[],
  ) => void;
  currentPoints?: number | null;
  currentNotes?: string | null;
  onSuccess: () => void;
}

function formatEvidenceDate(evidence: FolderEvidence): string {
  const dateString = evidence.uploaded_at ?? evidence.created_at;
  if (!dateString) return "Fecha no disponible";

  return new Date(dateString).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EvaluateSectionDialog({
  open,
  onOpenChange,
  folderId,
  sectionId,
  sectionName,
  maxPoints,
  evidences = [],
  onPreviewEvidence,
  currentPoints,
  currentNotes,
  onSuccess,
}: EvaluateSectionDialogProps) {
  const t = useTranslations("annual_folders");
  const [earnedPoints, setEarnedPoints] = useState("");
  const [notes, setNotes] = useState("");
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form values when dialog opens or current values change
  useEffect(() => {
    if (open) {
      setEarnedPoints(currentPoints != null ? String(currentPoints) : "");
      setNotes(currentNotes ?? "");
      setPointsError(null);
    }
  }, [open, currentPoints, currentNotes]);

  function handlePointsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setEarnedPoints(value);

    const num = Number(value);
    if (value.trim() === "") {
      setPointsError("Los puntos obtenidos son requeridos");
    } else if (!Number.isFinite(num) || !Number.isInteger(num)) {
      setPointsError("Debe ser un número entero");
    } else if (num < 0) {
      setPointsError("No puede ser menor a 0");
    } else if (num > maxPoints) {
      setPointsError(`No puede superar el máximo de ${maxPoints} puntos`);
    } else {
      setPointsError(null);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setPointsError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const num = Number(earnedPoints);
    if (
      earnedPoints.trim() === "" ||
      !Number.isFinite(num) ||
      num < 0 ||
      num > maxPoints
    ) {
      setPointsError(
        earnedPoints.trim() === ""
          ? "Los puntos obtenidos son requeridos"
          : `Valor inválido — debe estar entre 0 y ${maxPoints}`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await evaluateSection(folderId, sectionId, {
        earned_points: num,
        notes: notes.trim() || undefined,
      });
      toast.success(t("toasts.section_evaluated"));
      handleOpenChange(false);
      onSuccess();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t("errors.save_evaluation_failed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isValid =
    earnedPoints.trim() !== "" &&
    pointsError === null &&
    Number.isFinite(Number(earnedPoints));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Evaluar sección</DialogTitle>
          <DialogDescription>
            {sectionName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
          <div className="min-w-0 overflow-hidden rounded-lg border border-border">
            <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">Evidencias subidas</p>
                <p className="text-xs text-muted-foreground">
                  Revisá estos archivos antes de asignar puntos.
                </p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {evidences.length}
              </span>
            </div>

            {evidences.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <FileText className="size-4" />
                Esta sección no tiene evidencias cargadas.
              </div>
            ) : (
              <ScrollArea className="max-h-56">
                <div className="divide-y">
                  {evidences.map((evidence) => (
                    <div
                      key={evidence.evidence_id}
                      className="grid min-w-0 gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="line-clamp-2 break-all text-sm font-medium">
                          {evidence.file_name ?? "Evidencia sin nombre"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {evidence.uploaded_by ?? "Usuario no disponible"} ·{" "}
                          {formatEvidenceDate(evidence)}
                        </p>
                        {evidence.notes && (
                          <p className="flex gap-1 text-xs text-muted-foreground">
                            <MessageSquareText className="mt-0.5 size-3 shrink-0" />
                            <span className="min-w-0 break-words">
                              {evidence.notes}
                            </span>
                          </p>
                        )}
                        {evidence.reviewer_note && (
                          <p className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                            Nota de revisión: {evidence.reviewer_note}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => onPreviewEvidence?.(evidence, evidences)}
                      >
                        <Eye className="size-3.5" />
                        Ver
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Points input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="earned-points">Puntos obtenidos</Label>
              <span className="text-xs text-muted-foreground">
                Máximo: <span className="font-medium text-foreground">{maxPoints}</span> puntos
              </span>
            </div>
            <Input
              id="earned-points"
              type="number"
              min={0}
              max={maxPoints}
              step={1}
              value={earnedPoints}
              onChange={handlePointsChange}
              placeholder={`0 – ${maxPoints}`}
              className={pointsError ? "border-destructive focus-visible:ring-destructive" : ""}
              autoFocus
            />
            {pointsError && (
              <p className="text-xs text-destructive">{pointsError}</p>
            )}
          </div>

          {/* Notes textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="eval-notes">
              Observaciones{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="eval-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones..."
              rows={3}
              maxLength={500}
            />
            <p className="text-right text-xs text-muted-foreground">
              {notes.length}/500
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? "Guardando..." : "Guardar evaluación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
