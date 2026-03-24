"use client";

import { DollarSign, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import type { CamporeePayment, PaymentType } from "@/lib/api/camporees";

// ─── Payment type badge ────────────────────────────────────────────────────────

const PAYMENT_TYPE_CONFIG: Record<
  PaymentType,
  { label: string; className: string }
> = {
  inscription: {
    label: "Inscripción",
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

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CamporeePaymentsPanelProps {
  payments: CamporeePayment[];
  onEdit: (payment: CamporeePayment) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CamporeePaymentsPanel({
  payments,
  onEdit,
}: CamporeePaymentsPanelProps) {
  if (payments.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Sin pagos registrados"
        description="No hay pagos registrados para este camporee todavía."
      />
    );
  }

  return (
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
                Referencia
              </TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Fecha
              </TableHead>
              <TableHead className="h-9 w-16 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
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
                <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                  {payment.reference ?? "—"}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                  {formatDate(payment.paid_at ?? payment.created_at)}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(payment)}
                    title="Editar pago"
                  >
                    <Pencil className="size-3.5" />
                    <span className="sr-only">Editar</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
