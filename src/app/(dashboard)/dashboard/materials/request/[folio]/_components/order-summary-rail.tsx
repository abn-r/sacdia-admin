import { useFormatter, useTranslations } from "next-intl";
import { MoneyFormat } from "@/components/materials/money-format";
import { StatusBadge } from "@/components/materials/status-badge";
import { SACDIA_DISPLAY_TIMEZONE } from "@/lib/format-locale";
import { orderNextStep } from "@/lib/materials/order-state";
import type { Orden } from "@/lib/types/materials";
import { OrderActions } from "./order-actions";

interface OrderSummaryRailProps {
  orden: Orden;
  directorName: string;
  canApprove: boolean;
  canDeliver: boolean;
  linesResolved: number;
  linesTotal: number;
  pendingReceipts: number;
}

/**
 * Right rail of the order detail: totals, the CURRENT state with the one thing
 * that is missing to advance (no fixed timeline), and the actions.
 */
export function OrderSummaryRail({
  orden,
  directorName,
  canApprove,
  canDeliver,
  linesResolved,
  linesTotal,
  pendingReceipts,
}: OrderSummaryRailProps) {
  const t = useTranslations("ops.materials");
  const format = useFormatter();
  const pieces = orden.lines.reduce((acc, l) => acc + l.qty, 0);
  const allResolved = linesTotal > 0 && linesResolved === linesTotal;
  const next = orderNextStep({ estado: orden.estado, linesTotal, linesResolved, pendingReceipts });

  const date = (iso: string | null) =>
    iso
      ? format.dateTime(new Date(iso), { day: "numeric", month: "short", timeZone: SACDIA_DISPLAY_TIMEZONE })
      : null;

  let nextText: string;
  switch (next.key) {
    case "resolveLines":
      nextText = t("next.resolveLines", { count: next.count });
      break;
    case "receiptToConfirm":
      nextText = t("next.receiptToConfirm", { count: next.count });
      break;
    default:
      nextText = t(`next.${next.key}`);
  }

  // The date that belongs to the current state, never the whole history.
  const stamp =
    orden.estado === "aprobada"
      ? date(orden.approved_at)
      : orden.estado === "pagada"
        ? date(orden.paid_at)
        : orden.estado === "entregada"
          ? date(orden.delivered_at)
          : orden.estado === "cancelada"
            ? date(orden.cancelled_at)
            : null;

  return (
    <aside className="order-first space-y-4 xl:sticky xl:top-6 xl:order-none xl:self-start">
      <section aria-labelledby="mat-rail-summary" className="rounded-xl bg-card p-5 shadow-card">
        <h2 id="mat-rail-summary" className="mb-3 text-xs font-medium text-muted-foreground">
          {t("rail.summary")}
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("lines.subtotal")}</dt>
            <dd className="tabular-nums">
              <MoneyFormat centavos={orden.subtotal_centavos} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("lines.shipping")}</dt>
            <dd className="tabular-nums">
              <MoneyFormat centavos={orden.envio_centavos} />
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t pt-2">
            <dt className="font-medium">{t("lines.total")}</dt>
            <dd className="text-lg font-semibold tabular-nums">
              <MoneyFormat centavos={orden.total_centavos} />
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">{t("rail.counts", { lines: orden.lines.length, pieces })}</p>
      </section>

      <section aria-labelledby="mat-rail-state" className="space-y-3 rounded-xl bg-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 id="mat-rail-state" className="text-xs font-medium text-muted-foreground">
            {t("rail.state")}
          </h2>
          <StatusBadge estado={orden.estado} />
        </div>
        <p className="text-sm" data-slot="order-next-step">
          {nextText}
        </p>
        {stamp ? (
          <p className="text-xs text-muted-foreground">
            {t(`rail.since.${orden.estado}`, { date: stamp })}
          </p>
        ) : null}
        {orden.estado === "cancelada" && orden.cancel_reason ? (
          <p className="text-sm text-muted-foreground">{t("rail.cancelReason", { reason: orden.cancel_reason })}</p>
        ) : null}
        {orden.estado === "cancelada" && orden.refund_pending ? (
          <p className="text-sm text-warning-foreground">{t("rail.refundPending")}</p>
        ) : null}
        {orden.estado === "en_revision" && !canApprove ? (
          <p className="text-xs text-muted-foreground">{t("rail.noApprovePermission")}</p>
        ) : null}
        {orden.estado === "pagada" && !canDeliver ? (
          <p className="text-xs text-muted-foreground">{t("rail.noDeliverPermission")}</p>
        ) : null}
        <OrderActions
          orderId={orden.id}
          folio={orden.folio_referencia ?? orden.id.slice(0, 8)}
          estado={orden.estado}
          totalCentavos={orden.total_centavos}
          directorName={directorName}
          pieces={pieces}
          canApprove={canApprove}
          canDeliver={canDeliver}
          allResolved={allResolved}
        />
      </section>
    </aside>
  );
}
