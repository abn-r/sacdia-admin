"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import type { ScoringCategory } from "@/lib/api/scoring-categories";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScoringCategoryDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ScoringCategory | null;
  /** Async function that performs the delete. */
  onDelete: (id: number) => Promise<void>;
  onSuccess: (id: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoringCategoryDeleteDialog({
  open,
  onOpenChange,
  category,
  onDelete,
  onSuccess,
}: ScoringCategoryDeleteDialogProps) {
  const t = useTranslations("scoring_categories");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!category) return;
    setIsDeleting(true);
    try {
      await onDelete(category.scoring_category_id);
      toast.success(t("toasts.deleted"));
      onSuccess(category.scoring_category_id);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.delete_failed");
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro que querés eliminar la categoría{" "}
            <strong>&quot;{category?.name}&quot;</strong>? Esta acción la desactivará y no
            podrá usarse en nuevos registros. Los registros históricos se
            conservarán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Eliminar"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
