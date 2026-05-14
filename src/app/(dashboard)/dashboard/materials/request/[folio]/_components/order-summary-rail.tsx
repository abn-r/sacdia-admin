import { MoneyFormat } from "@/components/materials/money-format";
import type { Orden } from "@/lib/types/materials";
import { OrderActions } from "./order-actions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrderSummaryRailProps {
  orden: Orden;
  canApprove: boolean;
  canValidateReceipt: boolean;
  canDeliver: boolean;
  linesResolved: number;
  linesTotal: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderSummaryRail({
  orden,
  canApprove,
  canValidateReceipt,
  canDeliver,
  linesResolved,
  linesTotal,
}: OrderSummaryRailProps) {
  const totalPieces = orden.lines.reduce((acc, l) => acc + l.qty, 0);
  const nLines = orden.lines.length;

  return (
    <aside className="hidden w-[340px] shrink-0 xl:flex xl:flex-col xl:gap-4">
      <div className="sticky top-6 flex flex-col gap-4">
        {/* Resumen */}
        <section
          aria-labelledby="resumen-heading"
          className="rounded-lg border border-border/60 bg-card p-5"
        >
          <h3
            id="resumen-heading"
            className="mb-3 text-xs uppercase tracking-wide text-muted-foreground"
          >
            Resumen
          </h3>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-mono tabular-nums">
                <MoneyFormat centavos={orden.subtotal_centavos} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Envío</dt>
              <dd className="font-mono tabular-nums">
                <MoneyFormat centavos={orden.envio_centavos} />
              </dd>
            </div>
            <div className="my-2 border-t border-border/40" />
            <div className="flex items-baseline justify-between">
              <dt className="text-sm font-medium">Total</dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">
                <MoneyFormat centavos={orden.total_centavos} />
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-muted-foreground">
            {nLines} {nLines === 1 ? "partida" : "partidas"} · {totalPieces}{" "}
            {totalPieces === 1 ? "pieza" : "piezas"}
          </p>
        </section>

        {/* Acciones */}
        <section
          aria-labelledby="acciones-heading"
          className="rounded-lg border border-border/60 bg-card p-5"
        >
          <h3
            id="acciones-heading"
            className="mb-3 text-xs uppercase tracking-wide text-muted-foreground"
          >
            Acciones
          </h3>
          <OrderActions
            orden={orden}
            canApprove={canApprove}
            canValidateReceipt={canValidateReceipt}
            canDeliver={canDeliver}
            linesResolved={linesResolved}
            linesTotal={linesTotal}
            fullWidth
          />
        </section>
      </div>
    </aside>
  );
}
