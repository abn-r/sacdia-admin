"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, Download, ExternalLink, Loader2 } from "lucide-react";

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
import { useAuth } from "@/lib/auth/auth-context";
import { hasPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_ORDERS_AUTHORIZE_WITHOUT_PROOF,
  CAMPOREE_ORDERS_DELIVER,
  CAMPOREE_ORDERS_REVIEW,
} from "@/lib/auth/permissions";
import {
  approveCamporeeOrder,
  authorizeCamporeeOrderWithoutProof,
  canDeliverToSection,
  canVisualizeDistribution,
  deliverCamporeeOrderToSection,
  downloadCamporeeOrderPdf,
  getCamporeeOrder,
  getCamporeeOrderProofDownload,
  rejectCamporeeOrder,
  type CamporeeOrder,
} from "@/lib/api/camporee-orders";
import { getCamporeeOrderUiErrorMessage } from "@/components/camporee-orders/camporee-order-errors";
import {
  formatCentavos,
  formatDateTime,
} from "@/components/camporee-orders/camporee-order-format";
import {
  CAMPOREE_ORDER_DISTRIBUTION_INTENT,
  CAMPOREE_ORDER_STATUS_INTENT,
} from "@/components/camporee-orders/camporee-order-status";

interface CamporeeOrderDetailProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  showReviewActions?: boolean;
}

