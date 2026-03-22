"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
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
import { validateEnrollment, type ValidateAction } from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const approveSchema = z.object({
  comments: z.string().optional(),
});

const rejectSchema = z.object({
  comments: z.string().min(1, "El motivo de rechazo es obligatorio"),
});

type ApproveFormValues = z.infer<typeof approveSchema>;
type RejectFormValues = z.infer<typeof rejectSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidateDialogProps {
  open: boolean;
  enrollmentId: number;
  memberName: string;
  action: ValidateAction;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ValidateDialog({
  open,
  enrollmentId,
  memberName,
  action,
  onOpenChange,
  onSuccess,
}: ValidateDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const isApprove = action === "APPROVED";
  const schema = isApprove ? approveSchema : rejectSchema;

  const form = useForm<ApproveFormValues | RejectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { comments: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsPending(true);
    try {
      await validateEnrollment(enrollmentId, {
        action,
        comments: values.comments || undefined,
      });

      toast.success(
        isApprove
          ? "Investidura aprobada correctamente"
          : "Investidura rechazada correctamente",
      );
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Ocurrió un error inesperado";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  });

  function handleClose(isOpen: boolean) {
    if (!isPending) {
      form.reset();
      onOpenChange(isOpen);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle2 className="size-5 text-success" />
            ) : (
              <XCircle className="size-5 text-destructive" />
            )}
            {isApprove ? "Aprobar investidura" : "Rechazar investidura"}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? `Se aprobará la solicitud de investidura de ${memberName}. Podrás marcarla como investida una vez aprobada.`
              : `Se rechazará la solicitud de investidura de ${memberName}. El motivo es obligatorio.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comments">
              {isApprove ? "Comentarios (opcional)" : "Motivo de rechazo *"}
            </Label>
            <Textarea
              id="comments"
              placeholder={
                isApprove
                  ? "Añade un comentario opcional..."
                  : "Describe el motivo del rechazo..."
              }
              rows={3}
              {...form.register("comments")}
              disabled={isPending}
              aria-describedby={
                form.formState.errors.comments ? "comments-error" : undefined
              }
            />
            {form.formState.errors.comments && (
              <p id="comments-error" className="text-xs text-destructive">
                {form.formState.errors.comments.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={isApprove ? "default" : "destructive"}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isApprove ? "Aprobar" : "Rechazar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
