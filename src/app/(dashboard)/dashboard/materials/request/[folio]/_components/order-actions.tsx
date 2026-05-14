import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Orden } from "@/lib/types/materials";
import { ApproveButton } from "./approve-button";
import { CancelDialog } from "./cancel-dialog";
import { DeliverButton } from "./deliver-button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    const day = new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
    const time = new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    return `${day} · ${time}`;
  } catch {
    return iso;
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrderActionsProps {
  orden: Orden;
  canApprove: boolean;
  canValidateReceipt: boolean;
  canDeliver: boolean;
  linesResolved: number;
  linesTotal: number;
  /** Use full-width buttons (right rail). */
  fullWidth?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderActions({
  orden,
  canApprove,
  canDeliver,
  linesResolved,
  linesTotal,
  fullWidth = true,
}: OrderActionsProps) {
  const { estado } = orden;
  const allResolved = linesTotal > 0 && linesResolved === linesTotal;
  const pending = Math.max(0, linesTotal - linesResolved);

  // ─── en_revision ───────────────────────────────────────────────────────────
  if (estado === "en_revision") {
    if (!canApprove) {
      return (
        <p className="text-sm text-muted-foreground">
          No tenés permisos para aprobar esta solicitud.
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        <ApproveButton
          folio={orden.id}
          disabled={!allResolved}
          disabledReason={
            !allResolved
              ? `Resolvé ${pending} ${pending === 1 ? "partida" : "partidas"} antes de aprobar.`
              : undefined
          }
          fullWidth={fullWidth}
        />
        <CancelDialog folio={orden.id}>
          <Button variant="outline" size="sm" className={fullWidth ? "w-full" : undefined}>
            <XCircle className="size-4" />
            Cancelar solicitud
          </Button>
        </CancelDialog>
        {!allResolved && (
          <p className="mt-1 text-xs text-muted-foreground">
            Resolvé {pending} {pending === 1 ? "partida" : "partidas"} antes de aprobar.
          </p>
        )}
      </div>
    );
  }

  // ─── aprobada ──────────────────────────────────────────────────────────────
  if (estado === "aprobada") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <span>Esperando comprobante de pago</span>
        </div>
        {canApprove && (
          <CancelDialog
            folio={orden.id}
            extraWarning="Cancelar después de aprobar restaurará el stock reservado y notificará al director."
          >
            <Button variant="outline" size="sm" className={fullWidth ? "w-full" : undefined}>
              <XCircle className="size-4" />
              Cancelar solicitud
            </Button>
          </CancelDialog>
        )}
      </div>
    );
  }

  // ─── pagada ────────────────────────────────────────────────────────────────
  if (estado === "pagada") {
    return (
      <div className="flex flex-col gap-2">
        {canDeliver && <DeliverButton folio={orden.id} fullWidth={fullWidth} />}
        {canApprove && (
          <CancelDialog
            folio={orden.id}
            extraWarning="Cancelar después del pago generará una devolución pendiente que deberá procesarse manualmente."
          >
            <Button variant="outline" size="sm" className={fullWidth ? "w-full" : undefined}>
              <XCircle className="size-4" />
              Cancelar solicitud
            </Button>
          </CancelDialog>
        )}
      </div>
    );
  }

  // ─── entregada ─────────────────────────────────────────────────────────────
  if (estado === "entregada") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-success/30 bg-success/10 p-4">
        <CheckCircle2 className="size-5 shrink-0 text-success-foreground" />
        <div>
          <div className="text-sm font-medium text-success-foreground">
            Entregada
          </div>
          <div className="text-sm text-success-foreground/80">
            {formatDateTime(orden.delivered_at)}
          </div>
        </div>
      </div>
    );
  }

  // ─── cancelada ─────────────────────────────────────────────────────────────
  if (estado === "cancelada") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4">
        <XCircle className="size-5 shrink-0 text-destructive" />
        <div className="space-y-1">
          <div className="text-sm font-medium text-destructive">
            Cancelada
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDateTime(orden.cancelled_at)}
          </div>
          {orden.cancel_reason && (
            <p className="text-sm italic text-muted-foreground">
              “{orden.cancel_reason}”
            </p>
          )}
          {orden.refund_pending && (
            <p className="text-xs font-medium text-warning-foreground">
              Devolución pendiente
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
