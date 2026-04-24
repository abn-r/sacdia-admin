"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { evaluateSection } from "@/lib/api/annual-folders";
import { ApiError } from "@/lib/api/client";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EvaluateSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  sectionId: string;
  sectionName: string;
  maxPoints: number;
  currentPoints?: number | null;
  currentNotes?: string | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EvaluateSectionDialog({
  open,
  onOpenChange,
  folderId,
  sectionId,
  sectionName,
  maxPoints,
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
        err instanceof ApiError ? err.message : "No se pudo guardar la evaluación";
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Evaluar sección</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {sectionName}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
