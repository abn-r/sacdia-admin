"use client";

import { useState } from "react";
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
import { deleteInvestitureConfig, type InvestitureConfig } from "@/lib/api/investiture";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeleteConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: InvestitureConfig | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeleteConfigDialog({
  open,
  onOpenChange,
  config,
  onSuccess,
}: DeleteConfigDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!config) return;
    setIsDeleting(true);
    try {
      await deleteInvestitureConfig(config.investiture_config_id);
      toast.success("Configuración desactivada correctamente");
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo desactivar la configuración";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const localFieldName = config?.local_fields?.name ?? `Campo #${config?.local_field_id}`;
  const yearName =
    config?.ecclesiastical_years?.name ?? `Año #${config?.ecclesiastical_year_id}`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desactivar configuración?</AlertDialogTitle>
          <AlertDialogDescription>
            {config ? (
              <>
                Estás por desactivar la configuración de investidura de{" "}
                <strong className="text-foreground">{localFieldName}</strong> para el año{" "}
                <strong className="text-foreground">{yearName}</strong>. Los envíos pendientes
                vinculados a esta configuración no se verán afectados, pero no se podrán
                registrar nuevos envíos.
              </>
            ) : (
              "Esta acción desactivará la configuración."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            Desactivar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
