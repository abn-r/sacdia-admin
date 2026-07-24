import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Inbox } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { StatusBadge } from "@/components/materials/status-badge";
import { MoneyFormat } from "@/components/materials/money-format";
import { FolioPill } from "@/components/materials/folio-pill";
import { InboxFilters } from "./_components/inbox-filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { listOrders } from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permission-utils";
import { MATERIALS_READ } from "@/lib/auth/permissions";
import type { MaterialEstado } from "@/lib/types/materials";
import type { OrdenSummary } from "@/lib/types/materials";

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
  return `/dashboard/materials/request/${slug}`;
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

export default async function InboxPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  if (!hasPermission(user, MATERIALS_READ)) {
    redirect("/dashboard");
  }

  const t = await getTranslations("materials.pages.inbox");
  const raw = await searchParams;

  const estado = resolveEstado(raw["estado"]);
  const q = resolveQ(raw["q"]);
  const page = resolvePage(raw["page"]);

  let ordenes: OrdenSummary[] = [];
  let total = 0;
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    const result = await listOrders({
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
      loadError = t("loadError");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters = Boolean(q || (estado !== "all" && estado !== "en_revision"));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="space-y-4">
        <InboxFilters currentEstado={estado} currentQ={q} />

        {loadError && (
          <EndpointErrorBanner
            state={loadErrorStatus === 403 ? "forbidden" : "missing"}
            detail={loadError}
          />
        )}

        {!loadError && ordenes.length === 0 && (
          <EmptyState
            icon={<Inbox className="size-6 text-muted-foreground" aria-hidden="true" />}
            title={hasActiveFilters ? t("emptyFilteredTitle") : t("emptyTitle")}
            description={
              hasActiveFilters
                ? t("emptyFilteredDescription")
                : estado === "all" || estado === "en_revision"
                  ? t("emptyDescriptionPending")
                  : t("emptyDescriptionFiltered")
            }
            variant={hasActiveFilters || q ? "no-results" : "default"}
          />
        )}

        {!loadError && ordenes.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">{t("colFolio")}</TableHead>
                    <TableHead>{t("colDirector")}</TableHead>
                    <TableHead>{t("colStatus")}</TableHead>
                    <TableHead className="text-right">{t("colTotal")}</TableHead>
                    <TableHead>{t("colDate")}</TableHead>
                    <TableHead className="sticky right-0 z-20 w-[72px] border-l bg-background">
                      {t("colActions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenes.map((orden) => (
                    <TableRow key={orden.id}>
                      <TableCell className="pl-5 font-medium">
                        <Link
                          href={resolveDetailHref(orden)}
                          prefetch={false}
                          className="hover:text-primary hover:underline underline-offset-4"
                        >
                          <FolioPill folio={orden.folio_referencia} />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{orden.director.nombre}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {orden.director.club}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge estado={orden.estado} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <MoneyFormat centavos={orden.total_centavos} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(orden.created_at)}
                      </TableCell>
                      <TableCell className="sticky right-0 z-10 border-l bg-background">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={resolveDetailHref(orden)} prefetch={false}>
                            <Eye className="size-4" />
                            <span className="sr-only">{t("viewDetail")}</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <DataTablePagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={PAGE_SIZE}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
