"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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
import { validateEnrollment, type ValidateAction } from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";

// ─── Schema factories ─────────────────────────────────────────────────────────

const approveSchema = z.object({
  comments: z.string().optional(),
});

function buildRejectSchema(t: ReturnType<typeof useTranslations<"investiture.validation">>) {
  return z.object({
    comments: z.string().min(1, t("comments_required")),
  });
}

type ApproveFormValues = z.infer<typeof approveSchema>;
type RejectFormValues = z.infer<ReturnType<typeof buildRejectSchema>>;

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
  const t = useTranslations("investiture");
  const tVal = useTranslations("investiture.validation");
  const [isPending, setIsPending] = useState(false);

  const isApprove = action === "APPROVED";
  const rejectSchema = useMemo(() => buildRejectSchema(tVal), [tVal]);
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

      toast.success(t(isApprove ? "toasts.validation_approved" : "toasts.validation_rejected"));
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : t("errors.unexpected");
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

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isApprove ? "Comentarios (opcional)" : "Motivo de rechazo *"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        isApprove
                          ? "Añade un comentario opcional..."
                          : "Describe el motivo del rechazo..."
                      }
                      rows={3}
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isApprove ? "Aprobar" : "Rechazar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
