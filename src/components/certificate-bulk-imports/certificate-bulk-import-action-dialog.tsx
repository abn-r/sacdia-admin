"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  approveCertificateBulkImportBatch,
  approveCertificateBulkImportItem,
  rejectCertificateBulkImportBatch,
  rejectCertificateBulkImportItem,
  type CertificateBulkImportItem,
} from "@/lib/api/certificate-bulk-imports";
import {
  getCertificateImportErrorMessage,
  isCertificateImportInlineError,
} from "./certificate-import-errors";

type Action = "approve" | "reject";
type Scope = "batch" | "item";

type FormValues = {
  comment: string;
  reason: string;
};

export interface CertificateBulkImportActionDialogProps {
  open: boolean;
  action: Action;
  scope: Scope;
  batchId: string;
  itemId?: string;
  title: string;
  description: string;
  reconciliation?: CertificateBulkImportItem["operational_reconciliation"];
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function trimOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function CertificateBulkImportActionDialog({
  open,
  action,
  scope,
  batchId,
  itemId,
  title,
  description,
  reconciliation,
  onOpenChange,
  onSuccess,
}: CertificateBulkImportActionDialogProps) {
  const t = useTranslations("certificate_bulk_imports.actionDialog");
  const tErrors = useTranslations("certificate_bulk_imports.errors");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const isReject = action === "reject";

  const schema = useMemo(
    () =>
      z.object({
        comment: z.string().max(1000, t("commentMax")),
        reason: isReject
          ? z.string().trim().min(1, t("reasonRequired")).max(1000, t("reasonMax"))
          : z.string(),
      }),
    [isReject, t],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { comment: "", reason: "" },
  });

  function handleClose(nextOpen: boolean) {
    if (isSubmitting) return;
    if (!nextOpen) {
      form.reset();
      setInlineError(null);
    }
    onOpenChange(nextOpen);
  }

  const submit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setInlineError(null);
    try {
      if (isReject) {
        const reason = values.reason?.trim() ?? "";
        if (scope === "item") {
          if (!itemId) throw new Error("Missing item id");
          await rejectCertificateBulkImportItem(batchId, itemId, { reason });
        } else {
          await rejectCertificateBulkImportBatch(batchId, { reason });
        }
        toast.success(t(scope === "item" ? "itemRejected" : "batchRejected"));
      } else {
        const payload = {
          comment: trimOptional(values.comment),
          ...(reconciliation
            ? {
                reconcile_enrollment_id: reconciliation.enrollment_id,
                expected_modified_at: reconciliation.modified_at,
              }
            : {}),
        };
        if (scope === "item") {
          if (!itemId) throw new Error("Missing item id");
          await approveCertificateBulkImportItem(batchId, itemId, payload);
        } else {
          await approveCertificateBulkImportBatch(batchId, payload);
        }
        toast.success(t(scope === "item" ? "itemApproved" : "batchApproved"));
      }
      form.reset();
      onSuccess();
    } catch (error) {
      const message = getCertificateImportErrorMessage(error, tErrors, t("genericError"));
      if (isCertificateImportInlineError(error)) {
        setInlineError(message);
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReject ? (
              <XCircle className="text-destructive" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="text-success" aria-hidden="true" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {reconciliation && !isReject ? (
            <p className="text-sm text-muted-foreground">{t("reconcileNotice")}</p>
          ) : null}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {inlineError && (
              <Alert variant="destructive">
                <ShieldAlert aria-hidden="true" />
                <AlertDescription>{inlineError}</AlertDescription>
              </Alert>
            )}

            {isReject ? (
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("reasonLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder={t("reasonPlaceholder")}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("commentLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder={t("commentPlaceholder")}
                        disabled={isSubmitting}
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
                disabled={isSubmitting}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                variant={isReject ? "destructive" : "default"}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                {isReject ? t("reject") : reconciliation ? t("reconcileApprove") : t("approve")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
