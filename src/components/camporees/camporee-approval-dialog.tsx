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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api/client";

// ─── Schema ───────────────────────────────────────────────────────────────────

const rejectSchema = z.object({
  rejection_reason: z
    .string()
    .max(500, "El motivo no puede superar 500 caracteres")
    .optional(),
});

type RejectFormValues = z.infer<typeof rejectSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApprovalDialogMode = "approve" | "reject";

interface CamporeeApprovalDialogProps {
  open: boolean;
  mode: ApprovalDialogMode;
  entityLabel: string;
  entityName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (rejectionReason?: string) => Promise<void>;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CamporeeApprovalDialog({
  open,
  mode,
  entityLabel,
  entityName,
  onOpenChange,
  onConfirm,
  onSuccess,
}: CamporeeApprovalDialogProps) {
  const t = useTranslations("camporees");
  const [isPending, setIsPending] = useState(false);

  const form = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { rejection_reason: "" },
  });

  const isReject = mode === "reject";

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsPending(true);
    try {
      await onConfirm(isReject ? values.rejection_reason : undefined);
      toast.success(
        isReject
          ? `${entityLabel} "${entityName}" rechazado`
          : `${entityLabel} "${entityName}" aprobado`,
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
            {isReject ? (
              <XCircle className="size-5 text-destructive" />
            ) : (
              <CheckCircle2 className="size-5 text-success" />
            )}
            {isReject ? "Rechazar" : "Aprobar"} {entityLabel.toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            {isReject
              ? `Se rechazara la solicitud de "${entityName}".`
              : `Se aprobará la solicitud de "${entityName}". Esta acción no se puede deshacer.`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isReject && (
              <FormField
                control={form.control}
                name="rejection_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de rechazo</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe el motivo del rechazo (opcional)..."
                        rows={3}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                variant={isReject ? "destructive" : "default"}
                disabled={isPending}
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isReject ? "Rechazar" : "Aprobar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
