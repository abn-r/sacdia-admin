import Link from "next/link";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EstadoBadge } from "@/components/materiales/estado-badge";
import { MoneyFormat } from "@/components/materiales/money-format";
import { FolioPill } from "@/components/materiales/folio-pill";
import { BandejaFilters } from "./_components/bandeja-filters";
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
import { ApiError } from "@/lib/api/client";
import type { MaterialEstado } from "@/lib/types/materiales";
import type { OrdenSummary } from "@/lib/types/materiales";

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 20;

const VALID_ESTADOS: Array<MaterialEstado | "all"> = [
  "all",
  "en_revision",
  "aprobada",
  "pagada",
  "entregada",
  "cancelada",
];

function resolveEstado(raw: unknown): MaterialEstado | "all" {
  if (typeof raw === "string" && VALID_ESTADOS.includes(raw as MaterialEstado)) {
    return raw as MaterialEstado | "all";
  }
  return "en_revision";
}

function resolveQ(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function resolvePage(raw: unknown): number {
  const n = typeof raw === "string" ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * Builds the href for the row detail link.
 * Uses folio_referencia when available (approved+), falls back to UUID.
 */
function resolveDetailHref(orden: OrdenSummary): string {
  const slug = orden.folio_referencia ?? orden.id;
  return `/dashboard/materiales/solicitud/${slug}`;
}

function formatDate(iso: string): string {
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BandejaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;

  const estado = resolveEstado(raw["estado"]);
  const q = resolveQ(raw["q"]);
  const page = resolvePage(raw["page"]);

  let ordenes: OrdenSummary[] = [];
  let total = 0;
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    const result = await listOrdenes({
      estado,
      q: q || undefined,
      page,
      pageSize: PAGE_SIZE,
    });
    ordenes = result.data;
    total = result.total;
  } catch (error) {
    if (error instanceof ApiError) {
      loadError = error.message;
      loadErrorStatus = error.status;
    } else {
      loadError = "Error al cargar las solicitudes.";
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bandeja de solicitudes"
        description="Gestión de pedidos de materiales enviados por directores de club."
      />

      {/* Filters */}
      <BandejaFilters currentEstado={estado} currentQ={q} />

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
          icon={Inbox}
          title="Sin solicitudes"
          description={
            estado === "all" || estado === "en_revision"
              ? "No hay solicitudes pendientes de revisión."
              : "No hay solicitudes con el estado y filtros seleccionados."
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
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Estado
                  </TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground text-right">
                    Total
                  </TableHead>
                  <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Fecha
                  </TableHead>
                  <TableHead className="h-9 w-20 px-3" />
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
                          {orden.director.nombre}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {orden.director.club}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      <EstadoBadge estado={orden.estado} />
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle text-right tabular-nums">
                      <MoneyFormat centavos={orden.total_centavos} />
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                      {formatDate(orden.created_at)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 align-middle">
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={resolveDetailHref(orden)}>
                          <span className="sr-only">Ver solicitud</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
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
