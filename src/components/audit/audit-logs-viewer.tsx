"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ScrollText, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { errorStateFromError } from "@/lib/api/error-state";
import {
  formatAuditActorName,
  getAdminAuditLog,
  listAdminAuditLogs,
  type AdminAuditLogDetail,
  type AdminAuditLogItem,
} from "@/lib/api/audit-logs";
import {
  describeAuditRoute,
  hasAuditEntityId,
  shortAuditId,
  type AuditRouteInfo,
} from "@/lib/audit/describe-audit-route";
import {
  AUDIT_ACTION_FILTERS,
  auditFiltersToSearch,
  auditNeedsClientActionFilter,
  auditServerQuery,
  matchesAuditAction,
  matchesAuditSearch,
  parseAuditFilters,
  type AuditFilters,
} from "@/lib/audit/audit-filters";
import {
  describeAuditChanges,
  prettifyChangeField,
  type AuditChangeEntry,
  type AuditChangeValue,
} from "@/lib/audit/describe-audit-changes";
import { useFormatDateTime } from "@/lib/format-locale";

const PAGE_SIZE = 50;
/** With a client-side action filter, keep paging until this many rows match... */
const MIN_MATCHES_PER_LOAD = 25;
/** ...but never more requests than this per click. */
const MAX_PAGES_PER_LOAD = 8;
const SEARCH_DEBOUNCE_MS = 300;
const ALL = "all";

type KnownAction = "CREATED" | "UPDATED" | "DELETED" | "DEACTIVATED" | "LOGIN" | "LOGOUT";
const KNOWN_ACTIONS = new Set<string>(["CREATED", "UPDATED", "DELETED", "DEACTIVATED", "LOGIN", "LOGOUT"]);

/** "Eliminado" only when the row is really removed; a deactivation reads "Desactivado". */
function displayAction(action: string, route: AuditRouteInfo | null): string {
  if (route?.action) return route.action;
  return route?.softDelete && action === "DELETED" ? "DEACTIVATED" : action;
}

