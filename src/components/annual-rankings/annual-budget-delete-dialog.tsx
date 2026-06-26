"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { deactivateAnnualRankingConfig } from "@/lib/api/annual-rankings";
import type { AnnualRankingConfig } from "@/lib/api/annual-rankings";

interface AnnualBudgetDeleteDialogProps {
  config: AnnualRankingConfig | null;
  scopeLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function AnnualBudgetDeleteDialog({
  config,
  scopeLabel,
  open,
  onOpenChange,
  onDeleted,
}: AnnualBudgetDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!config) return;

    setLoading(true);
    try {
      await deactivateAnnualRankingConfig(config.annual_ranking_config_id);
      toast.success("Configuración eliminada correctamente");
      onDeleted();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <AlertTriangle className="size-5 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>¿Eliminar configuración?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar la configuración de presupuesto para{" "}
            <strong className="text-foreground">{scopeLabel}</strong>. El
            registro dejará de estar disponible, pero no se borrará el historial
            de forma permanente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Eliminar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
