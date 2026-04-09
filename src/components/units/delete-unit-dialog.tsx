"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteUnit } from "@/lib/api/units";
import type { Unit } from "@/lib/api/units";

interface DeleteUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  unit: Unit | null;
  onSuccess: () => void;
}

export function DeleteUnitDialog({
  open,
  onOpenChange,
  clubId,
  unit,
  onSuccess,
}: DeleteUnitDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!unit) return;
    setIsDeleting(true);
    try {
      await deleteUnit(clubId, unit.unit_id);
      toast.success("Unidad desactivada correctamente");
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo desactivar la unidad";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <AlertTriangle className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Desactivar unidad</AlertDialogTitle>
          <AlertDialogDescription>
            Estas por desactivar{" "}
            <span className="font-medium text-foreground">
              &ldquo;{unit?.name}&rdquo;
            </span>
            . La unidad y sus miembros quedaran inactivos. Puedes reactivarla editandola. ¿Deseas continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? "Desactivando..." : "Desactivar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
