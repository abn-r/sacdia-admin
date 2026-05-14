"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
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
import { aprobarComprobante, rechazarComprobante } from "@/lib/api/materiales";
import { ApiError } from "@/lib/api/client";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ComprobanteReviewActionsProps {
  folio: string;
  comprobanteId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ComprobanteReviewActions({
  folio,
  comprobanteId,
}: ComprobanteReviewActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Approve dialog state
  const [approveOpen, setApproveOpen] = useState(false);

  // Reject dialog state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // ─── Approve ────────────────────────────────────────────────────────────────

  async function handleApprove() {
    try {
      await aprobarComprobante(folio, comprobanteId);
      toast.success("Comprobante aprobado. Solicitud marcada como pagada.");
      setApproveOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Error al aprobar el comprobante.";
      toast.error(message);
    }
  }

  // ─── Reject ─────────────────────────────────────────────────────────────────

  async function handleReject() {
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      toast.error("El motivo de rechazo es obligatorio.");
      return;
    }
    try {
      await rechazarComprobante(folio, comprobanteId, trimmed);
      toast.success("Comprobante rechazado.");
      setRejectOpen(false);
      setRejectReason("");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Error al rechazar el comprobante.";
      toast.error(message);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="xs"
          disabled={isPending}
          onClick={() => setApproveOpen(true)}
        >
          <CheckCircle className="mr-1 size-3.5" />
          Aprobar
        </Button>
        <Button
          variant="destructive"
          size="xs"
          disabled={isPending}
          onClick={() => setRejectOpen(true)}
        >
          <XCircle className="mr-1 size-3.5" />
          Rechazar
        </Button>
      </div>

      {/* Approve confirmation */}
      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aprobar comprobante?</AlertDialogTitle>
            <AlertDialogDescription>
              La solicitud pasará al estado <strong>Pagada</strong>. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="default" onClick={handleApprove} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Aprobando...
                </>
              ) : (
                "Confirmar"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog with reason */}
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar comprobante</AlertDialogTitle>
            <AlertDialogDescription>
              El director podrá subir un nuevo comprobante. Ingresá el motivo
              de rechazo.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Textarea
            placeholder="Motivo de rechazo (obligatorio)"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={isPending}
            className="resize-none"
          />

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Volver
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending || rejectReason.trim().length === 0}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Rechazando...
                </>
              ) : (
                "Confirmar rechazo"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
