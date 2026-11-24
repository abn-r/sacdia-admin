import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState, ErrorStateTableRow } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { PageHeader } from "@/components/shared/page-header";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { UrlTabs } from "@/components/shared/url-tabs";
import { FolioPill } from "@/components/materials/folio-pill";
import { MoneyFormat } from "@/components/materials/money-format";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listOrders } from "@/lib/api/materials";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { SACDIA_DISPLAY_TIMEZONE } from "@/lib/format-locale";
import {
  INBOX_TAB_ORDER,
  daysSince,
  estadoForTab,
  resolveClosedFilter,
  resolveInboxTab,
  type InboxTab,
} from "@/lib/materials/order-state";
import type { MaterialEstado, OrdenSummary } from "@/lib/types/materials";
import { InboxFilters } from "./_components/inbox-filters";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const LIMIT_OPTIONS = [20, 50, 100];

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

function resolvePage(raw: unknown): number {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function resolveLimit(raw: unknown): number {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  return LIMIT_OPTIONS.includes(n) ? n : LIMIT_OPTIONS[0]!;
}

function detailHref(orden: OrdenSummary): string {
  return `/dashboard/materials/request/${orden.folio_referencia ?? orden.id}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ops.materials.queue");
  return { title: t("title") };
}

export default async function InboxPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAdminUser();
  const canInbox = canViewScreen(user, "materials-inbox");
  // The receipts tab keeps the old gate: the permission to validate receipts.
  const canReceipts = canViewScreen(user, "materials-receipts");
  if (!canInbox && !canReceipts) redirect("/dashboard");

  const t = await getTranslations("ops.materials");
  const tInbox = await getTranslations("materials.pages.inbox");
  const format = await getFormatter();
  const raw = await searchParams;

  const available = INBOX_TAB_ORDER.filter((tab) => (tab === "receipts" ? canReceipts : canInbox));
  const tab = resolveInboxTab(first(raw["tab"]), available) as InboxTab;
  const closed = resolveClosedFilter(first(raw["closed"]));
  const q = (first(raw["q"]) ?? "").trim();
  const page = resolvePage(first(raw["page"]));
  const limit = resolveLimit(first(raw["limit"]));
  const estado = estadoForTab(tab, closed);

  // Counts of the three working tabs + the list of the active one, in parallel.
  const countTabs = available.filter((x): x is Exclude<InboxTab, "closed"> => x !== "closed");
  const [countResults, listResult] = await Promise.all([
    Promise.allSettled(
      countTabs.map((x) => listOrders({ estado: estadoForTab(x, closed), page: 1, pageSize: 1 })),
    ),
    listOrders({ estado, q: q || undefined, page, pageSize: limit }).then(
      (result) => ({ ok: true as const, result }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
  ]);

  const counts: Partial<Record<InboxTab, number>> = {};
  countTabs.forEach((x, i) => {
    const r = countResults[i];
    if (r && r.status === "fulfilled") counts[x] = r.value.total;
  });

  const loadFailure: ErrorStateFromError | null = listResult.ok ? null : errorStateFromError(listResult.error);
  const ordenes = listResult.ok ? listResult.result.data : [];
  const total = listResult.ok ? listResult.result.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // The description is the finding, only when the numbers are real.
  const findingParts: string[] = [];
  if (counts.review !== undefined && canInbox) findingParts.push(t("queue.findingReview", { count: counts.review }));
  if (counts.receipts !== undefined && canReceipts) findingParts.push(t("queue.findingReceipts", { count: counts.receipts }));
  const description = findingParts.length > 0 ? findingParts.join(" · ") : undefined;

  const isClosed = tab === "closed";
  const colCount = isClosed ? 7 : 6;
  const estadoLabels = {
    en_revision: tInbox("statusOptions.en_revision"),
    aprobada: tInbox("statusOptions.aprobada"),
    pagada: tInbox("statusOptions.pagada"),
    entregada: tInbox("statusOptions.entregada"),
    cancelada: tInbox("statusOptions.cancelada"),
  } satisfies Record<MaterialEstado, string>;
  const actionLabel = t(`queue.action.${tab}`);

  const waitOrDate = (orden: OrdenSummary) =>
    isClosed
      ? format.dateTime(new Date(orden.created_at), { day: "numeric", month: "short", timeZone: SACDIA_DISPLAY_TIMEZONE })
      : t("queue.wait", { days: daysSince(orden.created_at) });

  return (
    <div className="space-y-6">
      <PageHeader title={t("queue.title")} description={description} />

      <div className="space-y-4">
        <UrlTabs
          ariaLabel={t("queue.tabsLabel")}
          defaultValue={available[0] ?? "review"}
          tabs={available.map((x) => ({
            value: x,
            label: t(`queue.tabs.${x}`),
            ...(counts[x] !== undefined ? { count: counts[x] } : {}),
          }))}
        />

        <InboxFilters currentQ={q} {...(isClosed ? { closedFilter: closed } : {})} />

        {!loadFailure && ordenes.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-6 text-muted-foreground" aria-hidden="true" />}
            title={q ? tInbox("emptyFilteredTitle") : t(`queue.empty.${tab}.title`)}
            description={q ? tInbox("emptyFilteredDescription") : t(`queue.empty.${tab}.description`)}
            variant={q ? "no-results" : "default"}
          />
        ) : (
          <>
            <DataTableShell className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">{tInbox("colFolio")}</TableHead>
                    <TableHead>{t("queue.colDirector")}</TableHead>
                    {isClosed ? <TableHead>{tInbox("colStatus")}</TableHead> : null}
                    <TableHead className="text-right">{tInbox("colTotal")}</TableHead>
                    <TableHead className="text-right">{isClosed ? tInbox("colDate") : t("queue.colWait")}</TableHead>
                    <RowActionsHead className="w-44" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadFailure ? (
                    <ErrorStateTableRow colSpan={colCount} kind={loadFailure.kind} detail={loadFailure.detail} retry />
                  ) : (
                    ordenes.map((orden) => (
                      <TableRow key={orden.id}>
                        <TableCell className="pl-5 font-medium">
                          <Link
                            href={detailHref(orden)}
                            prefetch={false}
                            className="underline-offset-4 hover:text-primary hover:underline"
                          >
                            <FolioPill folio={orden.folio_referencia} />
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{orden.director.nombre}</p>
                            <p className="truncate text-xs text-muted-foreground">{orden.director.club}</p>
                          </div>
                        </TableCell>
                        {isClosed ? (
                          <TableCell>
                            <ExceptionStatus
                              value={orden.estado}
                              normal={["entregada"]}
                              labels={estadoLabels}
                              intents={{ cancelada: "neutral" }}
                            />
                          </TableCell>
                        ) : null}
                        <TableCell className="text-right tabular-nums">
                          <MoneyFormat centavos={orden.total_centavos} />
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                          {waitOrDate(orden)}
                        </TableCell>
                        <TableCell>
                          <RowActions
                            label={orden.folio_referencia ?? orden.director.nombre}
                            actions={[]}
                            primary={
                              <Button asChild variant={isClosed ? "ghost" : "outline"} size="sm">
                                <Link href={detailHref(orden)} prefetch={false}>
                                  {actionLabel}
                                </Link>
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </DataTableShell>

            {/* <md: two-line rows instead of a sideways-scrolling table */}
            {loadFailure ? (
              <div className="md:hidden">
                <ErrorState kind={loadFailure.kind} detail={loadFailure.detail} retry />
              </div>
            ) : (
              <ul className="divide-y rounded-xl bg-card shadow-card md:hidden">
                {ordenes.map((orden) => (
                  <li key={orden.id}>
                    <Link href={detailHref(orden)} prefetch={false} className="block space-y-1 px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <FolioPill folio={orden.folio_referencia} />
                        <span className="text-sm font-medium tabular-nums">
                          <MoneyFormat centavos={orden.total_centavos} />
                        </span>
                      </div>
                      <p className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted-foreground tabular-nums">
                        <span className="truncate">
                          {orden.director.nombre} · {orden.director.club}
                        </span>
                        <span>{waitOrDate(orden)}</span>
                        {isClosed ? (
                          <ExceptionStatus
                            value={orden.estado}
                            normal={["entregada"]}
                            labels={estadoLabels}
                            intents={{ cancelada: "neutral" }}
                          />
                        ) : null}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {!loadFailure && total > 0 ? (
              <DataTablePagination page={page} totalPages={totalPages} total={total} limit={limit} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
