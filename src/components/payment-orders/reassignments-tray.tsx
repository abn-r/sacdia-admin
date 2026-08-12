"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowRightLeft, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import {
  approveReassignment,
  listReassignments,
  rejectReassignment,
  type ReassignmentRequest,
  type ReassignmentStatus,
} from "@/lib/api/field-payment-orders";
import { getPaymentOrderErrorMessage } from "@/components/payment-orders/payment-order-errors";

const REASSIGNMENT_INTENT: Record<ReassignmentStatus, StatusIntent> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

export function ReassignmentsTray() {
  const t = useTranslations("payment_orders");
  const [status, setStatus] = useState<ReassignmentStatus>("PENDING");
  const [items, setItems] = useState<ReassignmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listReassignments(status));
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t, "toasts.loadFailed"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (requestId: number) => {
    setActing(true);
    try {
      await approveReassignment(requestId);
      toast.success(t("reassignments.approved"));
      await load();
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t));
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    if (rejectTarget == null || !rejectReason.trim()) return;
    setActing(true);
    try {
      await rejectReassignment(rejectTarget, rejectReason.trim());
      toast.success(t("reassignments.rejected"));
      setRejectTarget(null);
      setRejectReason("");
      await load();
    } catch (error) {
      toast.error(getPaymentOrderErrorMessage(error, t));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="reassignments-status-filter"
            className="text-muted-foreground text-sm"
          >
            {t("tray.filterStatus")}
          </label>
          <select
            id="reassignments-status-filter"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ReassignmentStatus)
            }
            aria-label={t("tray.filterStatus")}
          >
            <option value="PENDING">{t("reassignments.PENDING")}</option>
            <option value="APPROVED">{t("reassignments.APPROVED")}</option>
            <option value="REJECTED">{t("reassignments.REJECTED")}</option>
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {t("tray.refresh")}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">{t("tray.loading")}</p>
      ) : items.length === 0 ? (
        <EmptyState icon={ArrowRightLeft} title={t("reassignments.empty")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {t("reassignments.colFrom")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("reassignments.colTo")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("reassignments.colReason")}
                </th>
                <th className="px-3 py-2 font-medium">{t("tray.colStatus")}</th>
                <th className="px-3 py-2 font-medium">
                  {t("reassignments.colRequested")}
                </th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.insurance_reassignment_request_id}
                  className="border-t"
                >
                  <td className="px-3 py-2 font-mono text-xs">
                    {item.from_user_id}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {item.to_user_id}
                  </td>
                  <td className="px-3 py-2">{item.reason ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      intent={REASSIGNMENT_INTENT[item.status] ?? "neutral"}
                      label={t(`reassignments.${item.status}`)}
                      size="sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {item.status === "PENDING" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={acting}
                          onClick={() =>
                            void approve(item.insurance_reassignment_request_id)
                          }
                        >
                          {t("reassignments.approve")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={acting}
                          onClick={() =>
                            setRejectTarget(
                              item.insurance_reassignment_request_id,
                            )
                          }
                        >
                          {t("reassignments.reject")}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={rejectTarget != null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reassignments.rejectTitle")}</DialogTitle>
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
              onClick={() => setRejectTarget(null)}
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
    </div>
  );
}
