import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoneyFormat } from "@/components/materiales/money-format";
import { LineAvailabilityForm } from "./line-availability-form";
import type { OrdenLine, MaterialEstado } from "@/lib/types/materiales";

// ─── Disponibilidad label ─────────────────────────────────────────────────────

const DISP_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  disponible: "Disponible",
  parcial: "Parcial",
  agotado: "Agotado",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface LinesTableProps {
  folio: string;
  lines: OrdenLine[];
  estado: MaterialEstado;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LinesTable({ folio, lines, estado }: LinesTableProps) {
  const isEditable = estado === "en_revision";

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Producto
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              SKU
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
              Cant.
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Disponibilidad
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
              Qty disp.
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
              Precio u.
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
              Total línea
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id} className="hover:bg-muted/30">
              <TableCell className="px-3 py-2.5 align-middle">
                <span className="text-sm font-medium">
                  {line.product.title}
                </span>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <span className="font-mono text-xs text-muted-foreground">
                  {line.product.sku}
                </span>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-right tabular-nums">
                {line.qty}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                {isEditable ? (
                  <LineAvailabilityForm
                    folio={folio}
                    lineId={line.id}
                    currentDisponibilidad={line.disponibilidad}
                    currentQtyDisponible={line.qty_disponible}
                    qty={line.qty}
                  />
                ) : (
                  <span className="text-sm">
                    {DISP_LABELS[line.disponibilidad] ?? line.disponibilidad}
                  </span>
                )}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-right tabular-nums">
                {line.qty_disponible != null ? line.qty_disponible : "—"}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-right">
                <MoneyFormat centavos={line.price_centavos} />
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-right">
                <MoneyFormat centavos={line.line_total_centavos} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
