import { useTranslations } from "next-intl";
import { MoneyFormat } from "@/components/materials/money-format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import type { MaterialEstado, OrdenLine } from "@/lib/types/materials";
import { LineAvailabilityCell } from "./line-availability-form";

interface LinesTableProps {
  folio: string;
  lines: OrdenLine[];
  estado: MaterialEstado;
}

function LineName({ line, untitled }: { line: OrdenLine; untitled: string }) {
  const t = useTranslations("ops.materials.lines");
  return (
    <>
      <span className="block text-sm font-medium text-foreground">{line.product?.title ?? untitled}</span>
      <span className="block font-mono text-xs text-muted-foreground">{line.product?.sku ?? line.product_id}</span>
      {line.variant_option ? (
        <span className="block text-xs text-muted-foreground">{t("variant", { label: line.variant_option.label })}</span>
      ) : null}
    </>
  );
}

/** Order lines. In review each line is resolved in its own row. */
export function LinesTable({ folio, lines, estado }: LinesTableProps) {
  const t = useTranslations("ops.materials.lines");
  const isReview = estado === "en_revision";
  const resolved = lines.filter((l) => l.disponibilidad !== "pendiente").length;

  const cell = (line: OrdenLine) => (
    <LineAvailabilityCell
      folio={folio}
      lineId={line.id}
      productTitle={line.product?.title ?? t("untitled")}
      currentDisponibilidad={line.disponibilidad}
      currentQtyDisponible={line.qty_disponible}
      qty={line.qty}
      editable={isReview}
    />
  );

  return (
    <section aria-labelledby="mat-lines-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="mat-lines-heading" className="text-base font-semibold">
          {t("title")}
        </h2>
        {isReview && lines.length > 0 ? (
          <span aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
            {t("progress", { resolved, total: lines.length })}
          </span>
        ) : null}
      </div>

      {lines.length === 0 ? (
        <p className="rounded-xl bg-card px-5 py-8 text-center text-sm text-muted-foreground shadow-card">{t("empty")}</p>
      ) : (
        <>
          <DataTableShell className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">{t("product")}</TableHead>
                  <TableHead className="text-right">{t("qty")}</TableHead>
                  <TableHead>{t("availability")}</TableHead>
                  <TableHead className="text-right">{t("price")}</TableHead>
                  <TableHead className="pr-5 text-right">{t("amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="pl-5 whitespace-normal">
                      <LineName line={line} untitled={t("untitled")} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{line.qty}</TableCell>
                    <TableCell className="whitespace-normal">{cell(line)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <MoneyFormat centavos={line.price_centavos} />
                    </TableCell>
                    <TableCell className="pr-5 text-right font-medium tabular-nums">
                      <MoneyFormat centavos={line.line_total_centavos} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableShell>

          <ul className="divide-y rounded-xl bg-card shadow-card md:hidden">
            {lines.map((line) => (
              <li key={line.id} className="space-y-2 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <LineName line={line} untitled={t("untitled")} />
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    <MoneyFormat centavos={line.line_total_centavos} />
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground tabular-nums">
                  {t("qtyAt", { qty: line.qty })} <MoneyFormat centavos={line.price_centavos} />
                </p>
                {cell(line)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
