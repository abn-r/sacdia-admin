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
import { deleteFinance, type Finance } from "@/lib/api/finances";

function formatAmount(cents: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

interface DeleteTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finance: Finance | null;
  onSuccess: () => void;
}

export function DeleteTransactionDialog({
  open,
  onOpenChange,
  finance,
  onSuccess,
}: DeleteTransactionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!finance) return;
    setIsDeleting(true);
    try {
      await deleteFinance(finance.finance_id);
      toast.success("Movimiento eliminado correctamente");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("No se pudo eliminar el movimiento");
    } finally {
      setIsDeleting(false);
    }
  }

  const isIncome = finance?.finances_categories?.type === 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
          <AlertDialogDescription>
            {finance ? (
              <>
                Estás por eliminar el movimiento de{" "}
                <strong className={isIncome ? "text-success" : "text-destructive"}>
                  {formatAmount(Math.abs(finance.amount))}
                </strong>
                {finance.description ? ` — ${finance.description}` : ""}.{" "}
                Esta acción no se puede deshacer.
              </>
            ) : (
              "Esta acción no se puede deshacer."
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
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
