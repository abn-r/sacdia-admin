"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Search, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL_FILTER, type QueueTab } from "@/components/requests/queue-kit";
import type { ErrorStateFromError } from "@/lib/api/error-state";
import { errorStateFromError } from "@/lib/api/error-state";

/** What the server page hands over when its own fetch failed. */
export type QueueLoadFailure = ErrorStateFromError;

/**
 * List of one queue. `initial` is the server render; `null` means the server
 * fetch failed, so there is no data yet and the first retry loads it. A failed
 * refresh with data on screen keeps the data (`stale`).
 */
export function useQueueData<T>(
  queryKey: readonly unknown[],
  fetcher: () => Promise<T[]>,
  initial: T[] | null,
  initialFailure?: QueueLoadFailure | null,
) {
  const query = useQuery<T[], Error>({
    queryKey,
    queryFn: fetcher,
    ...(initial !== null ? { initialData: initial } : {}),
    enabled: initial !== null,
    staleTime: 60_000,
  });
  const failure: QueueLoadFailure | null =
    query.data === undefined
      ? query.error
        ? errorStateFromError(query.error)
        : (initialFailure ?? { kind: "error" })
      : null;
  return {
    rows: query.data,
    failure,
    stale: query.isError && query.data !== undefined,
    updatedAt: query.dataUpdatedAt,
    refetch: () => void query.refetch(),
    refreshing: query.isFetching,
  };
}

export function QueueSearch({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-48 flex-1 flex-col gap-1.5 sm:max-w-xs">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="search"
          value={value}
          maxLength={100}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="pl-8"
        />
      </div>
    </div>
  );
}

export function QueueSelect({
  id,
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-[200px]">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <NativeSelect id={id} className="w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value={ALL_FILTER}>{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

/** Filters in one wrapping row. */
export function QueueFilterRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3">{children}</div>;
}

/**
 * Empty result of the current tab, outside the table. Keeps the tabs (the
 * caller renders them), offers the history when the pending tab is empty and
 * «Limpiar filtros» when a filter caused it.
 */
export function QueueEmpty({
  icon,
  tab,
  filtered,
  onClear,
  onGoTo,
  copy,
}: {
  icon: LucideIcon;
  tab: QueueTab;
  filtered: boolean;
  onClear: () => void;
  onGoTo: (tab: QueueTab) => void;
  copy: { title: string; description: string; viewApproved: string };
}) {
  const t = useTranslations("queues.requests.common.empty");
  if (filtered) {
    return (
      <EmptyState
        icon={Search}
        variant="no-results"
        title={t("noResultsTitle")}
        description={t("noResultsDescription")}
      >
        <Button variant="outline" size="sm" onClick={onClear}>
          {t("clearFilters")}
        </Button>
      </EmptyState>
    );
  }
  return (
    <EmptyState icon={icon} title={copy.title} description={copy.description}>
      {tab === "pending" ? (
        <Button variant="outline" size="sm" onClick={() => onGoTo("approved")}>
          {copy.viewApproved}
        </Button>
      ) : null}
    </EmptyState>
  );
}

/** Local page state that snaps back to page 1 when `resetKey` changes. */
export function usePagedSlice<T>(rows: readonly T[], initialLimit: number, resetKey: string) {
  const [state, setState] = useState({ page: 1, key: resetKey, limit: initialLimit });
  const page = state.key === resetKey ? state.page : 1;
  const totalPages = Math.max(1, Math.ceil(rows.length / state.limit));
  const safePage = Math.min(page, totalPages);
  return {
    page: safePage,
    limit: state.limit,
    totalPages,
    total: rows.length,
    slice: rows.slice((safePage - 1) * state.limit, safePage * state.limit),
    setPage: (next: number) => setState((s) => ({ ...s, page: next, key: resetKey })),
    setLimit: (limit: number) => setState({ page: 1, key: resetKey, limit }),
  };
}
