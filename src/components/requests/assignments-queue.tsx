"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { ErrorStateTableRow } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import { UrlTabs } from "@/components/shared/url-tabs";
import { ReviewSheet } from "@/components/requests/review-sheet";
import {
  ALL_FILTER,
  QUEUE_PAGE_SIZE,
  WaitingTime,
  personName,
  useQueueTabs,
  waitingDays,
  type QueueTab,
} from "@/components/requests/queue-kit";
import {
  QueueEmpty,
  QueueFilterRow,
  QueueSearch,
  QueueSelect,
  usePagedSlice,
  useQueueData,
  type QueueLoadFailure,
} from "@/components/requests/queue-parts";
import {
  getAssignmentRequests,
  reviewAssignmentRequest,
  type AssignmentRequest,
  type AssignmentRequestDetail,
  type RequestStatus,
} from "@/lib/api/requests";
import { useFormatDate } from "@/lib/format-locale";
import { useRoleLabel } from "@/lib/auth/role-labels";

const HEAD = "h-9 px-3 text-xs font-medium text-muted-foreground";
const STATUS_INTENTS = { PENDING: "warning", REJECTED: "destructive", APPROVED: "success" } as const;

interface AssignmentsQueueProps {
  /** `null` when the server fetch failed. */
  initialRequests: AssignmentRequest[] | null;
  initialFailure?: QueueLoadFailure | null;
  canReview: boolean;
}

