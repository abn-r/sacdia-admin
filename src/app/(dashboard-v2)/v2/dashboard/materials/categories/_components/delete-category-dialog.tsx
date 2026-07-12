"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { deleteCategory } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";
import type { MaterialCategoryAdmin } from "@/lib/types/materials";

interface DeleteCategoryDialogProps {
  categoria: MaterialCategoryAdmin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteCategoryDialog({
  categoria,
  open,
  onOpenChange,
}: DeleteCategoryDialogProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function confirm() {
    if (!categoria) return;
    setBusy(true);
    try {
      await deleteCategory(categoria.id);
      toast.success("Categoría desactivada.");
      onOpenChange(false);
      startTransition(() => router.refresh());
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          "No se puede eliminar: la categoría tiene productos asociados.",
        );
      } else {
        toast.error(
          err instanceof ApiError ? err.message : "Error al eliminar.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a desactivar &quot;{categoria?.label}&quot;. Si la categoría
            tiene productos asociados la operación fallará — debés reasignar o
            eliminar esos productos primero.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              confirm();
            }}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
