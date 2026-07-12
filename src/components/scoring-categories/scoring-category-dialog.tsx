"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TranslationsTabsField } from "@/components/forms/translations-tabs-field";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";
import { DEFAULT_SCORING_CATEGORY_MAX_POINTS_CAP } from "@/lib/api/system-config";
import type {
  ScoringCategory,
  CreateScoringCategoryPayload,
  UpdateScoringCategoryPayload,
} from "@/lib/api/scoring-categories";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ScoringCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass an existing category to edit; omit to create. */
  category?: ScoringCategory | null;
  /** Called after successful create or update. Receives the saved category. */
  onSuccess: (category: ScoringCategory) => void;
  /** Action function called with the form payload. */
  onSave: (
    payload: CreateScoringCategoryPayload | UpdateScoringCategoryPayload,
    id?: number,
  ) => Promise<ScoringCategory>;
  /** Global max points cap enforced by system config. */
  maxPointsCap?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoringCategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
  onSave,
  maxPointsCap = DEFAULT_SCORING_CATEGORY_MAX_POINTS_CAP,
}: ScoringCategoryDialogProps) {
  const t = useTranslations("scoring_categories");
  const isEdit = Boolean(category);
  const resolvedMaxPointsCap =
    Number.isInteger(maxPointsCap) && maxPointsCap > 0
      ? maxPointsCap
      : DEFAULT_SCORING_CATEGORY_MAX_POINTS_CAP;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [maxPoints, setMaxPoints] = useState(1);
  const [scoringMode, setScoringMode] = useState<"numeric" | "boolean_full">(
    "numeric",
  );
  const [translations, setTranslations] = useState<CatalogTranslation[]>([]);
  // dirty = admin directly touched a non-es tab input; pre-populate does not set this
  const [translationsDirty, setTranslationsDirty] = useState(false);

  // Sync form state when category changes or dialog opens; reset dirty flag
  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setMaxPoints(category?.max_points ?? 1);
      setScoringMode(category?.scoring_mode ?? "numeric");
      setTranslations(category?.translations ?? []);
      setTranslationsDirty(false);
    }
  }, [open, category]);

  function handleClose(val: boolean) {
    if (!val && !isSubmitting) {
      onOpenChange(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(t("validation.name_required"));
      return;
    }
    if (trimmedName.length > 100) {
      toast.error(t("validation.name_max"));
      return;
    }
    if (!Number.isInteger(maxPoints) || maxPoints < 1) {
      toast.error(t("validation.points_invalid"));
      return;
    }
    if (maxPoints > resolvedMaxPointsCap) {
      toast.error(
        `Los puntos máximos no pueden superar ${resolvedMaxPointsCap}`,
      );
      return;
    }

    const nonEmptyTranslations = translations.filter(
      (tr) => Boolean(tr.name) || Boolean(tr.description),
    );

    // For UPDATE flows, only send translations when admin explicitly touched a
    // non-es tab. Omitting the key tells the backend to leave existing rows alone.
    // For CREATE flows always include it (empty array = no translations seeded).
    const translationsPayload: { translations?: CatalogTranslation[] } = {};
    if (!isEdit || translationsDirty) {
      translationsPayload.translations =
        nonEmptyTranslations.length > 0 ? nonEmptyTranslations : [];
    }

    setIsSubmitting(true);
    try {
      const saved = await onSave(
        {
          name: trimmedName,
          max_points: maxPoints,
          scoring_mode: scoringMode,
          ...translationsPayload,
        },
        category?.scoring_category_id,
      );
      toast.success(isEdit ? "Categoría actualizada" : "Categoría creada");
      onSuccess(saved);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.save_failed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar categoría" : "Nueva categoría de puntuación"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica el nombre, los puntos máximos y el tipo de captura de la categoría."
              : "Completa el formulario para crear una nueva categoría de puntuación."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Puntos Máximos — always visible above tabs */}
            <div className="space-y-1.5">
              <Label htmlFor="sc_max_points">
                Puntos máximos{" "}
                <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="sc_max_points"
                type="number"
                min={1}
                max={resolvedMaxPointsCap}
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value))}
                required
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-muted-foreground">
                Puntaje máximo permitido por el sistema: {resolvedMaxPointsCap}{" "}
                puntos por aspecto.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sc_scoring_mode">Tipo de captura</Label>
              <Select
                value={scoringMode}
                onValueChange={(value) =>
                  setScoringMode(value as "numeric" | "boolean_full")
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="sc_scoring_mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numeric">Numérico</SelectItem>
                  <SelectItem value="boolean_full">Todo o nada</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                “Todo o nada” solo permite 0 o el máximo.
              </p>
            </div>
          </div>

          {/* Translations tabs (es tab = name field, other tabs = translations) */}
          <TranslationsTabsField
            esContent={
              <div className="space-y-1.5">
                <Label htmlFor="sc_name">
                  Nombre <span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="sc_name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Uniforme"
                  maxLength={100}
                  required
                  disabled={isSubmitting}
                />
              </div>
            }
            translations={translations}
            onTranslationsChange={setTranslations}
            onDirtyChange={setTranslationsDirty}
            includeDescription={false}
            disabled={isSubmitting}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Guardando...
                </>
              ) : isEdit ? (
                "Guardar cambios"
              ) : (
                "Crear categoría"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
