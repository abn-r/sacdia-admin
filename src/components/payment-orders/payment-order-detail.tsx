"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/users/user-avatar";
import { useAuth } from "@/lib/auth/auth-context";
import {
  getPaymentOrderLineBeneficiary,
  getProofDisplayLabel,
} from "@/lib/payment-orders/display";
import {
  approvePaymentOrder,
  getPaymentOrder,
  getPaymentOrderProofDownload,
  rejectPaymentOrder,
  type PaymentOrder,
} from "@/lib/api/field-payment-orders";
import { getPaymentOrderErrorMessage } from "@/components/payment-orders/payment-order-errors";
import { ORDER_STATUS_INTENT } from "@/components/payment-orders/payment-orders-tray";
import { formatCentavos } from "@/components/payment-orders/format";

interface PaymentOrderDetailProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function PaymentOrderDetail({
  orderId,
  open,
  onOpenChange,
  onChanged,
}: PaymentOrderDetailProps) {
  const t = useTranslations("payment_orders");
  const { user } = useAuth();
  const currentUserId = user?.user_id ?? user?.id ?? null;

  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      setOrder(await getPaymentOrder(orderId));
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t, "toasts.loadFailed"));
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const latestProof = order?.proofs?.[0] ?? null;
  const proofFileLabels = {
    pdf: t("detail.proofFilePdf"),
    jpeg: t("detail.proofFileJpeg"),
    png: t("detail.proofFilePng"),
    generic: t("detail.proofFileGeneric"),
  };
  const proofLabel = latestProof
    ? getProofDisplayLabel(latestProof, proofFileLabels)
    : null;
  const isMakerChecker =
    latestProof != null &&
    currentUserId != null &&
    latestProof.uploaded_by_id === currentUserId;
  const canReview = order?.status === "PROOF_SUBMITTED";

  const openProof = async () => {
    if (!orderId) return;
    try {
      const download = await getPaymentOrderProofDownload(orderId);
      window.open(download.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        getPaymentOrderErrorMessage(error, t, "toasts.downloadFailed"),
      );
    }
  };

  const approve = async () => {
    if (!orderId) return;
    setActing(true);
    try {
      await approvePaymentOrder(orderId);
      toast.success(t("toasts.approved"));
      onChanged();
      onOpenChange(false);
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t));
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    if (!orderId || !rejectReason.trim()) return;
    setActing(true);
    try {
      await rejectPaymentOrder(orderId, rejectReason.trim());
      toast.success(t("toasts.rejected"));
      setRejectOpen(false);
      setRejectReason("");
      onChanged();
      onOpenChange(false);
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t));
    } finally {
      setActing(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{t("detail.title")}</SheetTitle>
            <SheetDescription>
              {order ? order.folio_reference : "…"}
            </SheetDescription>
          </SheetHeader>

          {loading || !order ? (
            <p className="px-4 text-muted-foreground text-sm">
              {t("tray.loading")}
            </p>
          ) : (
            <div className="space-y-5 px-4 pb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("detail.purpose")}</p>
                  <p>{t(`purpose.${order.purpose}`)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("detail.status")}</p>
                  <StatusBadge
                    intent={ORDER_STATUS_INTENT[order.status] ?? "neutral"}
                    label={t(`status.${order.status}`)}
                    size="sm"
                  />
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {t("detail.unitCost")}
                  </p>
                  <p>
                    {formatCentavos(order.unit_cost_centavos, order.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("detail.total")}</p>
                  <p className="font-medium">
                    {formatCentavos(order.total_centavos, order.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("detail.issued")}</p>
                  <p>{formatDateTime(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("detail.expires")}</p>
                  <p>{formatDateTime(order.expires_at)}</p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-medium text-sm">
                  {t("detail.beneficiaries")} ({order.lines?.length ?? 0})
                </h3>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">#</th>
                        <th className="px-3 py-1.5 font-medium">
                          {t("detail.colBeneficiary")}
                        </th>
                        <th className="px-3 py-1.5 font-medium">
                          {t("detail.colAmount")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.lines ?? []).map((line) => {
                        const beneficiary =
                          getPaymentOrderLineBeneficiary(line);
                        const label =
                          beneficiary.full_name ??
                          t("detail.unknownBeneficiary");

                        return (
                          <tr
                            key={line.field_payment_order_line_id}
                            className="border-t"
                          >
                            <td className="px-3 py-1.5">{line.sequence}</td>
                            <td className="px-3 py-1.5">
                              <div className="flex min-w-0 items-center gap-2">
                                <UserAvatar
                                  src={beneficiary.picture_url}
                                  name={label}
                                  email={beneficiary.email}
                                  size={28}
                                  className="size-7"
                                />
                                <span
                                  className="truncate font-medium"
                                  title={label}
                                >
                                  {label}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-1.5">
                              {formatCentavos(
                                line.unit_cost_centavos,
                                order.currency,
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {latestProof && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">{t("detail.proof")}</h3>
                  <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                    <div className="min-w-0">
                      <p
                        className="truncate font-medium"
                        title={proofLabel ?? undefined}
                      >
                        {proofLabel}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t(`proofStatus.${latestProof.status}`)} ·{" "}
                        {formatDateTime(latestProof.created_at)}
                      </p>
                      {latestProof.reject_reason && (
                        <p className="text-destructive text-xs">
                          {latestProof.reject_reason}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => void openProof()}
                    >
                      <ExternalLink className="size-4" />
                      {t("detail.viewProof")}
                    </Button>
                  </div>
                </div>
              )}

              {canReview && isMakerChecker && (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertDescription>
                    {t("detail.makerCheckerWarning")}
                  </AlertDescription>
                </Alert>
              )}

              {canReview && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => void approve()}
                    disabled={acting || isMakerChecker}
                  >
                    {acting && <Loader2 className="size-4 animate-spin" />}
                    {t("detail.approve")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setRejectOpen(true)}
                    disabled={acting}
                  >
                    {t("detail.reject")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("detail.rejectTitle")}</DialogTitle>
            <DialogDescription>
              {t("detail.rejectDescription")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder={t("detail.rejectPlaceholder")}
            maxLength={500}
            aria-label={t("detail.rejectPlaceholder")}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={acting}
            >
              {t("detail.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void reject()}
              disabled={acting || !rejectReason.trim()}
            >
              {acting && <Loader2 className="size-4 animate-spin" />}
              {t("detail.confirmReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
