"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { useToastError } from "@/lib/feedback/toast-retry";
import {
  getCertificateImportErrorCode,
  getCertificateImportErrorMessage,
} from "@/components/certificate-bulk-imports/certificate-import-errors";
import {
  approveCertificateBulkImportItem,
  rejectCertificateBulkImportItem,
  type CertificateBulkImportItem,
} from "@/lib/api/certificate-bulk-imports";

const MAX_TEXT = 1000;

export function ApproveItemDialog({
  open,
  onOpenChange,
  batchId,
  item,
  title,
  memberName,
  onApproved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  item: CertificateBulkImportItem;
  title: string;
  memberName: string;
  onApproved: (decided: Partial<CertificateBulkImportItem>) => void;
}) {
  const t = useTranslations("queues.certificates.batch.approveDialog");
  const tAction = useTranslations("certificate_bulk_imports.actionDialog");
  const tErrors = useTranslations("certificate_bulk_imports.errors");
  const toastError = useToastError();
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const reconciliation = item.operational_reconciliation;

  async function submit() {
    setPending(true);
    try {
      const trimmed = comment.trim();
      const decided = await approveCertificateBulkImportItem(batchId, item.item_id, {
        ...(trimmed ? { comment: trimmed } : {}),
        ...(reconciliation
          ? {
              reconcile_enrollment_id: reconciliation.enrollment_id,
              expected_modified_at: reconciliation.modified_at,
            }
          : {}),
      });
      if (decided?.instructor_conflict === true) toast.warning(tAction("itemApprovedInstructorConflict"));
      else toast.success(tAction("itemApproved"));
      setComment("");
      onApproved(decided);
    } catch (error) {
      if (getCertificateImportErrorCode(error) === "CERTIFICATE_IMPORT_AUTHORIZATION_PENDING") {
        // Not the reviewer's fault nor the member's: explain it and lock the action.
        setBlocked(true);
      } else {
        toastError({
          title: getCertificateImportErrorMessage(error, tErrors, tAction("genericError")),
          onRetry: () => void submit(),
        });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) {
          setComment("");
          setBlocked(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{memberName}</DialogDescription>
        </DialogHeader>
        {blocked && (
          <div role="status" className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
            <span>{t("blocked", { name: memberName })}</span>
          </div>
        )}
        {reconciliation && !blocked && (
          <p className="text-muted-foreground text-sm">{tAction("reconcileNotice")}</p>
        )}
        <div className="space-y-2">
          <Label htmlFor="batch-item-approve-comment">{t("commentLabel")}</Label>
          <Textarea
            id="batch-item-approve-comment"
            rows={3}
            value={comment}
            maxLength={MAX_TEXT}
            placeholder={t("commentPlaceholder")}
            disabled={pending || blocked}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {tAction("cancel")}
          </Button>
          <Button type="button" loading={pending} disabled={blocked} onClick={() => void submit()}>
            {reconciliation ? tAction("reconcileApprove") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectItemDialog({
  open,
  onOpenChange,
  batchId,
  item,
  title,
  memberName,
  onRejected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  item: CertificateBulkImportItem;
  title: string;
  memberName: string;
  onRejected: (decided: Partial<CertificateBulkImportItem>) => void;
}) {
  const t = useTranslations("queues.certificates.batch.rejectDialog");
  const tAction = useTranslations("certificate_bulk_imports.actionDialog");
  const tErrors = useTranslations("certificate_bulk_imports.errors");
  const toastError = useToastError();
  const [pending, setPending] = useState(false);

  async function confirm(reason: string) {
    setPending(true);
    try {
      const decided = await rejectCertificateBulkImportItem(batchId, item.item_id, { reason });
      toast.success(tAction("itemRejected"));
      onRejected(decided);
    } catch (error) {
      // Stay open so the reason is not lost.
      toastError({
        title: getCertificateImportErrorMessage(error, tErrors, tAction("genericError")),
        onRetry: () => void confirm(reason),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={t("description", { name: memberName })}
      label={t("label")}
      placeholder={t("placeholder")}
      min={1}
      max={MAX_TEXT}
      confirmLabel={t("confirm")}
      pending={pending}
      onConfirm={confirm}
    />
  );
}