export function CamporeeOrderDetail({
  orderId,
  open,
  onOpenChange,
  onChanged,
  showReviewActions = true,
}: CamporeeOrderDetailProps) {
  const t = useTranslations("camporee_orders");
  const { user } = useAuth();

  const canReviewPerm = hasPermission(user, CAMPOREE_ORDERS_REVIEW);
  const canAuthorize = hasPermission(user, CAMPOREE_ORDERS_AUTHORIZE_WITHOUT_PROOF);
  const canDeliverPerm = hasPermission(user, CAMPOREE_ORDERS_DELIVER);

  const [order, setOrder] = useState<CamporeeOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [authorizeOpen, setAuthorizeOpen] = useState(false);
  const [authorizeReason, setAuthorizeReason] = useState("");

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      setOrder(await getCamporeeOrder(orderId));
    } catch (error) {
      toast.error(getCamporeeOrderUiErrorMessage(error, t, "toasts.loadFailed"));
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const canApproveProof = order?.status === "PROOF_SUBMITTED";
  const showDeliver =
    order != null && canDeliverToSection(order.status) && canDeliverPerm;

  const openProof = async () => {
    if (!orderId) return;
    try {
      const download = await getCamporeeOrderProofDownload(orderId);
      window.open(download.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        getCamporeeOrderUiErrorMessage(error, t, "toasts.downloadFailed"),
      );
    }
  };

  const downloadPdf = async () => {
    if (!orderId || !order) return;
    setDownloadingPdf(true);
    try {
      const blob = await downloadCamporeeOrderPdf(orderId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `pedido-${order.folio_reference}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        getCamporeeOrderUiErrorMessage(error, t, "toasts.downloadFailed"),
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  const approve = async () => {
    if (!orderId) return;
    setActing(true);
    try {
      await approveCamporeeOrder(orderId);
      toast.success(t("toasts.approved"));
      onChanged();
      onOpenChange(false);
    } catch (error) {
      toast.error(getCamporeeOrderUiErrorMessage(error, t));
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    if (!orderId || !rejectReason.trim()) return;
    setActing(true);
    try {
      await rejectCamporeeOrder(orderId, rejectReason.trim());
      toast.success(t("toasts.rejected"));
      setRejectOpen(false);
      setRejectReason("");
      onChanged();
      onOpenChange(false);
    } catch (error) {
      toast.error(getCamporeeOrderUiErrorMessage(error, t));
    } finally {
      setActing(false);
    }
  };

  const authorizeWithoutProof = async () => {
    if (!orderId || !authorizeReason.trim()) return;
    setActing(true);
    try {
      await authorizeCamporeeOrderWithoutProof(orderId, authorizeReason.trim());
      toast.success(t("toasts.authorized"));
      setAuthorizeOpen(false);
      setAuthorizeReason("");
      onChanged();
      onOpenChange(false);
    } catch (error) {
      toast.error(getCamporeeOrderUiErrorMessage(error, t));
    } finally {
      setActing(false);
    }
  };

  const deliver = async () => {
    if (!orderId) return;
    setActing(true);
    try {
      await deliverCamporeeOrderToSection(orderId);
      toast.success(t("toasts.delivered"));
      onChanged();
      await load();
    } catch (error) {
      toast.error(getCamporeeOrderUiErrorMessage(error, t));
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
            <p className="px-4 text-muted-foreground text-sm">{t("tray.loading")}</p>
          ) : (
            <div className="space-y-5 px-4 pb-6">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void downloadPdf()}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {t("detail.downloadPdf")}
              </Button>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("detail.status")}</p>
                  <StatusBadge
                    intent={CAMPOREE_ORDER_STATUS_INTENT[order.status] ?? "neutral"}
                    label={t(`status.${order.status}`)}
                    size="sm"
                  />
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
                {order.authorized_without_proof && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">
                      {t("detail.authorizedWithoutProof")}
                    </p>
                    <p className="text-sm">{order.authorization_reason ?? "—"}</p>
                  </div>
                )}
                {canVisualizeDistribution(order.status) && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">
                      {t("detail.distributionStatus")}
                    </p>
                    <StatusBadge
                      intent={
                        CAMPOREE_ORDER_DISTRIBUTION_INTENT[
                          order.distribution_status
                        ] ?? "neutral"
                      }
                      label={t(`distribution.${order.distribution_status}`)}
                      size="sm"
                    />
                  </div>
                )}
              </div>

              {order.summary.length > 0 && (
                <div>
                  <h3 className="mb-2 font-medium text-sm">{t("detail.summary")}</h3>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-left">
                        <tr>
                          <th className="px-3 py-1.5 font-medium">
                            {t("detail.colProduct")}
                          </th>
                          <th className="px-3 py-1.5 font-medium">
                            {t("detail.colSize")}
                          </th>
                          <th className="px-3 py-1.5 font-medium">
                            {t("detail.colQty")}
                          </th>
                          <th className="px-3 py-1.5 font-medium">
                            {t("detail.colSubtotal")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.summary.map((item, index) => (
                          <tr
                            key={`${item.product_title_snapshot}-${index}`}
                            className="border-t"
                          >
                            <td className="px-3 py-1.5">{item.product_title_snapshot}</td>
                            <td className="px-3 py-1.5">
                              {item.option_label_snapshot ?? "—"}
                            </td>
                            <td className="px-3 py-1.5">{item.qty}</td>
                            <td className="px-3 py-1.5">
                              {formatCentavos(item.subtotal_centavos, order.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-2 font-medium text-sm">
                  {t("detail.namedLines")} ({order.lines.length})
                </h3>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">
                          {t("detail.colBeneficiary")}
                        </th>
                        <th className="px-3 py-1.5 font-medium">
                          {t("detail.colProduct")}
                        </th>
                        <th className="px-3 py-1.5 font-medium">
                          {t("detail.colSize")}
                        </th>
                        <th className="px-3 py-1.5 font-medium">
                          {t("detail.colQty")}
                        </th>
                        {canVisualizeDistribution(order.status) && (
                          <th className="px-3 py-1.5 font-medium">
                            {t("detail.colMemberDelivery")}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {order.lines.map((line) => (
                        <tr key={line.camporee_order_line_id} className="border-t">
                          <td className="px-3 py-1.5">
                            {line.beneficiary_name_snapshot}
                          </td>
                          <td className="px-3 py-1.5">
                            {line.product_title_snapshot}
                          </td>
                          <td className="px-3 py-1.5">
                            {line.option_label_snapshot ?? "—"}
                          </td>
                          <td className="px-3 py-1.5">{line.qty}</td>
                          {canVisualizeDistribution(order.status) && (
                            <td className="px-3 py-1.5 text-muted-foreground">
                              {line.delivered_to_member_at
                                ? formatDateTime(line.delivered_to_member_at)
                                : t("detail.pendingMemberDelivery")}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {order.status === "PROOF_SUBMITTED" && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">{t("detail.proof")}</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void openProof()}
                  >
                    <ExternalLink className="size-4" />
                    {t("detail.viewProof")}
                  </Button>
                </div>
              )}

              {showReviewActions && canReviewPerm && canApproveProof && (
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button type="button" onClick={() => void approve()} disabled={acting}>
                    {acting ? <Loader2 className="size-4 animate-spin" /> : null}
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
                  {canAuthorize && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setAuthorizeOpen(true)}
                      disabled={acting}
                    >
                      {t("detail.authorizeWithoutProof")}
                    </Button>
                  )}
                </div>
              )}

              {showDeliver && (
                <div className="border-t pt-4">
                  <Button type="button" onClick={() => void deliver()} disabled={acting}>
                    {acting ? <Loader2 className="size-4 animate-spin" /> : null}
                    {t("detail.deliverToSection")}
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
            <DialogDescription>{t("detail.rejectDescription")}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder={t("detail.rejectPlaceholder")}
            rows={3}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
              {t("detail.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectReason.trim() || acting}
              onClick={() => void reject()}
            >
              {t("detail.confirmReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={authorizeOpen} onOpenChange={setAuthorizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("detail.authorizeTitle")}</DialogTitle>
            <DialogDescription>{t("detail.authorizeDescription")}</DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertDescription>{t("detail.authorizeWarning")}</AlertDescription>
          </Alert>
          <Textarea
            value={authorizeReason}
            onChange={(event) => setAuthorizeReason(event.target.value)}
            placeholder={t("detail.authorizePlaceholder")}
            rows={3}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAuthorizeOpen(false)}>
              {t("detail.cancel")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!authorizeReason.trim() || acting}
              onClick={() => void authorizeWithoutProof()}
            >
              {t("detail.confirmAuthorize")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
