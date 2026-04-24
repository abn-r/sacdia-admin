"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import {
  reviewValidation,
  type ValidationAction,
  type ValidationEntityType,
} from "@/lib/api/validation";
import { ApiError } from "@/lib/api/client";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const approveSchema = z.object({
  comment: z.string().optional(),
});

const rejectSchema = z.object({
  comment: z.string().min(1, "El motivo de rechazo es obligatorio"),
});

type FormValues = { comment?: string };

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidationReviewDialogProps {
  open: boolean;
  entityType: ValidationEntityType;
  entityId: number | string;
  memberName: string;
  entityName: string;
  action: ValidationAction;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ValidationReviewDialog({
  open,
  entityType,
  entityId,
  memberName,
  entityName,
  action,
  onOpenChange,
  onSuccess,
}: ValidationReviewDialogProps) {
  const t = useTranslations("validation_admin");
  const [isPending, setIsPending] = useState(false);
  const isApprove = action === "APPROVED";
  const schema = isApprove ? approveSchema : rejectSchema;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { comment: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsPending(true);
    try {
      await reviewValidation(entityType, entityId, {
        action,
        comment: values.comment || undefined,
      });

      toast.success(
        isApprove
          ? `${entityName} aprobado correctamente para ${memberName}`
          : `${entityName} rechazado`,
      );
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("errors.unexpected");
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
            {isApprove ? "Aprobar validación" : "Rechazar validación"}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? `Se aprobará "${entityName}" de ${memberName}.`
              : `Se rechazará "${entityName}" de ${memberName}. El motivo es obligatorio.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comment">
              {isApprove ? "Comentarios (opcional)" : "Motivo de rechazo *"}
            </Label>
            <Textarea
              id="comment"
              placeholder={
                isApprove
                  ? "Añade un comentario opcional..."
                  : "Describe el motivo del rechazo..."
              }
              rows={3}
              {...form.register("comment")}
              disabled={isPending}
              aria-describedby={
                form.formState.errors.comment ? "comment-error" : undefined
              }
            />
            {form.formState.errors.comment && (
              <p id="comment-error" className="text-xs text-destructive">
                {form.formState.errors.comment.message}
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
