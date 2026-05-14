"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cancelOrder } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";

// ─── Validation ───────────────────────────────────────────────────────────────

const reasonSchema = z
  .string()
  .trim()
  .min(10, "El motivo debe tener al menos 10 caracteres.");

// ─── Props ────────────────────────────────────────────────────────────────────

interface CancelDialogProps {
  folio: string;
  /** Trigger element. Must be a single, focusable element. */
  children: ReactNode;
  /** Optional extra warning (post-pagada refund notice, etc.). */
  extraWarning?: ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CancelDialog({
  folio,
  children,
  extraWarning,
}: CancelDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const validation = reasonSchema.safeParse(reason);
  const isValid = validation.success;

  async function handleConfirm() {
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? "Motivo inválido.");
      return;
    }

    try {
      await cancelOrder(folio, validation.data);
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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar esta solicitud?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Ingresá el motivo de cancelación
            (mínimo 10 caracteres).
          </AlertDialogDescription>
        </AlertDialogHeader>

        {extraWarning && (
          <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
            {extraWarning}
          </div>
        )}

        <Textarea
          placeholder="Motivo de cancelación (obligatorio, mínimo 10 caracteres)"
          maxLength={500}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isPending}
          className="resize-none"
          aria-invalid={reason.length > 0 && !isValid}
        />
        <p className="text-xs text-muted-foreground">
          {reason.trim().length}/500 caracteres
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Volver</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || !isValid}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Cancelando…
              </>
            ) : (
              "Confirmar cancelación"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
