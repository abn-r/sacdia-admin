"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { deleteFolder } from "@/lib/api/folders";
import { ApiError } from "@/lib/api/client";
import type { FolderTemplate } from "@/lib/api/folders";

// ─── Props ────────────────────────────────────────────────────────────────────

interface FolderDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderTemplate | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FolderDeleteDialog({
  open,
  onOpenChange,
  folder,
  onSuccess,
}: FolderDeleteDialogProps) {
  const t = useTranslations("folders");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!folder) return;
    setIsDeleting(true);
    try {
      await deleteFolder(folder.folder_id);
      toast.success(t("toasts.deleted"));
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar la carpeta";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar carpeta de evidencias</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente la carpeta{" "}
            <strong>{folder?.name}</strong>. Los módulos y secciones asociados
            también serán eliminados. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? "Eliminando..." : "Eliminar carpeta"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
