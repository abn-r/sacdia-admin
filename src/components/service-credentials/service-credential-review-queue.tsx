"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FileSearch, Search } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ServiceCredentialReviewSheet } from "@/components/service-credentials/service-credential-review-sheet";
import {
  SERVICE_CREDENTIALS_LIST_KEY,
  ServiceCredentialStatusBadge,
  useRoleLabel,
} from "@/components/service-credentials/service-credential-shared";
import {
  listServiceCredentialReviews,
  type ServiceCredentialReviewCounts,
  type ServiceCredentialReviewItem,
  type ServiceCredentialReviewStatus,
} from "@/lib/api/service-credentials";
import { useFormatDate } from "@/lib/format-locale";

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 20;

const TABS: ReadonlyArray<{
  status: ServiceCredentialReviewStatus;
  label: "pending" | "approved" | "rejected";
}> = [
  { status: "PENDING_REVIEW", label: "pending" },
  { status: "APPROVED", label: "approved" },
  { status: "REJECTED", label: "rejected" },
];

const HEAD_CLASS = "h-9 px-3 text-xs font-medium text-muted-foreground";

function initials(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function ServiceCredentialReviewQueue() {
  const t = useTranslations("service_credentials");
  const formatDate = useFormatDate();
  const roleLabel = useRoleLabel();

  const [status, setStatus] = useState<ServiceCredentialReviewStatus>("PENDING_REVIEW");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch((current) => {
        const next = searchInput.trim();
        if (next !== current) setPage(1);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const query = useQuery({
    queryKey: [...SERVICE_CREDENTIALS_LIST_KEY, status, search, page, limit],
    queryFn: () => listServiceCredentialReviews({ status, search, page, limit }),
    staleTime: 30_000,
  });

  const data = query.data;
  // Counts cover the whole scope: keep the last known ones while another tab loads.
  const [counts, setCounts] = useState<ServiceCredentialReviewCounts | null>(null);
  const [countsSource, setCountsSource] = useState(data);
  if (data !== countsSource) {
    setCountsSource(data);
    if (data) setCounts(data.meta.counts);
  }
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // An action can empty the last page: step back to the last one that exists.
  if (data && data.items.length === 0 && total > 0 && page > totalPages) {
    setPage(totalPages);
  }

  function selectStatus(next: ServiceCredentialReviewStatus) {
    setStatus(next);
    setPage(1);
  }

  const isFiltered = search.length > 0;
  const emptyKey = status === "PENDING_REVIEW" ? "pending" : status === "APPROVED" ? "approved" : "rejected";
  const reviewed = status !== "PENDING_REVIEW";

  return (
    <div className="space-y-4">
      <Tabs value={status} onValueChange={(value) => selectStatus(value as ServiceCredentialReviewStatus)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <TabsList aria-label={t("tabs.label")}>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.status} value={tab.status}>
                {t(`tabs.${tab.label}`)}
                {counts ? (
                  <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                    {counts[tab.label]}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex w-full flex-col gap-1.5 sm:w-64">
            <Label htmlFor="service-credentials-search" className="text-xs text-muted-foreground">
              {t("search.label")}
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="service-credentials-search"
                type="search"
                value={searchInput}
                maxLength={100}
                placeholder={t("search.placeholder")}
                onChange={(event) => setSearchInput(event.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        <TabsContent value={status} className="mt-4 space-y-4">
          {query.isPending ? (
            <div className="space-y-3" aria-busy="true" data-testid="service-credentials-loading">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-card">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="ml-auto h-8 w-20" />
                </div>
              ))}
            </div>
          ) : query.isError && !data ? (
            <EndpointErrorBanner
              state="missing"
              detail={t("toasts.listFailed")}
              onRetry={() => void query.refetch()}
              retrying={query.isFetching}
            />
          ) : data && data.items.length === 0 ? (
            isFiltered ? (
              <EmptyState
                icon={Search}
                variant="no-results"
                title={t("empty.noResultsTitle")}
                description={t("empty.noResultsDescription", { search })}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                >
                  {t("empty.clearSearch")}
                </Button>
              </EmptyState>
            ) : (
              <EmptyState
                icon={FileSearch}
                title={t(`empty.${emptyKey}.title`)}
                description={t(`empty.${emptyKey}.description`)}
              />
            )
          ) : data ? (
            <>
              {query.isError ? (
                <EndpointErrorBanner
                  state="missing"
                  detail={t("toasts.listFailed")}
                  onRetry={() => void query.refetch()}
                  retrying={query.isFetching}
                />
              ) : null}
              <DataTableShell aria-busy={query.isFetching}>
                <Table className="max-md:block">
                  <TableHeader className="max-md:sr-only">
                    <TableRow>
                      <TableHead className={HEAD_CLASS}>{t("table.person")}</TableHead>
                      <TableHead className={HEAD_CLASS}>{t("table.club")}</TableHead>
                      <TableHead className={HEAD_CLASS}>{t("table.completed")}</TableHead>
                      <TableHead className={HEAD_CLASS}>{t("table.submitted")}</TableHead>
                      {reviewed ? (
                        <>
                          <TableHead className={HEAD_CLASS}>{t("table.status")}</TableHead>
                          <TableHead className={HEAD_CLASS}>{t("table.reviewer")}</TableHead>
                        </>
                      ) : null}
                      <TableHead className={`${HEAD_CLASS} text-right`}>{t("table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="max-md:block">
                    {data.items.map((item) => (
                      <CredentialRow
                        key={item.credential_id}
                        item={item}
                        reviewed={reviewed}
                        completed={formatDate(item.completed_at)}
                        submitted={formatDate(item.created_at)}
                        reviewer={
                          item.reviewer_role
                            ? `${roleLabel(item.reviewer_role)}${
                                item.reviewed_at
                                  ? ` · ${t("table.reviewedOn", { date: formatDate(item.reviewed_at) })}`
                                  : ""
                              }`
                            : "—"
                        }
                        actionLabel={reviewed ? t("table.view") : t("table.review")}
                        onOpen={() => setSelectedId(item.credential_id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </DataTableShell>
              <DataTablePagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={limit}
                onPageChange={setPage}
                onPageSizeChange={(next) => {
                  setLimit(next);
                  setPage(1);
                }}
              />
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      <ServiceCredentialReviewSheet
        credentialId={selectedId}
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </div>
  );
}

function CredentialRow({
  item,
  reviewed,
  completed,
  submitted,
  reviewer,
  actionLabel,
  onOpen,
}: {
  item: ServiceCredentialReviewItem;
  reviewed: boolean;
  completed: string;
  submitted: string;
  reviewer: string;
  actionLabel: string;
  onOpen: () => void;
}) {
  const name = item.user.name?.trim() || item.user.user_id;
  const muted = "px-3 py-2.5 align-middle text-sm text-muted-foreground tabular-nums max-md:p-0 max-md:text-[13px]";
  return (
    <TableRow className="hover:bg-muted/30 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:gap-y-1 max-md:px-4 max-md:py-3">
      <TableCell className="px-3 py-2.5 align-middle max-md:order-1 max-md:min-w-0 max-md:flex-1 max-md:p-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar size="sm">
            {item.user.photo_url ? <AvatarImage src={item.user.photo_url} alt="" /> : null}
            <AvatarFallback>{initials(item.user.name)}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={onOpen}
            className="truncate rounded-sm text-left text-sm font-medium hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {name}
          </button>
        </div>
      </TableCell>
      <TableCell className={`${muted} max-md:order-3`}>{item.club_name ?? "—"}</TableCell>
      <TableCell className={`${muted} max-md:order-5`}>{completed}</TableCell>
      <TableCell className={`${muted} max-md:order-6`}>{submitted}</TableCell>
      {reviewed ? (
        <>
          <TableCell className="px-3 py-2.5 align-middle max-md:order-2 max-md:p-0">
            <ServiceCredentialStatusBadge status={item.status} />
          </TableCell>
          <TableCell className={`${muted} max-md:order-7`}>{reviewer}</TableCell>
        </>
      ) : null}
      <TableCell className="px-3 py-2.5 text-right align-middle max-md:order-2 max-md:p-0">
        <Button
          type="button"
          size="sm"
          variant={reviewed ? "outline" : "soft"}
          aria-label={`${actionLabel}: ${name}`}
          onClick={onOpen}
        >
          {actionLabel}
        </Button>
      </TableCell>
    </TableRow>
  );
}
