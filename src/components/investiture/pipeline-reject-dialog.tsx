"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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
import { pipelineReject } from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  reason: z.string().min(1, "El motivo de rechazo es obligatorio"),
});

type FormValues = z.infer<typeof schema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineRejectDialogProps {
  open: boolean;
  enrollmentId: number;
  memberName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PipelineRejectDialog({
  open,
  enrollmentId,
  memberName,
  onOpenChange,
  onSuccess,
}: PipelineRejectDialogProps) {
  const t = useTranslations("investiture");
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsPending(true);
    try {
      await pipelineReject(enrollmentId, { reason: values.reason });
      toast.success(t("toasts.rejected_member", { name: memberName }));
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
            <XCircle className="size-5 text-destructive" />
            Rechazar investidura
          </DialogTitle>
          <DialogDescription>
            Se rechazará la solicitud de investidura de {memberName}. El motivo
            es obligatorio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo de rechazo *</Label>
            <Textarea
              id="reason"
              placeholder="Describe el motivo del rechazo..."
              rows={3}
              {...form.register("reason")}
              disabled={isPending}
              aria-describedby={
                form.formState.errors.reason ? "reason-error" : undefined
              }
            />
            {form.formState.errors.reason && (
              <p id="reason-error" className="text-xs text-destructive">
                {form.formState.errors.reason.message}
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
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Rechazar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
