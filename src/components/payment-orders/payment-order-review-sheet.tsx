"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Download, ExternalLink, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/users/user-avatar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { PdfInlineViewer } from "@/components/shared/pdf-inline-viewer";
import { formatCentavos } from "@/components/payment-orders/format";
import { getPaymentOrderErrorMessage } from "@/components/payment-orders/payment-order-errors";
import { ORDER_STATUS_INTENT } from "@/components/payment-orders/payment-orders-tray";
import { StatusBadge } from "@/components/ui/status-badge";
import { errorStateFromError } from "@/lib/api/error-state";
import {
  approvePaymentOrder,
  getPaymentOrder,
  getPaymentOrderProofDownload,
  rejectPaymentOrder,
  triggerPaymentOrderPdfDownload,
  type PaymentOrder,
  type ProofDownload,
} from "@/lib/api/field-payment-orders";
import { useAuth } from "@/lib/auth/auth-context";
import { SACDIA_DISPLAY_TIMEZONE } from "@/lib/format-locale";
import { useToastError } from "@/lib/feedback/toast-retry";
import { getPaymentOrderLineBeneficiary } from "@/lib/payment-orders/display";
import { toast } from "sonner";

const REASON_MIN = 5;
const REASON_MAX = 500;

interface PaymentOrderReviewSheetProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after approving or rejecting so the queue reloads. */
  onChanged: () => void;
}

/**
 * The single place an order is opened from the payment-orders screen. Shows
 * the total, the voucher and the beneficiaries; rejecting asks for the reason
 * inside the sheet and approving asks to confirm the amount.
 */
