"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { approveReceipt, rejectReceipt } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";
import { useToastError } from "@/lib/feedback/toast-retry";

interface ReceiptReviewActionsProps {
  folio: string;
  comprobanteId: string;
}

/** Decision buttons of a pending receipt (queue pattern B: negative outline, positive default). */
export function ReceiptReviewActions({ folio, comprobanteId }: ReceiptReviewActionsProps) {
  const t = useTranslations("ops.materials.receipts");
  const router = useRouter();
  const showError = useToastError();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  async function confirmApprove() {
    try {
      await approveReceipt(folio, comprobanteId);
    } catch (err) {
      throw new Error(err instanceof ApiError && err.message ? err.message : t("approveError"));
    }
    toast.success(t("approved"));
    router.refresh();
  }

  async function confirmReject(reason: string) {
    setRejecting(true);
    try {
      await rejectReceipt(folio, comprobanteId, reason);
      toast.success(t("rejected"));
      setRejectOpen(false);
      router.refresh();
    } catch (err) {
      showError({
        title: t("rejectError"),
        ...(err instanceof ApiError && err.message ? { description: err.message } : {}),
      });
    } finally {
      setRejecting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setRejectOpen(true)}>
          {t("reject")}
        </Button>
        <Button size="sm" onClick={() => setApproveOpen(true)}>
          {t("approve")}
        </Button>
      </div>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title={t("approveTitle")}
        description={t("approveDescription")}
        confirmLabel={t("approveConfirm")}
        onConfirm={confirmApprove}
      />

      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={t("rejectTitle")}
        description={t("rejectDescription")}
        label={t("rejectReasonLabel")}
        confirmLabel={t("rejectConfirm")}
        pending={rejecting}
        onConfirm={confirmReject}
      />
    </>
  );
}
