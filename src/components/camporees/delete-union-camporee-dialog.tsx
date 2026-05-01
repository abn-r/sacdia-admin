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
import { deleteUnionCamporee } from "@/lib/api/camporees";
import type { UnionCamporee } from "@/lib/api/camporees";

interface DeleteUnionCamporeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camporee: UnionCamporee | null;
  onSuccess?: () => void;
}

export function DeleteUnionCamporeeDialog({
  open,
  onOpenChange,
  camporee,
  onSuccess,
}: DeleteUnionCamporeeDialogProps) {
  const t = useTranslations("camporees");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!camporee) return;
    const id = camporee.union_camporee_id ?? camporee.id ?? 0;
    if (!id) return;

    setIsDeleting(true);
    try {
      await deleteUnionCamporee(id);
      toast.success(t("toasts.union_camporee_deleted"));
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.delete_camporee");
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar camporee de unión</AlertDialogTitle>
          <AlertDialogDescription>
            Estás por eliminar{" "}
            <span className="font-medium text-foreground">
              &ldquo;{camporee?.name}&rdquo;
            </span>
            . Esta acción desactivará el camporee. ¿Deseas continuar?
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