export function PaymentOrderReviewSheet({
  orderId,
  open,
  onOpenChange,
  onChanged,
}: PaymentOrderReviewSheetProps) {
  const t = useTranslations("payment_orders");
  const ts = useTranslations("ops.paymentOrders.sheet");
  const format = useFormatter();
  const toastError = useToastError();
  const reasonId = useId();
  const { user } = useAuth();
  const currentUserId = user?.user_id ?? user?.id ?? null;

  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [proof, setProof] = useState<ProofDownload | null>(null);
  const [proofError, setProofError] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [acting, setActing] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);

  const latestProof = order?.proofs?.[0] ?? null;
  const hasProof = latestProof !== null;

  const loadProof = useCallback(async (id: string) => {
    setProofError(false);
    try {
      setProof(await getPaymentOrderProofDownload(id));
    } catch {
      setProof(null);
      setProofError(true);
    }
  }, []);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setLoadError(null);
    setProof(null);
    try {
      const loaded = await getPaymentOrder(orderId);
      setOrder(loaded);
      if ((loaded.proofs?.length ?? 0) > 0) void loadProof(orderId);
    } catch (error) {
      setOrder(null);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }, [orderId, loadProof]);

  useEffect(() => {
    if (open) {
      setRejecting(false);
      setReason("");
      setAttempted(false);
      void load();
    }
  }, [open, load]);

  const canReview = order?.status === "PROOF_SUBMITTED";
  const uploadedByMe =
    latestProof != null &&
    currentUserId != null &&
    latestProof.uploaded_by_id === currentUserId;

  const date = (value: string) =>
    format.dateTime(new Date(value), {
      dateStyle: "medium",
      timeZone: SACDIA_DISPLAY_TIMEZONE,
    });

  const amount = order
    ? formatCentavos(order.total_centavos, order.currency)
    : "";
  const count = order?.lines?.length ?? 0;
  const trimmedReason = reason.trim();
  const reasonValid =
    trimmedReason.length >= REASON_MIN && trimmedReason.length <= REASON_MAX;

  const downloadPdf = async () => {
    if (!orderId || !order) return;
    setDownloadingPdf(true);
    try {
      await triggerPaymentOrderPdfDownload(
        orderId,
        `orden-${order.folio_reference}.pdf`,
      );
    } catch (error) {
      toastError({
        title: getPaymentOrderErrorMessage(error, t, "toasts.downloadFailed"),
        onRetry: () => void downloadPdf(),
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const approve = async () => {
    if (!orderId) return;
    try {
      await approvePaymentOrder(orderId);
    } catch (error) {
      // ConfirmDialog shows the message inside the dialog.
      throw new Error(getPaymentOrderErrorMessage(error, t));
    }
    toast.success(t("toasts.approved"));
    onChanged();
    onOpenChange(false);
  };

  const reject = async () => {
    setAttempted(true);
    if (!orderId || !reasonValid) return;
    setActing(true);
    try {
      await rejectPaymentOrder(orderId, trimmedReason);
      toast.success(t("toasts.rejected"));
      onChanged();
      onOpenChange(false);
    } catch (error) {
      toastError({
        title: getPaymentOrderErrorMessage(error, t),
        onRetry: () => void reject(),
      });
    } finally {
      setActing(false);
    }
  };

  const renderVoucher = () => {
    if (!hasProof) {
      return (
        <p className="text-muted-foreground text-sm">{ts("noVoucher")}</p>
      );
    }
    if (proofError) {
      return (
        <ErrorState
          variant="inline"
          title={t("toasts.downloadFailed")}
          onRetry={() => orderId && void loadProof(orderId)}
        />
      );
    }
    if (!proof) {
      return (
        <p className="text-muted-foreground text-sm" role="status">
          {t("tray.loading")}
        </p>
      );
    }
    const caption = `${proof.file_name} · ${date(proof.created_at)}`;
    return (
      <div className="space-y-2">
        {proof.mime_type.includes("pdf") ? (
          <PdfInlineViewer
            src={proof.url}
            title={proof.file_name}
            className="h-72 w-full rounded-lg border"
          />
        ) : proof.mime_type.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL of a private voucher; next/image would proxy and cache it
          <img
            src={proof.url}
            alt={proof.file_name}
            className="max-h-72 w-full rounded-lg border object-contain"
          />
        ) : null}
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 truncate text-muted-foreground" title={caption}>
            {caption}
          </span>
          <Button type="button" variant="ghost" size="sm" asChild>
            <a href={proof.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden />
              {t("detail.viewProof")}
            </a>
          </Button>
        </div>
        {latestProof?.status === "REJECTED" && latestProof.reject_reason ? (
          <p className="text-sm">
            <span className="text-muted-foreground">
              {ts("rejectedReason")}{" "}
            </span>
            {latestProof.reject_reason}
          </p>
        ) : null}
      </div>
    );
  };

  const renderBody = () => {
    if (loading) {
      return (
        <p className="px-6 py-4 text-muted-foreground text-sm" role="status">
          {t("tray.loading")}
        </p>
      );
    }
    if (loadError || !order) {
      const state = errorStateFromError(loadError);
      return (
        <ErrorState
          kind={state.kind}
          {...(state.detail ? { detail: state.detail } : {})}
          onRetry={() => void load()}
        />
      );
    }
    return (
      <div className="space-y-6 px-6 py-5">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">
            {canReview ? ts("totalToConfirm") : ts("total")}
          </p>
          <p
            className="font-semibold text-3xl tabular-nums tracking-tight"
            data-testid="order-total"
          >
            {amount}
          </p>
          <p className="text-muted-foreground text-sm tabular-nums">
            {ts("perBeneficiary", {
              count,
              amount: formatCentavos(order.unit_cost_centavos, order.currency),
            })}
          </p>
        </div>

        {canReview && uploadedByMe ? (
          <p
            role="note"
            className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm"
          >
            <Info
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            {ts("sameUploader")}
          </p>
        ) : null}

        <section className="space-y-2">
          <h3 className="font-medium text-sm">{t("detail.proof")}</h3>
          {renderVoucher()}
        </section>

        <section className="space-y-2">
          <h3 className="font-medium text-sm">
            {t("detail.beneficiaries")} ({count})
          </h3>
          <ul className="divide-y text-sm">
            {(order.lines ?? []).map((line) => {
              const beneficiary = getPaymentOrderLineBeneficiary(line);
              const label =
                beneficiary.full_name ?? t("detail.unknownBeneficiary");
              return (
                <li
                  key={line.field_payment_order_line_id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <UserAvatar
                      src={beneficiary.picture_url}
                      name={label}
                      email={beneficiary.email}
                      size={28}
                      className="size-7"
                    />
                    <span className="truncate" title={label}>
                      {label}
                    </span>
                    {line.is_staff ? (
                      <Badge variant="secondary" className="shrink-0">
                        {t("detail.staffBadge")}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {formatCentavos(line.unit_cost_centavos, order.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {rejecting ? (
          <section className="space-y-2" data-testid="reject-form">
            <h3 className="font-medium text-sm">{t("detail.rejectTitle")}</h3>
            <p className="text-muted-foreground text-sm">
              {ts("rejectExplain")}
            </p>
            <Label htmlFor={reasonId}>{ts("rejectLabel")}</Label>
            <Textarea
              id={reasonId}
              value={reason}
              maxLength={REASON_MAX}
              rows={3}
              placeholder={t("detail.rejectPlaceholder")}
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={(attempted && !reasonValid) || undefined}
              disabled={acting}
            />
            <p
              className={
                attempted && !reasonValid
                  ? "text-destructive text-xs"
                  : "text-muted-foreground text-xs"
              }
              role={attempted && !reasonValid ? "alert" : undefined}
            >
              {attempted && !reasonValid
                ? ts("rejectTooShort", { min: REASON_MIN })
                : ts("rejectHint", { min: REASON_MIN, max: REASON_MAX })}
            </p>
          </section>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle className="flex items-center gap-2">
              <span className="font-mono">{order?.folio_reference ?? "…"}</span>
              {order ? (
                <span className="font-normal text-muted-foreground">
                  · {t(`purpose.${order.purpose}`)}
                </span>
              ) : null}
              {order && !canReview ? (
                <StatusBadge
                  intent={ORDER_STATUS_INTENT[order.status] ?? "neutral"}
                  label={t(`status.${order.status}`)}
                  size="sm"
                />
              ) : null}
            </SheetTitle>
            <SheetDescription>
              {order
                ? [
                    order.club_name,
                    order.section_name,
                    order.camporee_name,
                    ts("issuedExpires", {
                      issued: date(order.created_at),
                      expires: date(order.expires_at),
                    }),
                  ]
                    .filter((part) => part && part.trim() !== "")
                    .join(" · ")
                : t("detail.title")}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">{renderBody()}</div>

          {order ? (
            <SheetFooter className="flex-row flex-wrap items-center justify-end gap-2 border-t px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                className="mr-auto px-2"
                loading={downloadingPdf}
                onClick={() => void downloadPdf()}
              >
                <Download aria-hidden />
                {t("detail.downloadPdf")}
              </Button>
              {canReview && rejecting ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={acting}
                    onClick={() => {
                      setRejecting(false);
                      setReason("");
                      setAttempted(false);
                    }}
                  >
                    {t("detail.cancel")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive-solid"
                    loading={acting}
                    onClick={() => void reject()}
                  >
                    {t("detail.confirmReject")}
                  </Button>
                </>
              ) : canReview ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRejecting(true)}
                  >
                    {ts("rejectAction")}
                  </Button>
                  <Button
                    type="button"
                    disabled={uploadedByMe}
                    onClick={() => setApproveOpen(true)}
                  >
                    {ts("approveAction")}
                  </Button>
                </>
              ) : null}
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title={ts("approveTitle", { amount })}
        description={
          order
            ? ts("approveDescription", {
                folio: order.folio_reference,
                amount,
                consequence: ts(`consequence.${order.purpose}`, { count }),
              })
            : ""
        }
        confirmLabel={t("detail.confirmApprove")}
        onConfirm={approve}
      />
    </>
  );
}
