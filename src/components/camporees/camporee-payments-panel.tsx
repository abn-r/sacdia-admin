"use client";

import { useState } from "react";
import { CheckCircle2, DollarSign, Loader2, Pencil, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
} from "@/lib/api/camporees";
import type { CamporeePayment, PaymentType } from "@/lib/api/camporees";
import {
  CamporeeApprovalDialog,
  type ApprovalDialogMode,
} from "@/components/camporees/camporee-approval-dialog";
import { ApiError } from "@/lib/api/client";

// ─── Payment type badge ────────────────────────────────────────────────────────

const PAYMENT_TYPE_CONFIG: Record<
  PaymentType,
  { label: string; className: string }
> = {
  inscription: {
    label: "Inscripcion",
    className:
      "border-blue-400/50 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400",
  },
  materials: {
    label: "Materiales",
    className:
      "border-purple-400/50 bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400",
  },
  other: {
    label: "Otro",
    className: "",
  },
};

function PaymentTypeBadge({ type }: { type: PaymentType }) {
  const config = PAYMENT_TYPE_CONFIG[type] ?? PAYMENT_TYPE_CONFIG.other;
  return (
    <Badge variant="outline" className={`text-xs ${config.className}`}>
      {config.label}
    </Badge>
  );
}

// ─── Payment status badge ──────────────────────────────────────────────────────

function PaymentStatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const normalized = status.toLowerCase();

  if (normalized === "approved") {
    return (
      <Badge
        variant="outline"
        className="border-green-400/50 bg-green-50 text-xs text-green-700 dark:bg-green-950/20 dark:text-green-400"
      >
        Aprobado
      </Badge>
    );
  }

  if (normalized === "pending_approval") {
    return (
      <Badge
        variant="outline"
        className="border-yellow-400/50 bg-yellow-50 text-xs text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
      >
        Pendiente
      </Badge>
    );
  }

  if (normalized === "rejected") {
    return (
      <Badge
        variant="outline"
        className="border-destructive/40 bg-destructive/5 text-xs text-destructive"
      >
        Rechazado
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-xs capitalize">
      {status}
    </Badge>
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
}

function PaymentSummary({ payments }: PaymentSummaryProps) {
  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  const byType = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.payment_type] = (acc[p.payment_type] ?? 0) + p.amount;
    return acc;
  }, {});

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Total recaudado
        </p>
        <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(total)}</p>
      </div>

      {/* By type */}
      {(["inscription", "materials", "other"] as PaymentType[]).map((key) => {
        const amount = byType[key] ?? 0;
        const config = PAYMENT_TYPE_CONFIG[key];
        return (
          <div key={key} className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {config.label}
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
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CamporeePaymentsPanel({
  payments,
  onEdit,
  onPaymentsChange,
}: CamporeePaymentsPanelProps) {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  async function handleApprove(payment: CamporeePayment) {
    const paymentUuid = payment.camporee_payment_id;
    if (!paymentUuid || approvingId !== null) return;
    setApprovingId(paymentUuid);
    try {
      await approveCamporeePayment(paymentUuid);
      toast.success(
        payment.member_name
          ? `Pago de "${payment.member_name}" aprobado`
          : "Pago aprobado",
      );
      onPaymentsChange?.();
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo aprobar el pago";
      toast.error(message);
    } finally {
      setApprovingId(null);
    }
  }

  async function handleRejectConfirm(rejectionReason?: string) {
    if (!dialog) return;
    const paymentUuid = dialog.payment.camporee_payment_id;
    if (!paymentUuid) throw new Error("UUID de pago no disponible");
    await rejectCamporeePayment(paymentUuid, { rejection_reason: rejectionReason });
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Sin pagos registrados"
        description="No hay pagos registrados para este camporee todavia."
      />
    );
  }

  const dialogPaymentName = dialog?.payment.member_name ?? `Pago #${dialog?.payment.payment_id}`;

  return (
    <>
      <div className="space-y-4">
        <PaymentSummary payments={payments} />

        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Miembro
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Monto
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tipo
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Estado
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Referencia
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fecha
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
                      <PaymentTypeBadge type={payment.payment_type} />
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      <PaymentStatusBadge status={payment.status} />
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
                                  aria-label="Aprobar pago"
                                >
                                  {isApproving ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="size-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Aprobar pago</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => setDialog({ payment, mode: "reject" })}
                                  aria-label="Rechazar pago"
                                >
                                  <XCircle className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Rechazar pago</TooltipContent>
                            </Tooltip>
                          </>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => onEdit(payment)}
                              aria-label="Editar pago"
                            >
                              <Pencil className="size-3.5" />
                              <span className="sr-only">Editar</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar pago</TooltipContent>
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
          entityLabel="Pago"
          entityName={dialogPaymentName}
          onOpenChange={(open) => { if (!open) setDialog(null); }}
          onConfirm={handleRejectConfirm}
          onSuccess={() => { setDialog(null); onPaymentsChange?.(); }}
        />
      )}
    </>
  );
}
