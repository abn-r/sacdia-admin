import Link from "next/link";
import { redirect } from "next/navigation";
import { Receipt, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { FolioPill } from "@/components/materiales/folio-pill";
import { MoneyFormat } from "@/components/materiales/money-format";
import { ComprobantesFilters } from "./_components/comprobantes-filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { listOrdenes } from "@/lib/api/materiales";
import { requireAdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permission-utils";
import { ApiError } from "@/lib/api/client";
import type { OrdenSummary } from "@/lib/types/materiales";

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveQ(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function resolvePage(raw: unknown): number {
  const n = typeof raw === "string" ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Client-side filter: narrow by folio or director name. */
function matchesQ(orden: OrdenSummary, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const folio = orden.folio_referencia?.toLowerCase() ?? "";
  const director = orden.director?.nombre?.toLowerCase() ?? "";
  return folio.includes(needle) || director.includes(needle);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ComprobantesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();

  // Guard: only users with validate-receipt permission can access this route
  if (!hasPermission(user, "materiales:validate-receipt")) {
    redirect("/dashboard");
  }

  const raw = await searchParams;
  const q = resolveQ(raw["q"]);
  const page = resolvePage(raw["page"]);

  let ordenes: OrdenSummary[] = [];
  let total = 0;
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    // Only aprobada orders can have pending comprobantes awaiting validation
    const result = await listOrdenes({
      estado: "aprobada",
      page,
      pageSize: PAGE_SIZE,
    });
    // Client-side filter by folio/director (backend /ordenes supports q but
    // we apply it here to avoid a round-trip since the dataset is small)
    const filtered = result.data.filter((o) => matchesQ(o, q));
    ordenes = filtered;
    total = q ? filtered.length : result.total;
  } catch (error) {
    if (error instanceof ApiError) {
      loadError = error.message;
      loadErrorStatus = error.status;
    } else {
      loadError = "Error al cargar las órdenes.";
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validación de comprobantes"
        description="Órdenes aprobadas en espera de confirmación de pago."
      />

      {/* Filters */}
      <ComprobantesFilters currentQ={q} />

      {/* Error state */}
      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {/* Empty state */}
      {!loadError && ordenes.length === 0 && (
        <EmptyState
          icon={<Receipt className="size-6 text-muted-foreground" aria-hidden="true" />}
          title="Sin órdenes pendientes"
          description={
            q
              ? "Ninguna orden aprobada coincide con la búsqueda."
              : "No hay órdenes pendientes de validación de pago."
          }
          variant={q ? "no-results" : "default"}
        />
      )}

      {/* Table */}
      {!loadError && ordenes.length > 0 && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Folio
                  </TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Director / Club
                  </TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                    Total
                  </TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Fecha aprobación
                  </TableHead>
                  <TableHead className="h-9 w-40 px-3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenes.map((orden) => (
                  <TableRow key={orden.id} className="hover:bg-muted/30">
                    <TableCell className="px-3 py-2.5 align-middle">
                      <FolioPill folio={orden.folio_referencia} />
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {orden.director?.nombre ?? "—"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {orden.director?.club ?? "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle text-right tabular-nums">
                      <MoneyFormat centavos={orden.total_centavos} />
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                      {/* OrdenSummary doesn't include approved_at; show created_at as proxy */}
                      {formatDate(orden.created_at)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/dashboard/materiales/comprobantes/${orden.folio_referencia ?? orden.id}`}
                        >
                          Revisar comprobantes
                          <ArrowRight className="ml-1.5 size-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination — only when not filtered (q bypasses server pagination) */}
          {!q && totalPages > 1 && (
            <DataTablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PAGE_SIZE}
            />
          )}
        </div>
      )}
    </div>
  );
}
