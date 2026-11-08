"use client";

import { useId } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  limitOptions?: number[];
  /**
   * Controlled mode: when provided, the component never touches the router and
   * delegates navigation to the caller (e.g. client-side TanStack tables).
   * Without it, page/limit are written to the URL (`?page=&limit=`).
   */
  onPageChange?: (page: number) => void;
  /** Controlled mode: called with the new page size; the caller resets to page 1. */
  onPageSizeChange?: (limit: number) => void;
}

type PaginationViewProps = Omit<DataTablePaginationProps, "onPageChange" | "onPageSizeChange"> & {
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
};

export function DataTablePagination(props: DataTablePaginationProps) {
  const { onPageChange, onPageSizeChange, ...rest } = props;
  if (onPageChange) {
    return (
      <PaginationView
        {...rest}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange ?? (() => undefined)}
      />
    );
  }
  return <UrlPagination {...rest} />;
}

function UrlPagination(props: Omit<DataTablePaginationProps, "onPageChange" | "onPageSizeChange">) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  function buildHref(newPage: number, newLimit?: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    if (newLimit) params.set("limit", String(newLimit));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <PaginationView
      {...props}
      onPageChange={(newPage) => router.push(buildHref(newPage))}
      onPageSizeChange={(newLimit) => router.push(buildHref(1, newLimit))}
    />
  );
}

function PaginationView({
  page,
  totalPages,
  total,
  limit,
  limitOptions = [20, 50, 100],
  onPageChange,
  onPageSizeChange,
}: PaginationViewProps) {
  const t = useTranslations("shared.pagination");
  const perPageLabelId = useId();

  const from = total === 0 ? 0 : Math.min((page - 1) * limit + 1, total);
  const to = Math.min(page * limit, total);
  const options = limitOptions.includes(limit)
    ? limitOptions
    : [...limitOptions, limit].sort((a, b) => a - b);

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        {t("showing", { from, to, total })}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span id={perPageLabelId} className="text-sm text-muted-foreground">
            {t("perPage")}
          </span>
          <Select value={String(limit)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="h-8 w-[70px]" aria-labelledby={perPageLabelId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">
            {t("pageOf", { page, totalPages })}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page <= 1}
            aria-label={t("prevPage")}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page >= totalPages}
            aria-label={t("nextPage")}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
