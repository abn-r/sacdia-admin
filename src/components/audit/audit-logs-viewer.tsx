"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ApiError } from "@/lib/api/client";
import {
  formatAuditActorName,
  getAdminAuditLog,
  listAdminAuditLogs,
  type AdminAuditLogDetail,
  type AdminAuditLogItem,
  type AdminAuditLogListQuery,
} from "@/lib/api/audit-logs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";
import { cn } from "@/lib/utils";

const KNOWN_ACTIONS = new Set(["CREATED", "UPDATED", "DELETED"]);

function actionVariant(
  action: string,
): "soft-success" | "soft-info" | "soft-destructive" | "outline" {
  if (action === "CREATED") return "soft-success";
  if (action === "UPDATED") return "soft-info";
  if (action === "DELETED") return "soft-destructive";
  return "outline";
}

function bannerState(error: ApiError | null): "forbidden" | "missing" {
  if (error?.status === 403) return "forbidden";
  return "missing";
}

export function AuditLogsViewer() {
  const t = useTranslations("audit.logs");
  const locale = useLocale();
  const [items, setItems] = useState<AdminAuditLogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("all");
  const [result, setResult] = useState("all");
  const [source, setSource] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<AdminAuditLogDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filters = useMemo<AdminAuditLogListQuery>(
    () => ({
      entity_type: entityType.trim() || undefined,
      action: action === "all" ? undefined : action,
      result: result === "all" ? undefined : result,
      source: source === "all" ? undefined : source,
      from: from || undefined,
      to: to || undefined,
      limit: 50,
    }),
    [action, entityType, from, result, source, to],
  );

  const loadPage = useCallback(
    async (pageCursor: string | null, append: boolean) => {
      append ? setLoadingMore(true) : setLoading(true);
      setError(null);
      try {
        const page = await listAdminAuditLogs({
          ...filters,
          cursor: pageCursor,
        });
        setItems((current) => (append ? [...current, ...page.items] : page.items));
        setNextCursor(page.next_cursor);
      } catch (err) {
        setError(err instanceof ApiError ? err : t("loadError"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters, t],
  );

  useEffect(() => {
    void loadPage(null, false);
  }, [loadPage]);

  async function openDetail(item: AdminAuditLogItem) {
    setDetailOpen(true);
    setDetail(null);
    setDetailError(null);
    try {
      setDetail(await getAdminAuditLog(item.audit_log_id));
    } catch {
      setDetail(item);
      setDetailError(t("detailUnavailable"));
    }
  }

  const apiError = error instanceof ApiError ? error : null;
  const errorMessage = apiError?.message ?? (typeof error === "string" ? error : null);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-1.5">
          <Label htmlFor="audit-entity">{t("filters.entityType")}</Label>
          <Input
            id="audit-entity"
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            placeholder={t("filters.entityPlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("filters.action")}</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all")}</SelectItem>
              <SelectItem value="CREATED">{t("action.CREATED")}</SelectItem>
              <SelectItem value="UPDATED">{t("action.UPDATED")}</SelectItem>
              <SelectItem value="DELETED">{t("action.DELETED")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("filters.result")}</Label>
          <Select value={result} onValueChange={setResult}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all")}</SelectItem>
              <SelectItem value="succeeded">{t("result.succeeded")}</SelectItem>
              <SelectItem value="failed">{t("result.failed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("filters.source")}</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all")}</SelectItem>
              <SelectItem value="http">{t("source.http")}</SelectItem>
              <SelectItem value="service">{t("source.service")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-from">{t("filters.from")}</Label>
          <Input
            id="audit-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-to">{t("filters.to")}</Label>
          <Input
            id="audit-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      {errorMessage ? (
        <EndpointErrorBanner
          state={bannerState(apiError)}
          detail={errorMessage}
        />
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("loading")}
        </div>
      ) : null}

      {!loading && !errorMessage && items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.when")}</TableHead>
                <TableHead>{t("columns.action")}</TableHead>
                <TableHead>{t("columns.entity")}</TableHead>
                <TableHead>{t("columns.summary")}</TableHead>
                <TableHead>{t("columns.actor")}</TableHead>
                <TableHead>{t("columns.result")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const created = new Date(item.created_at);
                const actorName = formatAuditActorName(item.actor);
                return (
                  <TableRow
                    key={item.audit_log_id}
                    className={cn("cursor-pointer", STAGGER_CLASSES)}
                    style={getStaggerStyle(index)}
                    onClick={() => void openDetail(item)}
                  >
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {created.toLocaleString(locale, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionVariant(item.action)}>
                        {KNOWN_ACTIONS.has(item.action)
                          ? t(`action.${item.action}` as "action.CREATED")
                          : item.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.entity_type}/{item.entity_id}
                    </TableCell>
                    <TableCell className="max-w-sm truncate text-sm">
                      {item.summary ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {actorName ?? t("unknownActor")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.result === "failed" ? "soft-destructive" : "outline"
                        }
                      >
                        {item.result === "failed"
                          ? t("result.failed")
                          : t("result.succeeded")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {nextCursor ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={() => void loadPage(nextCursor, true)}
          >
            {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("loadMore")}
          </Button>
        </div>
      ) : null}

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("detailTitle")}</SheetTitle>
            <SheetDescription>{t("detailDescription")}</SheetDescription>
          </SheetHeader>
          {detailError ? (
            <p className="mt-4 text-sm text-muted-foreground">{detailError}</p>
          ) : null}
          {detail ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">{t("columns.entity")}</dt>
                <dd className="font-mono text-xs">
                  {detail.entity_type}/{detail.entity_id}
                </dd>
              </div>
              {detail.correlation_id ? (
                <div>
                  <dt className="text-muted-foreground">{t("correlation")}</dt>
                  <dd className="font-mono text-xs">{detail.correlation_id}</dd>
                </div>
              ) : null}
              {detail.changes ? (
                <div>
                  <dt className="text-muted-foreground">{t("changes")}</dt>
                  <dd>
                    <pre className="mt-1 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                      {JSON.stringify(detail.changes, null, 2)}
                    </pre>
                  </dd>
                </div>
              ) : null}
              {detail.request_context ? (
                <div>
                  <dt className="text-muted-foreground">{t("requestContext")}</dt>
                  <dd>
                    <pre className="mt-1 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                      {JSON.stringify(detail.request_context, null, 2)}
                    </pre>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("loading")}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
