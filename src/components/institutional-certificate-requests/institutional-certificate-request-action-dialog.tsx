"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  approveInstitutionalCertificateRequest,
  rejectInstitutionalCertificateRequest,
} from "@/lib/api/institutional-certificate-requests";

type Action = "approve" | "reject";

type FormValues = {
  comment: string;
  reason: string;
};

// Backend error codes that indicate a revision conflict or immutable decision
const REVISION_CONFLICT_CODE = "CERTIFICATE_IMPORT_REVISION_CONFLICT";
const DECISION_IMMUTABLE_CODE = "CERTIFICATE_IMPORT_DECISION_IMMUTABLE";

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

function isRevisionConflict(error: unknown): boolean {
  return extractErrorMessage(error).includes(REVISION_CONFLICT_CODE);
}

function isDecisionImmutable(error: unknown): boolean {
  return extractErrorMessage(error).includes(DECISION_IMMUTABLE_CODE);
}

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export interface InstitutionalCertificateRequestActionDialogProps {
  open: boolean;
  action: Action;
  requestId: string;
  /** Current revision number — sent as expected_revision to detect conflicts */
  currentRevision: number;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InstitutionalCertificateRequestActionDialog({
  open,
  action,
  requestId,
  currentRevision,
  title,
  description,
  onOpenChange,
  onSuccess,
}: InstitutionalCertificateRequestActionDialogProps) {
  const t = useTranslations("institutional_certificate_requests.actionDialog");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
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
      setConflictError(null);
    }
    onOpenChange(nextOpen);
  }

  const submit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setConflictError(null);

    try {
      if (isReject) {
        await rejectInstitutionalCertificateRequest(requestId, {
          expected_revision: currentRevision,
          reason: values.reason.trim(),
        });
        toast.success(t("rejected"));
      } else {
        await approveInstitutionalCertificateRequest(requestId, {
          expected_revision: currentRevision,
          comment: trimOptional(values.comment),
        });
        // Approval = institutional validation approved, NOT "class registered"
        toast.success(t("approved"));
      }
      form.reset();
      onSuccess();
    } catch (error) {
      if (isRevisionConflict(error)) {
        // Show conflict inline — do not close, do not show success
        setConflictError(t("revisionConflict"));
        return;
      }
      if (isDecisionImmutable(error)) {
        setConflictError(t("decisionImmutable"));
        return;
      }
      const message = error instanceof ApiError ? error.message : t("genericError");
      toast.error(message);
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
        </DialogHeader>

        {conflictError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{conflictError}</span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={submit} className="flex flex-col gap-4">
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
                {isReject ? t("reject") : t("approve")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
