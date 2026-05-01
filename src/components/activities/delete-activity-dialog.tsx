"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";
import { deleteActivity } from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";

interface DeleteActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null;
  onSuccess: () => void;
}

export function DeleteActivityDialog({
  open,
  onOpenChange,
  activity,
  onSuccess,
}: DeleteActivityDialogProps) {
  const t = useTranslations("activities");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!activity) return;
    setIsDeleting(true);
    try {
      await deleteActivity(activity.activity_id);
      toast.success(t("toasts.deleted"));
      onSuccess();
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
          <AlertDialogTitle>¿Eliminar actividad?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás por eliminar{" "}
            <span className="font-medium text-foreground">
              &ldquo;{activity?.name}&rdquo;
            </span>
            . Esta acción desactivará la actividad. ¿Deseas continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
