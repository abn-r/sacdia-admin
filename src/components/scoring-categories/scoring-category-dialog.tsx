"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TranslationsTabsField } from "@/components/forms/translations-tabs-field";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";
import type {
  ScoringCategory,
  CreateScoringCategoryPayload,
  UpdateScoringCategoryPayload,
} from "@/lib/api/scoring-categories";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScoringCategoryDialogProps {
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
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoringCategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
  onSave,
}: ScoringCategoryDialogProps) {
  const t = useTranslations("scoring_categories");
  const isEdit = Boolean(category);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [maxPoints, setMaxPoints] = useState(1);
  const [translations, setTranslations] = useState<CatalogTranslation[]>([]);

  // Sync form state when category changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setMaxPoints(category?.max_points ?? 1);
      setTranslations(category?.translations ?? []);
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

    const nonEmptyTranslations = translations.filter(
      (tr) => Boolean(tr.name) || Boolean(tr.description),
    );

    setIsSubmitting(true);
    try {
      const saved = await onSave(
        {
          name: trimmedName,
          max_points: maxPoints,
          ...(nonEmptyTranslations.length > 0
            ? { translations: nonEmptyTranslations }
            : { translations: [] }),
        },
        category?.scoring_category_id,
      );
      toast.success(
        isEdit ? "Categoría actualizada" : "Categoría creada",
      );
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
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Puntos Máximos — always visible above tabs */}
          <div className="space-y-1.5">
            <Label htmlFor="sc_max_points">
              Puntos máximos <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="sc_max_points"
              type="number"
              min={1}
              value={maxPoints}
              onChange={(e) => setMaxPoints(Number(e.target.value))}
              required
              disabled={isSubmitting}
            />
            <p className="text-[11px] text-muted-foreground">
              Techo de puntos por sesión para esta categoría.
            </p>
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
                  <Loader2 className="mr-2 size-4 animate-spin" />
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
