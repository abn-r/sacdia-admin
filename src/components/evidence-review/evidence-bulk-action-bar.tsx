"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, XCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  bulkApproveEvidence,
  bulkRejectEvidence,
  type EvidenceType,
  type BulkEvidenceResult,
} from "@/lib/api/evidence-review";
import { ApiError } from "@/lib/api/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildToastMessage(result: BulkEvidenceResult, verb: string): string {
  const parts: string[] = [];
  if (result.succeeded.length > 0) {
    parts.push(`${result.succeeded.length} ${verb} correctamente`);
  }
  if (result.failed.length > 0) {
    parts.push(`${result.failed.length} fallaron`);
  }
  return parts.join(" · ");
}

// ─── Reject schema ────────────────────────────────────────────────────────────

const rejectSchema = z.object({
  reason: z
    .string()
    .min(1, "El motivo de rechazo es obligatorio")
    .max(1000, "Máximo 1000 caracteres"),
});

type RejectFormValues = z.infer<typeof rejectSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface EvidenceBulkActionBarProps {
  selectedIds: number[];
  selectedType: EvidenceType | null;
  onClearSelection: () => void;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EvidenceBulkActionBar({
  selectedIds,
  selectedType,
  onClearSelection,
  onSuccess,
}: EvidenceBulkActionBarProps) {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const rejectForm = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: "" },
  });

  const count = selectedIds.length;
  const canApprove = selectedType !== null;

  // ─── Approve ────────────────────────────────────────────────────────────────

  async function handleConfirmApprove() {
    if (!selectedType) return;
    setIsApproving(true);
    try {
      const result = await bulkApproveEvidence({
        ids: selectedIds,
        type: selectedType,
      });
      const message = buildToastMessage(result, "aprobados");
      if (result.failed.length === 0) {
        toast.success(message);
      } else {
        toast.warning(message);
      }
      setApproveDialogOpen(false);
      onClearSelection();
      onSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Error al aprobar en bloque";
      toast.error(message);
    } finally {
      setIsApproving(false);
    }
  }

  // ─── Reject ─────────────────────────────────────────────────────────────────

  const handleRejectSubmit = rejectForm.handleSubmit(async (values) => {
    if (!selectedType) return;
    setIsRejecting(true);
    try {
      const result = await bulkRejectEvidence({
        ids: selectedIds,
        type: selectedType,
        reason: values.reason,
      });
      const message = buildToastMessage(result, "rechazados");
      if (result.failed.length === 0) {
        toast.success(message);
      } else {
        toast.warning(message);
      }
      rejectForm.reset();
      setRejectDialogOpen(false);
      onClearSelection();
      onSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Error al rechazar en bloque";
      toast.error(message);
    } finally {
      setIsRejecting(false);
    }
  });

  function handleRejectClose(isOpen: boolean) {
    if (!isRejecting) {
      rejectForm.reset();
      setRejectDialogOpen(isOpen);
    }
  }

  return (
    <>
      {/* ─── Floating action bar ─────────────────────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
        <span className="text-sm font-medium text-foreground">
          {count} {count === 1 ? "seleccionado" : "seleccionados"}
        </span>

        <div className="h-4 w-px bg-border" />

        {canApprove && (
          <Button
            size="sm"
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => setApproveDialogOpen(true)}
          >
            <CheckCircle2 className="mr-1.5 size-4" />
            Aprobar seleccionados
          </Button>
        )}

        <Button
          size="sm"
          variant="destructive"
          onClick={() => setRejectDialogOpen(true)}
        >
          <XCircle className="mr-1.5 size-4" />
          Rechazar seleccionados
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          aria-label="Limpiar selección"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* ─── Approve confirmation dialog ──────────────────────────────────────── */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-success" />
              Aprobar en bloque
            </DialogTitle>
            <DialogDescription>
              Se aprobarán {count} evidencia{count !== 1 ? "s" : ""}. Las que no
              estén en estado pendiente se omitirán con un detalle en el resultado.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              disabled={isApproving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmApprove}
              disabled={isApproving}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              {isApproving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirmar aprobación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reject dialog ────────────────────────────────────────────────────── */}
      <Dialog open={rejectDialogOpen} onOpenChange={handleRejectClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="size-5 text-destructive" />
              Rechazar en bloque
            </DialogTitle>
            <DialogDescription>
              Se rechazarán {count} evidencia{count !== 1 ? "s" : ""}. El motivo
              es obligatorio y se aplicará a todas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-reject-reason">Motivo de rechazo *</Label>
              <Textarea
                id="bulk-reject-reason"
                placeholder="Describe el motivo del rechazo..."
                rows={3}
                {...rejectForm.register("reason")}
                disabled={isRejecting}
                aria-describedby={
                  rejectForm.formState.errors.reason
                    ? "bulk-reject-reason-error"
                    : undefined
                }
              />
              {rejectForm.formState.errors.reason && (
                <p id="bulk-reject-reason-error" className="text-xs text-destructive">
                  {rejectForm.formState.errors.reason.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRejectClose(false)}
                disabled={isRejecting}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={isRejecting}>
                {isRejecting && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Rechazar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
