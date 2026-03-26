"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { XCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { rejectEvidence, type EvidenceType } from "@/lib/api/evidence-review";
import { ApiError } from "@/lib/api/client";

const rejectSchema = z.object({
  reason: z
    .string()
    .min(1, "El motivo de rechazo es obligatorio")
    .max(1000, "Máximo 1000 caracteres"),
});

type RejectFormValues = z.infer<typeof rejectSchema>;

interface EvidenceRejectDialogProps {
  open: boolean;
  type: EvidenceType;
  id: number;
  memberName: string;
  sectionName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EvidenceRejectDialog({
  open,
  type,
  id,
  memberName,
  sectionName,
  onOpenChange,
  onSuccess,
}: EvidenceRejectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      await rejectEvidence(type, id, values.reason);
      toast.success("Evidencia rechazada");
      form.reset();
      onSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Error al rechazar la evidencia";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  });

  function handleClose(isOpen: boolean) {
    if (!isSubmitting) {
      form.reset();
      onOpenChange(isOpen);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="size-5 text-destructive" />
            Rechazar evidencia
          </DialogTitle>
          <DialogDescription>
            Vas a rechazar la evidencia de{" "}
            <span className="font-medium text-foreground">{memberName}</span> para{" "}
            <span className="font-medium text-foreground">{sectionName}</span>. El
            motivo es obligatorio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo de rechazo *</Label>
            <Textarea
              id="reject-reason"
              placeholder="Describe el motivo del rechazo para que el miembro pueda corregirlo..."
              rows={4}
              {...form.register("reason")}
              disabled={isSubmitting}
              aria-describedby={
                form.formState.errors.reason ? "reject-reason-error" : undefined
              }
            />
            {form.formState.errors.reason && (
              <p id="reject-reason-error" className="text-xs text-destructive">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Rechazar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
