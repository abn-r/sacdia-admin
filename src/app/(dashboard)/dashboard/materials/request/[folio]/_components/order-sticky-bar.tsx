"use client";

import { MoreVertical, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoneyFormat } from "@/components/materials/money-format";
import type { Orden } from "@/lib/types/materials";
import { ApproveButton } from "./approve-button";
import { CancelDialog } from "./cancel-dialog";
import { DeliverButton } from "./deliver-button";
import { useState } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrderStickyBarProps {
  orden: Orden;
  canApprove: boolean;
  canDeliver: boolean;
  linesResolved: number;
  linesTotal: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderStickyBar({
  orden,
  canApprove,
  canDeliver,
  linesResolved,
  linesTotal,
}: OrderStickyBarProps) {
  const { estado } = orden;
  const allResolved = linesTotal > 0 && linesResolved === linesTotal;
  const pending = Math.max(0, linesTotal - linesResolved);

  // External cancel dialog open state controlled by the dropdown menu item.
  const [cancelOpenKey, setCancelOpenKey] = useState(0);

  const showCancel =
    (estado === "en_revision" ||
      estado === "aprobada" ||
      estado === "pagada") &&
    canApprove;

  const cancelExtraWarning =
    estado === "pagada"
      ? "Cancelar después del pago generará una devolución pendiente."
      : estado === "aprobada"
        ? "Cancelar después de aprobar restaurará el stock reservado."
        : undefined;

  // For terminal states, hide the bar (no primary action, footer not useful).
  if (estado === "entregada" || estado === "cancelada") {
    return null;
  }

  // Primary CTA per estado
  let primary: React.ReactNode = null;
  if (estado === "en_revision" && canApprove) {
    primary = (
      <ApproveButton
        folio={orden.id}
        disabled={!allResolved}
        disabledReason={
          !allResolved
            ? `Resolvé ${pending} ${pending === 1 ? "partida" : "partidas"} antes de aprobar.`
            : undefined
        }
      />
    );
  } else if (estado === "pagada" && canDeliver) {
    primary = <DeliverButton folio={orden.id} />;
  } else if (estado === "aprobada") {
    primary = (
      <span className="text-sm text-muted-foreground">
        Esperando comprobante
      </span>
    );
  }

  return (
    <div className="sticky bottom-0 z-30 -mx-6 mt-6 flex h-16 items-center justify-between border-t border-border/60 bg-background/95 px-6 backdrop-blur xl:hidden lg:-mx-8 lg:px-8">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="font-mono font-semibold tabular-nums">
          <MoneyFormat centavos={orden.total_centavos} />
        </span>
      </div>

      <div className="flex items-center gap-2">
        {primary}
        {showCancel && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Más acciones"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    setCancelOpenKey((k) => k + 1);
                  }}
                >
                  <XCircle className="size-4" />
                  Cancelar solicitud
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Headless: dropdown item triggers the dialog by bumping the
                key so the CancelDialog mounts fresh and opens via the trigger. */}
            <CancelDialogHidden
              key={cancelOpenKey}
              triggerOnMount={cancelOpenKey > 0}
              folio={orden.id}
              extraWarning={cancelExtraWarning}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Headless cancel dialog wrapper ───────────────────────────────────────────

/**
 * Wraps CancelDialog so it can be opened imperatively from a DropdownMenuItem
 * (which closes its own portal on select). We mount a button-trigger off-screen
 * and click it via ref when `triggerOnMount` is true.
 */
function CancelDialogHidden({
  folio,
  extraWarning,
  triggerOnMount,
}: {
  folio: string;
  extraWarning?: string;
  triggerOnMount: boolean;
}) {
  return (
    <CancelDialog folio={folio} extraWarning={extraWarning}>
      <HiddenTrigger triggerOnMount={triggerOnMount} />
    </CancelDialog>
  );
}

function HiddenTrigger({ triggerOnMount }: { triggerOnMount: boolean }) {
  // Using a button with sr-only to fire the click programmatically on mount.
  return (
    <button
      type="button"
      ref={(el) => {
        if (el && triggerOnMount) {
          // Defer click so Radix portal mounts cleanly
          window.setTimeout(() => el.click(), 0);
        }
      }}
      className="sr-only"
      aria-hidden
      tabIndex={-1}
    >
      Cancelar
    </button>
  );
}
