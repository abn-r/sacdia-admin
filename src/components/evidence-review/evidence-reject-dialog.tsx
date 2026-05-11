"use client";

import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { rejectEvidence, type EvidenceType } from "@/lib/api/evidence-review";
import { ApiError } from "@/lib/api/client";

type RejectTranslator = ReturnType<typeof useTranslations<"evidence_review">>;

function buildRejectSchema(t: RejectTranslator) {
  return z.object({
    reason: z
      .string()
      .min(1, t("validation.reason_required"))
      .max(1000, t("validation.reason_max")),
  });
}

type RejectFormValues = { reason: string };

export interface EvidenceRejectDialogProps {
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
  const t = useTranslations("evidence_review");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rejectSchema = useMemo(() => buildRejectSchema(t), [t]);

  const form = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      await rejectEvidence(type, id, values.reason);
      toast.success(t("toasts.evidence_rejected"));
      form.reset();
      onSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("errors.reject");
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
            {t("rejectDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("rejectDialog.description", { memberName, sectionName })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("rejectDialog.reasonLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("rejectDialog.reasonPlaceholder")}
                      rows={4}
                      {...field}
                      disabled={isSubmitting}
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
                disabled={isSubmitting}
              >
                {t("rejectDialog.cancel")}
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {t("rejectDialog.confirm")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