export function AssignmentsQueue({ initialRequests, initialFailure, canReview }: AssignmentsQueueProps) {
  const t = useTranslations("queues.requests.assignments");
  const tc = useTranslations("queues.requests.common");
  const tStatus = useTranslations("requests.status");
  const roleLabel = useRoleLabel();
  const formatDate = useFormatDate();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const data = useQueueData<AssignmentRequest>(
    ["requests", "assignments"],
    () => getAssignmentRequests(),
    initialRequests,
    initialFailure,
  );
  const { active, items, inTab } = useQueueTabs(data.rows);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState(ALL_FILTER);
  const [section, setSection] = useState(ALL_FILTER);
  const [sheet, setSheet] = useState<AssignmentRequest | null>(null);

  const roleOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of data.rows ?? []) if (row.role_to_assign) names.add(row.role_to_assign);
    return [...names].map((value) => ({ value, label: roleLabel(value) })).sort((a, b) => a.label.localeCompare(b.label));
  }, [data.rows, roleLabel]);

  const sectionOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of data.rows ?? []) if (row.section?.name) names.add(row.section.name);
    return [...names].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value }));
  }, [data.rows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return inTab
      .filter((row) => role === ALL_FILTER || row.role_to_assign === role)
      .filter((row) => section === ALL_FILTER || row.section?.name === section)
      .filter((row) => !needle || personName(row.target_user).toLowerCase().includes(needle))
      .sort((a, b) =>
        active === "pending"
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.reviewed_at ?? b.created_at).getTime() -
            new Date(a.reviewed_at ?? a.created_at).getTime(),
      );
  }, [inTab, role, section, search, active]);

  const paged = usePagedSlice(filtered, QUEUE_PAGE_SIZE, `${active}|${search}|${role}|${section}`);
  const isFiltered = search.trim().length > 0 || role !== ALL_FILTER || section !== ALL_FILTER;
  const pendingTab = active === "pending";
  const showStatus = active === "all";
  const showReviewed = !pendingTab;

  function goTo(tab: QueueTab) {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    if (tab === "pending") next.delete("tab");
    else next.set("tab", tab);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function clearFilters() {
    setSearch("");
    setRole(ALL_FILTER);
    setSection(ALL_FILTER);
  }

  async function review(request: AssignmentRequest, payload: { action: "approved" | "rejected"; comment?: string }) {
    await reviewAssignmentRequest(request.request_id, payload);
    toast.success(payload.action === "approved" ? t("toasts.approved") : t("toasts.rejected"));
    data.refetch();
  }

  function statusOf(status: RequestStatus) {
    return (
      <ExceptionStatus
        value={status}
        normal={["APPROVED"]}
        labels={{ PENDING: tStatus("PENDING"), APPROVED: tStatus("APPROVED"), REJECTED: tStatus("REJECTED") }}
        intents={STATUS_INTENTS}
      />
    );
  }

  const roleName = (row: AssignmentRequest) => (row.role_to_assign ? roleLabel(row.role_to_assign) : "—");

  return (
    <div className="space-y-4">
      {data.stale && data.updatedAt ? <StaleDataNotice at={data.updatedAt} onRetry={data.refetch} /> : null}

      <UrlTabs tabs={items} defaultValue="pending" ariaLabel={tc("tabsLabel")} />

      <QueueFilterRow>
        <QueueSearch
          id="assignments-search"
          label={tc("search.label")}
          placeholder={t("search.placeholder")}
          value={search}
          onChange={setSearch}
        />
        <QueueSelect
          id="assignments-role"
          label={t("filters.role")}
          value={role}
          onChange={setRole}
          allLabel={t("filters.allRoles")}
          options={roleOptions}
        />
        <QueueSelect
          id="assignments-section"
          label={t("filters.section")}
          value={section}
          onChange={setSection}
          allLabel={t("filters.allSections")}
          options={sectionOptions}
        />
      </QueueFilterRow>

      {data.failure ? (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={HEAD}>{t("columns.person")}</TableHead>
                <TableHead className={HEAD}>{t("columns.role")}</TableHead>
                <TableHead className={HEAD}>{t("columns.section")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <ErrorStateTableRow
                colSpan={3}
                kind={data.failure.kind}
                icon={UserCog}
                title={t("error.title")}
                description={t("error.description")}
                {...(data.failure.detail ? { detail: data.failure.detail } : {})}
                onRetry={data.refetch}
              />
            </TableBody>
          </Table>
        </DataTableShell>
      ) : paged.total === 0 ? (
        <QueueEmpty
          icon={UserCog}
          tab={active}
          filtered={isFiltered}
          onClear={clearFilters}
          onGoTo={goTo}
          copy={{
            title: t(`empty.${active}.title`),
            description: t(`empty.${active}.description`),
            viewApproved: tc("empty.viewApproved"),
          }}
        />
      ) : (
        <>
          <DataTableShell aria-busy={data.refreshing} className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={HEAD}>{t("columns.person")}</TableHead>
                  <TableHead className={HEAD}>{t("columns.role")}</TableHead>
                  <TableHead className={HEAD}>{t("columns.section")}</TableHead>
                  <TableHead className={HEAD}>{t("columns.requestedBy")}</TableHead>
                  {pendingTab ? <TableHead className={`${HEAD} text-right`}>{tc("columns.wait")}</TableHead> : null}
                  {showReviewed ? <TableHead className={HEAD}>{tc("columns.reviewed")}</TableHead> : null}
                  {showStatus ? <TableHead className={HEAD}>{tc("columns.status")}</TableHead> : null}
                  <TableHead className={`${HEAD} text-right`}>
                    <span className="sr-only">{tc("columns.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.slice.map((row) => {
                  const name = personName(row.target_user);
                  const reviewable = row.status === "PENDING" && canReview;
                  return (
                    <TableRow key={String(row.request_id)} className="hover:bg-muted/30">
                      <TableCell className="px-3 py-2.5 align-middle">
                        <button
                          type="button"
                          onClick={() => setSheet(row)}
                          className="rounded-sm text-left text-sm font-medium hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          {name}
                        </button>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 align-middle text-sm">{roleName(row)}</TableCell>
                      <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                        {row.section?.name ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                        {personName(row.requested_by)}
                      </TableCell>
                      {pendingTab ? (
                        <TableCell className="px-3 py-2.5 text-right align-middle text-sm">
                          <WaitingTime createdAt={row.created_at} />
                        </TableCell>
                      ) : null}
                      {showReviewed ? (
                        <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                          {row.reviewed_at ? formatDate(row.reviewed_at) : "—"}
                        </TableCell>
                      ) : null}
                      {showStatus ? <TableCell className="px-3 py-2.5 align-middle">{statusOf(row.status)}</TableCell> : null}
                      <TableCell className="px-3 py-2.5 text-right align-middle">
                        <Button
                          size="sm"
                          variant={reviewable ? "soft" : "outline"}
                          aria-label={`${reviewable ? tc("review") : tc("view")}: ${name}`}
                          onClick={() => setSheet(row)}
                        >
                          {reviewable ? tc("review") : tc("view")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableShell>

          <ul className="divide-y md:hidden" aria-label={t("listLabel")}>
            {paged.slice.map((row) => (
              <li key={String(row.request_id)}>
                <button type="button" className="w-full py-3 text-left" onClick={() => setSheet(row)}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">{personName(row.target_user)}</span>
                    {pendingTab ? (
                      <span className="shrink-0 text-[13px]">
                        <WaitingTime createdAt={row.created_at} />
                      </span>
                    ) : (
                      statusOf(row.status)
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                    {roleName(row)} · {row.section?.name ?? "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <DataTablePagination
            page={paged.page}
            totalPages={paged.totalPages}
            total={paged.total}
            limit={paged.limit}
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setLimit}
          />
        </>
      )}

      {sheet ? (
        <AssignmentSheet
          key={String(sheet.request_id)}
          request={sheet}
          canReview={canReview}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
          onReview={(payload) => review(sheet, payload)}
        />
      ) : null}
    </div>
  );
}

function AssignmentSheet({
  request,
  canReview,
  onOpenChange,
  onReview,
}: {
  request: AssignmentRequest;
  canReview: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (payload: { action: "approved" | "rejected"; comment?: string }) => Promise<void>;
}) {
  const t = useTranslations("queues.requests.assignments.sheet");
  const tc = useTranslations("queues.requests.common");
  const tStatus = useTranslations("requests.status");
  const roleLabel = useRoleLabel();
  const formatDate = useFormatDate();
  const name = personName(request.target_user);
  const pending = request.status === "PENDING";
  const reviewable = pending && canReview;
  const reviewer = (request as AssignmentRequestDetail).reviewed_by ?? null;
  const role = request.role_to_assign ? roleLabel(request.role_to_assign) : "—";

  return (
    <ReviewSheet
      open
      onOpenChange={onOpenChange}
      title={t("title", { name })}
      description={
        pending
          ? t("sent", {
              date: formatDate(request.created_at),
              wait: tc("waiting", { count: waitingDays(request.created_at) }),
            })
          : t("sentOnly", { date: formatDate(request.created_at) })
      }
      {...(reviewable
        ? {
            approve: {
              label: t("approve"),
              comment: { label: t("commentLabel"), hint: t("commentHint") },
              onConfirm: (comment: string | undefined) =>
                onReview({ action: "approved", ...(comment ? { comment } : {}) }),
            },
            reject: {
              label: tc("rejectAction"),
              confirmLabel: t("rejectConfirm"),
              audience: t("rejectAudience"),
              onConfirm: (reason: string) => onReview({ action: "rejected", comment: reason }),
            },
          }
        : {})}
    >
      <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
        {t.rich("summary", {
          role,
          section: request.section?.name ?? "—",
          strong: (chunks) => <strong className="font-semibold">{chunks}</strong>,
        })}
      </p>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{t("person")}</dt>
          <dd className="mt-0.5">
            {name}
            {request.target_user?.email ? (
              <span className="block text-muted-foreground">{request.target_user.email}</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("requestedBy")}</dt>
          <dd className="mt-0.5">{personName(request.requested_by)}</dd>
        </div>
        {request.comment ? (
          <div>
            <dt className="text-xs text-muted-foreground">{t("comment")}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap">{request.comment}</dd>
          </div>
        ) : null}
        {!pending ? (
          <>
            <div>
              <dt className="text-xs text-muted-foreground">{t("outcome")}</dt>
              <dd className="mt-0.5">
                {tStatus(request.status)}
                {request.reviewed_at ? ` · ${formatDate(request.reviewed_at)}` : ""}
              </dd>
            </div>
            {reviewer ? (
              <div>
                <dt className="text-xs text-muted-foreground">{t("reviewedBy")}</dt>
                <dd className="mt-0.5">{personName(reviewer)}</dd>
              </div>
            ) : null}
          </>
        ) : null}
      </dl>
    </ReviewSheet>
  );
}
