"use client";

import { getActionErrorMessage } from "@/lib/api/action-error";
import { useState } from "react";
import { useTranslations } from "next-intl";
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

export interface ScoringCategoryDeleteDialogProps {
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
        getActionErrorMessage(err, t("errors.delete_failed"), {
          endpointLabel: "/scoring-categories",
        });
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.rich("deleteDialog.description", {
              name: category?.name ?? "",
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t("deleteDialog.cancel")}</AlertDialogCancel>
          <Button
            loading={isDeleting}
            variant="destructive"
            onClick={handleConfirm}
          >
            {isDeleting ? t("deleteDialog.deleting") : t("deleteDialog.delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
