"use client";

import { Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign } from "lucide-react";
import type { Finance } from "@/lib/api/finances";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(cents: number): string {
  const pesos = cents / 100;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(pesos);
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

const MONTH_NAMES: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function TransactionsTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            {["Fecha", "Descripción", "Categoría", "Tipo", "Monto", ""].map((h) => (
              <TableHead
                key={h}
                className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="px-3 py-2.5">
                <Skeleton className="size-8 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TransactionsTableProps {
  items: Finance[];
  onEdit: (finance: Finance) => void;
  onDelete: (finance: Finance) => void;
}

export function TransactionsTable({ items, onEdit, onDelete }: TransactionsTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Sin movimientos"
        description="No se encontraron movimientos financieros para los filtros seleccionados."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Fecha
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Descripción
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Categoría
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Período
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tipo
            </TableHead>
            <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Monto
            </TableHead>
            <TableHead className="h-9 w-12 px-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((finance) => {
            const isIncome = finance.finances_categories?.type === 0;

            return (
              <TableRow key={finance.finance_id} className="hover:bg-muted/30">
                <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                  {formatDate(finance.finance_date)}
                </TableCell>
                <TableCell className="max-w-xs px-3 py-2.5 align-middle">
                  <span className="truncate text-sm">
                    {finance.description ?? <span className="text-muted-foreground">—</span>}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <span className="text-sm">
                    {finance.finances_categories?.name ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground tabular-nums">
                  {MONTH_NAMES[finance.month] ?? finance.month}/{finance.year}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <Badge variant={isIncome ? "default" : "destructive"} className={isIncome ? "bg-green-600 text-white" : ""}>
                    {isIncome ? "Ingreso" : "Egreso"}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-right">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      isIncome ? "text-success" : "text-destructive"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {formatAmount(Math.abs(finance.amount))}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Acciones</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(finance)}>
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(finance)}
                      >
                        <Trash2 className="size-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