export function AuditLogsViewer() {
  const t = useTranslations("audit.logs");
  const tA = useTranslations("admin.audit");
  const formatDateTime = useFormatDateTime();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseAuditFilters(new URLSearchParams(searchParams?.toString() ?? "")),
    [searchParams],
  );

  const [items, setItems] = useState<AdminAuditLogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [detailItem, setDetailItem] = useState<AdminAuditLogItem | null>(null);
  const [detail, setDetail] = useState<AdminAuditLogDetail | null>(null);
  const [detailError, setDetailError] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const [searchText, setSearchText] = useState(filters.q ?? "");
  const requestId = useRef(0);

  // ── URL <-> filters ────────────────────────────────────────────────────────

  const updateFilters = useCallback(
    (patch: Partial<AuditFilters>) => {
      const next: AuditFilters = { ...filters, ...patch };
      const qs = auditFiltersToSearch(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  // The search box is local while typing and reaches the URL after a pause.
  useEffect(() => {
    if ((filters.q ?? "") === searchText.trim()) return;
    const timer = setTimeout(() => {
      updateFilters({ q: searchText.trim() || undefined });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // ── Data ───────────────────────────────────────────────────────────────────

  // `q` is client-only: changing it must not refetch.
  const serverQuery = useMemo(() => auditServerQuery(filters), [filters]);
  const queryKey = JSON.stringify([serverQuery, filters.action ?? null]);
  const clientAction = auditNeedsClientActionFilter(filters.action) ? filters.action : undefined;

  const load = useCallback(
    async (cursor: string | null, append: boolean) => {
      const id = ++requestId.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const collected: AdminAuditLogItem[] = [];
        let cur = cursor;
        let next: string | null = null;
        let pages = 0;
        do {
          const page = await listAdminAuditLogs({ ...serverQuery, limit: PAGE_SIZE, cursor: cur });
          collected.push(...page.items.filter((item) => matchesAuditAction(item, clientAction)));
          next = page.next_cursor;
          cur = next;
          pages += 1;
        } while (
          clientAction &&
          next &&
          collected.length < MIN_MATCHES_PER_LOAD &&
          pages < MAX_PAGES_PER_LOAD
        );
        if (id !== requestId.current) return;
        setItems((current) => (append ? [...current, ...collected] : collected));
        setNextCursor(next);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    // queryKey stands for serverQuery + the action filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryKey],
  );

  useEffect(() => {
    void load(null, false);
  }, [load]);

  // ── Row text ───────────────────────────────────────────────────────────────

  function actionLabel(action: string): string {
    return KNOWN_ACTIONS.has(action) ? t(`action.${action as KnownAction}`) : action;
  }

  function whatHappened(item: AdminAuditLogItem, route: AuditRouteInfo | null): string {
    if (route) return t(`routes.${route.routeKey}`);
    return item.summary ?? actionLabel(displayAction(item.action, route));
  }

  function about(item: AdminAuditLogItem, route: AuditRouteInfo | null): string {
    if (route) {
      const kind = t(`entities.${route.entityKind}`);
      return hasAuditEntityId(item.entity_id) ? `${kind} ${shortAuditId(item.entity_id)}` : kind;
    }
    return `${item.entity_type}/${item.entity_id}`;
  }

  function actorOf(item: AdminAuditLogItem): string {
    return formatAuditActorName(item.actor) ?? t("unknownActor");
  }

  function formatWhen(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : formatDateTime(d, { dateStyle: "medium", timeStyle: "short" });
  }

  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (!filters.q) return true;
        const route = describeAuditRoute({ summary: item.summary });
        return matchesAuditSearch(
          [
            whatHappened(item, route),
            about(item, route),
            item.entity_type,
            item.entity_id,
            item.summary,
            formatAuditActorName(item.actor),
          ],
          filters.q,
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, filters.q],
  );

  // ── Detail ─────────────────────────────────────────────────────────────────

  async function openDetail(item: AdminAuditLogItem) {
    setDetailItem(item);
    setDetail(null);
    setDetailError(false);
    setShowTechnical(false);
    try {
      setDetail(await getAdminAuditLog(item.audit_log_id));
    } catch {
      setDetail(item);
      setDetailError(true);
    }
  }

  function closeDetail() {
    setDetailItem(null);
    setDetail(null);
  }

  const changes = useMemo(() => (detail ? describeAuditChanges((detail as AdminAuditLogDetail).changes) : []), [detail]);
  const hasFilters = Boolean(filters.q || filters.action || filters.result || filters.from || filters.to);

  const renderValue = (value: AuditChangeValue | undefined): string => {
    if (!value || value.kind === "empty") return "—";
    if (value.kind === "bool") return value.value ? tA("detail.yes") : tA("detail.no");
    return value.text;
  };

  function ChangeRow({ entry }: { entry: AuditChangeEntry }) {
    const field = prettifyChangeField(entry.field);
    const tag =
      entry.kind === "added"
        ? tA("detail.added")
        : entry.kind === "removed"
          ? tA("detail.removed")
          : entry.kind === "changed"
            ? tA("detail.changed")
            : null;
    return (
      <li className="flex items-start justify-between gap-3 py-2 text-sm">
        <div className="min-w-0 flex-1 break-words">
          {entry.kind === "changed" ? (
            <>
              <span className="text-muted-foreground">{field}: </span>
              <span>{renderValue(entry.from)}</span>
              <span className="text-muted-foreground"> → </span>
              <span>{renderValue(entry.to)}</span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">{field}: </span>
              <span>{renderValue(entry.value)}</span>
            </>
          )}
        </div>
        {tag ? <span className="shrink-0 text-xs text-muted-foreground">{tag}</span> : null}
      </li>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const actionOptionLabel = (a: (typeof AUDIT_ACTION_FILTERS)[number]): string => {
    switch (a) {
      case "created":
        return t("action.CREATED");
      case "updated":
        return t("action.UPDATED");
      case "deleted":
        return t("action.DELETED");
      case "deactivated":
        return t("action.DEACTIVATED");
      case "login":
        return t("action.LOGIN");
      case "logout":
        return t("action.LOGOUT");
      case "denied":
        return tA("filters.actionDenied");
    }
  };

  const errorProps = error ? errorStateFromError(error) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[260px]">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label={tA("filters.search")}
            placeholder={tA("filters.search")}
            className="pl-8"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
        <Select
          value={filters.action ?? ALL}
          onValueChange={(v) =>
            updateFilters({ action: v === ALL ? undefined : (v as AuditFilters["action"]) })
          }
        >
          <SelectTrigger aria-label={tA("filters.action")} className="w-full sm:w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{tA("filters.allActions")}</SelectItem>
            {AUDIT_ACTION_FILTERS.map((a) => (
              <SelectItem key={a} value={a}>
                {actionOptionLabel(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          aria-label={tA("filters.from")}
          className="w-full sm:w-[160px]"
          value={filters.from ?? ""}
          max={filters.to}
          onChange={(event) => updateFilters({ from: event.target.value || undefined })}
        />
        <Input
          type="date"
          aria-label={tA("filters.to")}
          className="w-full sm:w-[160px]"
          value={filters.to ?? ""}
          min={filters.from}
          onChange={(event) => updateFilters({ to: event.target.value || undefined })}
        />
        <Select
          value={filters.result ?? ALL}
          onValueChange={(v) =>
            updateFilters({ result: v === ALL ? undefined : (v as AuditFilters["result"]) })
          }
        >
          <SelectTrigger aria-label={tA("filters.result")} className="w-full sm:w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{tA("filters.allResults")}</SelectItem>
            <SelectItem value="succeeded">{t("result.succeeded")}</SelectItem>
            <SelectItem value="failed">{t("result.failed")}</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchText("");
              router.replace(pathname, { scroll: false });
            }}
          >
            {tA("filters.clear")}
          </Button>
        ) : null}
      </div>

      {errorProps ? (
        <ErrorState
          kind={errorProps.kind}
          {...(errorProps.detail ? { detail: errorProps.detail } : {})}
          onRetry={() => void load(null, false)}
        />
      ) : null}

      {loading && !errorProps ? (
        <div className="space-y-2" aria-busy="true" aria-label={t("loading")}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-md" />
          ))}
        </div>
      ) : null}

      {!loading && !errorProps && visible.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          variant={hasFilters ? "no-results" : "default"}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : null}

      {!loading && !errorProps && visible.length > 0 ? (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tA("columns.when")}</TableHead>
                <TableHead>{tA("columns.what")}</TableHead>
                <TableHead className="hidden lg:table-cell">{tA("columns.about")}</TableHead>
                <TableHead className="hidden md:table-cell">{tA("columns.who")}</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((item) => {
                const route = describeAuditRoute({ summary: item.summary });
                return (
                  <TableRow
                    key={item.audit_log_id}
                    className="cursor-pointer"
                    tabIndex={0}
                    onClick={() => void openDetail(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void openDetail(item);
                      }
                    }}
                  >
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatWhen(item.created_at)}
                    </TableCell>
                    <TableCell className="min-w-[200px] max-w-[360px] whitespace-normal text-sm font-medium">
                      {whatHappened(item, route)}
                    </TableCell>
                    <TableCell className="hidden max-w-[260px] whitespace-normal break-words text-sm lg:table-cell">
                      {about(item, route)}
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{actorOf(item)}</TableCell>
                    <TableCell className="text-right">
                      {item.result === "failed" ? (
                        <Badge variant="soft-destructive">{t("result.failed")}</Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {nextCursor && !errorProps ? (
        <div className="flex justify-center">
          <Button
            loading={loadingMore}
            variant="outline"
            size="sm"
            onClick={() => void load(nextCursor, true)}
          >
            {t("loadMore")}
          </Button>
        </div>
      ) : null}

      <Sheet open={detailItem !== null} onOpenChange={(open) => !open && closeDetail()}>
        <SheetContent className="flex flex-col overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {detailItem ? whatHappened(detailItem, describeAuditRoute({ summary: detailItem.summary })) : ""}
            </SheetTitle>
            <SheetDescription>
              {detailItem ? `${formatWhen(detailItem.created_at)} · ${actorOf(detailItem)}` : ""}
            </SheetDescription>
          </SheetHeader>

          {detailItem ? (
            <div className="flex-1 space-y-5 px-4 text-sm">
              <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2">
                <dt className="text-muted-foreground">{tA("detail.about")}</dt>
                <dd>
                  {about(detailItem, describeAuditRoute({ summary: detailItem.summary }))}
                </dd>
                <dt className="text-muted-foreground">{tA("detail.result")}</dt>
                <dd>
                  {detailItem.result === "failed" ? (
                    <Badge variant="soft-destructive">{t("result.failed")}</Badge>
                  ) : (
                    tA("detail.resultOk")
                  )}
                </dd>
                <dt className="text-muted-foreground">{tA("detail.origin")}</dt>
                <dd>
                  {detailItem.source === "service"
                    ? tA("detail.originService")
                    : tA("detail.originRequest")}
                </dd>
              </dl>

              {detailError ? (
                <p className="text-muted-foreground">{t("detailUnavailable")}</p>
              ) : null}

              {detail === null && !detailError ? (
                <Skeleton className="h-16 w-full rounded-md" />
              ) : null}

              {changes.length > 0 ? (
                <section>
                  <h3 className="mb-1 text-sm font-semibold">{tA("detail.changes")}</h3>
                  <ul className="divide-y rounded-xl border px-3.5">
                    {changes.map((entry, index) => (
                      <ChangeRow key={`${entry.field}-${index}`} entry={entry} />
                    ))}
                  </ul>
                </section>
              ) : null}

              {detail ? (
                <div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    aria-expanded={showTechnical}
                    onClick={() => setShowTechnical((v) => !v)}
                  >
                    {tA("detail.technicalData")}
                  </Button>
                  {showTechnical ? (
                    <pre className="mt-2 overflow-x-auto rounded-lg border bg-muted p-3 font-mono text-xs">
                      {JSON.stringify(
                        {
                          entity: `${detail.entity_type}/${detail.entity_id}`,
                          summary: detail.summary,
                          correlation_id: detail.correlation_id ?? null,
                          changes: (detail as AdminAuditLogDetail).changes ?? null,
                          request_context: (detail as AdminAuditLogDetail).request_context ?? null,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <SheetFooter>
            <Button type="button" variant="outline" onClick={closeDetail}>
              {tA("detail.close")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
