"use client";

import { useState } from "react";
import { CheckCircle2, DollarSign, Loader2, Pencil, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  approveCamporeePayment,
  rejectCamporeePayment,
  approveUnionCamporeePayment,
  rejectUnionCamporeePayment,
} from "@/lib/api/camporees";
import type { CamporeePayment, PaymentType } from "@/lib/api/camporees";
import {
  CamporeeApprovalDialog,
  type ApprovalDialogMode,
} from "@/components/camporees/camporee-approval-dialog";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api/client";

// ─── Payment type badge ────────────────────────────────────────────────────────

function PaymentTypeBadge({ type, t }: { type: PaymentType; t: ReturnType<typeof useTranslations<"camporees">> }) {
  const typeLabels: Record<PaymentType, string> = {
    inscription: t("paymentsPanel.paymentTypeInscription"),
    materials: t("paymentsPanel.paymentTypeMaterials"),
    other: t("paymentsPanel.paymentTypeOther"),
  };
  const label = typeLabels[type] ?? type;
  return (
    <Badge variant="secondary" className="text-xs">
      {label}
    </Badge>
  );
}

// ─── Payment status badge ──────────────────────────────────────────────────────

function PaymentStatusBadge({ status, t }: { status?: string | null; t: ReturnType<typeof useTranslations<"camporees">> }) {
  if (!status) return null;
  const normalized = status.toLowerCase();

  if (normalized === "approved") {
    return <StatusBadge intent="success" label={t("paymentsPanel.statusApproved")} />;
  }

  if (normalized === "pending_approval") {
    return <StatusBadge intent="warning" label={t("paymentsPanel.statusPending")} />;
  }

  if (normalized === "rejected") {
    return <StatusBadge intent="destructive" label={t("paymentsPanel.statusRejected")} />;
  }

  return (
    <StatusBadge intent="neutral" label={status} className="text-xs capitalize" />
  );
}

// ─── Date helper ───────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}

// ─── Summary ───────────────────────────────────────────────────────────────────

interface PaymentSummaryProps {
  payments: CamporeePayment[];
  t: ReturnType<typeof useTranslations<"camporees">>;
}

function PaymentSummary({ payments, t }: PaymentSummaryProps) {
  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  const byType = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.payment_type] = (acc[p.payment_type] ?? 0) + p.amount;
    return acc;
  }, {});

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("paymentsPanel.summaryTotal")}
        </p>
        <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(total)}</p>
      </div>

      {/* By type */}
      {(["inscription", "materials", "other"] as PaymentType[]).map((key) => {
        const amount = byType[key] ?? 0;
        const typeLabels: Record<PaymentType, string> = {
          inscription: t("paymentsPanel.paymentTypeInscription"),
          materials: t("paymentsPanel.paymentTypeMaterials"),
          other: t("paymentsPanel.paymentTypeOther"),
        };
        const label = typeLabels[key];
        return (
          <div key={key} className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-muted-foreground">
              {formatCurrency(amount)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Dialog state ─────────────────────────────────────────────────────────────

type DialogState = {
  payment: CamporeePayment;
  mode: ApprovalDialogMode;
} | null;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CamporeePaymentsPanelProps {
  payments: CamporeePayment[];
  onEdit: (payment: CamporeePayment) => void;
  onPaymentsChange?: () => void;
  isUnionCamporee?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CamporeePaymentsPanel({
  payments,
  onEdit,
  onPaymentsChange,
  isUnionCamporee = false,
}: CamporeePaymentsPanelProps) {
  const t = useTranslations("camporees");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  async function handleApprove(payment: CamporeePayment) {
    const paymentUuid = payment.camporee_payment_id;
    if (!paymentUuid || approvingId !== null) return;
    setApprovingId(paymentUuid);
    try {
      if (isUnionCamporee) {
        await approveUnionCamporeePayment(paymentUuid);
      } else {
        await approveCamporeePayment(paymentUuid);
      }
      toast.success(
        payment.member_name
          ? t("paymentsPanel.approvedWithName", { name: payment.member_name })
          : t("paymentsPanel.approvedGeneric"),
      );
      onPaymentsChange?.();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : t("errors.approve_payment");
      toast.error(message);
    } finally {
      setApprovingId(null);
    }
  }

  async function handleRejectConfirm(rejectionReason?: string) {
    if (!dialog) return;
    const paymentUuid = dialog.payment.camporee_payment_id;
    if (!paymentUuid) throw new Error(t("paymentsPanel.errorNoPaymentUuid"));
    const payload = { rejection_reason: rejectionReason };
    if (isUnionCamporee) {
      await rejectUnionCamporeePayment(paymentUuid, payload);
    } else {
      await rejectCamporeePayment(paymentUuid, payload);
    }
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title={t("paymentsPanel.emptyTitle")}
        description={t("paymentsPanel.emptyDescription")}
      />
    );
  }

  const dialogPaymentName = dialog?.payment.member_name ?? t("paymentsPanel.fallbackPayment", { id: dialog?.payment.payment_id ?? "" });

  return (
    <>
      <div className="space-y-4">
        <PaymentSummary payments={payments} t={t} />

        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("paymentsPanel.colMember")}
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("paymentsPanel.colAmount")}
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("paymentsPanel.colType")}
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("paymentsPanel.colStatus")}
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("paymentsPanel.colReference")}
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("paymentsPanel.colDate")}
                </TableHead>
                <TableHead className="h-9 w-24 px-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => {
                const isPending = payment.status?.toLowerCase() === "pending_approval";
                const hasUuid = Boolean(payment.camporee_payment_id);
                const canApprove = isPending && hasUuid;
                const isApproving =
                  payment.camporee_payment_id != null &&
                  approvingId === payment.camporee_payment_id;

                return (
                  <TableRow key={payment.payment_id} className="hover:bg-muted/30">
                    <TableCell className="px-3 py-2.5 align-middle">
                      <span className="text-sm font-medium">
                        {payment.member_name ?? payment.member_id}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCurrency(payment.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      <PaymentTypeBadge type={payment.payment_type} t={t} />
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      <PaymentStatusBadge status={payment.status} t={t} />
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                      {payment.reference ?? "—"}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                      {formatDate(payment.paid_at ?? payment.created_at)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      <div className="flex items-center justify-end gap-1">
                        {canApprove && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-success hover:bg-success/10 hover:text-success"
                                  onClick={() => handleApprove(payment)}
                                  disabled={isApproving}
                                  aria-label={t("paymentsPanel.approveLabel")}
                                >
                                  {isApproving ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="size-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("paymentsPanel.approveLabel")}</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => setDialog({ payment, mode: "reject" })}
                                  aria-label={t("paymentsPanel.rejectLabel")}
                                >
                                  <XCircle className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("paymentsPanel.rejectLabel")}</TooltipContent>
                            </Tooltip>
                          </>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => onEdit(payment)}
                              aria-label={t("paymentsPanel.editLabel")}
                            >
                              <Pencil className="size-3.5" />
                              <span className="sr-only">{t("paymentsPanel.editLabel")}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("paymentsPanel.editLabel")}</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {dialog && (
        <CamporeeApprovalDialog
          open
          mode={dialog.mode}
          entityLabel={t("paymentsPanel.entityLabel")}
          entityName={dialogPaymentName}
          onOpenChange={(open) => { if (!open) setDialog(null); }}
          onConfirm={handleRejectConfirm}
          onSuccess={() => { setDialog(null); onPaymentsChange?.(); }}
        />
      )}
    </>
  );
}
