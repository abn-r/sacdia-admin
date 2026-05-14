import { CheckCircle2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoneyFormat } from "@/components/materials/money-format";
import { cn } from "@/lib/utils";
import type { OrdenLine, MaterialEstado } from "@/lib/types/materials";
import { LineAvailabilityCell } from "./line-availability-form";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LinesTableProps {
  folio: string;
  lines: OrdenLine[];
  estado: MaterialEstado;
  subtotalCentavos: number;
  envioCentavos: number;
  totalCentavos: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LinesTable({
  folio,
  lines,
  estado,
  subtotalCentavos,
  envioCentavos,
  totalCentavos,
}: LinesTableProps) {
  const isEnRevision = estado === "en_revision";
  const resolved = lines.filter((l) => l.disponibilidad !== "pendiente").length;
  const total = lines.length;

  return (
    <section
      aria-labelledby="partidas-heading"
      className="mt-6 overflow-hidden rounded-lg border border-border/60 bg-card"
    >
      <header className="flex items-center justify-between border-b border-border/60 p-5">
        <h2
          id="partidas-heading"
          className="text-sm font-semibold uppercase tracking-wide"
        >
          Partidas
        </h2>
        {isEnRevision && total > 0 && (
          <div
            aria-live="polite"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span>
              {resolved} de {total}{" "}
              {total === 1 ? "partida resuelta" : "partidas resueltas"}
            </span>
            {resolved === total && (
              <CheckCircle2
                className="size-4 text-success"
                aria-label="Todas las partidas resueltas"
              />
            )}
          </div>
        )}
      </header>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Producto
              </TableHead>
              <TableHead className="h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                SKU
              </TableHead>
              <TableHead className="h-10 px-4 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cant.
              </TableHead>
              <TableHead className="h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Disponibilidad
              </TableHead>
              <TableHead className="h-10 px-4 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Precio
              </TableHead>
              <TableHead className="h-10 px-4 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Importe
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => {
              const isResolved =
                line.disponibilidad !== "pendiente" && isEnRevision;
              return (
                <TableRow
                  key={line.id}
                  className={cn(
                    "h-14",
                    isResolved && "bg-muted/20",
                  )}
                >
                  <TableCell className="px-4 align-middle">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {line.product?.title ?? "—"}
                      </span>
                      {line.variant_option && (
                        <span className="text-xs text-muted-foreground">
                          variante: {line.variant_option.label}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 align-middle">
                    <span className="font-mono text-xs text-muted-foreground">
                      {line.product?.sku ?? line.product_id}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 text-right align-middle font-mono tabular-nums">
                    {line.qty}
                  </TableCell>
                  <TableCell className="px-4 align-middle">
                    <LineAvailabilityCell
                      folio={folio}
                      lineId={line.id}
                      currentDisponibilidad={line.disponibilidad}
                      currentQtyDisponible={line.qty_disponible}
                      qty={line.qty}
                      editable={isEnRevision}
                    />
                  </TableCell>
                  <TableCell className="px-4 text-right align-middle font-mono tabular-nums">
                    <MoneyFormat centavos={line.price_centavos} />
                  </TableCell>
                  <TableCell className="px-4 text-right align-middle font-mono font-medium tabular-nums">
                    <MoneyFormat centavos={line.line_total_centavos} />
                  </TableCell>
                </TableRow>
              );
            })}

            {lines.length > 0 && (
              <>
                <TableRow className="bg-muted/30 font-medium hover:bg-muted/30">
                  <TableCell colSpan={5} className="px-4 text-right text-sm">
                    Subtotal
                  </TableCell>
                  <TableCell className="px-4 text-right font-mono tabular-nums">
                    <MoneyFormat centavos={subtotalCentavos} />
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/30 font-medium hover:bg-muted/30">
                  <TableCell colSpan={5} className="px-4 text-right text-sm">
                    Envío
                  </TableCell>
                  <TableCell className="px-4 text-right font-mono tabular-nums">
                    <MoneyFormat centavos={envioCentavos} />
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/40 text-base font-semibold hover:bg-muted/40">
                  <TableCell colSpan={5} className="px-4 text-right">
                    Total
                  </TableCell>
                  <TableCell className="px-4 text-right font-mono tabular-nums">
                    <MoneyFormat centavos={totalCentavos} />
                  </TableCell>
                </TableRow>
              </>
            )}

            {lines.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No hay partidas en esta solicitud.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
