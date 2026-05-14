"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cancelarOrden } from "@/lib/api/materiales";
import { ApiError } from "@/lib/api/client";
import type { MaterialEstado } from "@/lib/types/materiales";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CancelDialogProps {
  folio: string;
  estado: MaterialEstado;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CancelDialog({ folio, estado }: CancelDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const isStockAffected = estado === "aprobada" || estado === "pagada";

  async function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("El motivo de cancelación es obligatorio.");
      return;
    }

    try {
      await cancelarOrden(folio, trimmed);
      toast.success("Solicitud cancelada.");
      setOpen(false);
      setReason("");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Error al cancelar la solicitud.";
      toast.error(message);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        <XCircle className="mr-1.5 size-4" />
        Cancelar pedido
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta solicitud?</AlertDialogTitle>
            <AlertDialogDescription>
              {isStockAffected
                ? "El stock reservado para esta solicitud será restaurado automáticamente."
                : "La solicitud quedará cancelada. Esta acción no se puede deshacer."}{" "}
              Ingresá el motivo de cancelación.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Textarea
            placeholder="Motivo de cancelación (obligatorio)"
            maxLength={500}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
            className="resize-none"
          />

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Volver
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending || reason.trim().length === 0}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                "Confirmar cancelación"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
