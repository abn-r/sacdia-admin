"use client";

import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ApiError } from "@/lib/api/client";
import type { ReviewAction, ReviewRequestPayload } from "@/lib/api/requests";

// ─── Schema factories ─────────────────────────────────────────────────────────

const approveSchema = z.object({
  comment: z.string().optional(),
});

function buildRejectSchema(t: ReturnType<typeof useTranslations<"requests.validation">>) {
  return z.object({
    comment: z.string().min(1, t("comment_required")),
  });
}

type FormValues = { comment?: string };

// ─── Types ────────────────────────────────────────────────────────────────────

interface RequestReviewDialogProps {
  open: boolean;
  action: ReviewAction;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ReviewRequestPayload) => Promise<void>;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RequestReviewDialog({
  open,
  action,
  title,
  description,
  onOpenChange,
  onSubmit,
  onSuccess,
}: RequestReviewDialogProps) {
  const t = useTranslations("requests");
  const tVal = useTranslations("requests.validation");
  const [isPending, setIsPending] = useState(false);
  const isApprove = action === "approved";
  const rejectSchema = useMemo(() => buildRejectSchema(tVal), [tVal]);
  const schema = isApprove ? approveSchema : rejectSchema;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { comment: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsPending(true);
    try {
      await onSubmit({
        action,
        comment: values.comment || undefined,
      });

      toast.success(isApprove ? "Solicitud aprobada" : "Solicitud rechazada");
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
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="comment"
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
