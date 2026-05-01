"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { deleteCamporee } from "@/lib/api/camporees";
import type { Camporee } from "@/lib/api/camporees";

interface DeleteCamporeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camporee: Camporee | null;
  /** If provided, redirects to this path after successful deletion */
  redirectTo?: string;
  onSuccess?: () => void;
}

export function DeleteCamporeeDialog({
  open,
  onOpenChange,
  camporee,
  redirectTo,
  onSuccess,
}: DeleteCamporeeDialogProps) {
  const t = useTranslations("camporees");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!camporee) return;
    const id = camporee.camporee_id ?? camporee.id ?? 0;
    if (!id) return;

    setIsDeleting(true);
    try {
      await deleteCamporee(id);
      toast.success(t("toasts.camporee_deleted"));
      onOpenChange(false);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        onSuccess?.();
        router.refresh();
      }
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
          <AlertDialogTitle>¿Eliminar camporee?</AlertDialogTitle>
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
