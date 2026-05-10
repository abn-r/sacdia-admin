"use client";

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
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  limitOptions?: number[];
}

export function DataTablePagination({
  page,
  totalPages,
  total,
  limit,
  limitOptions = [20, 50, 100],
}: DataTablePaginationProps) {
  const t = useTranslations("shared.pagination");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  function buildHref(newPage: number, newLimit?: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    if (newLimit) params.set("limit", String(newLimit));
    return `${pathname}?${params.toString()}`;
  }

  function handleLimitChange(value: string) {
    router.push(buildHref(1, Number(value)));
  }

  const from = Math.min((page - 1) * limit + 1, total);
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        {t("showing", { from, to, total })}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("perPage")}</span>
          <Select defaultValue={String(limit)} onValueChange={handleLimitChange}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {limitOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
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
            onClick={() => router.push(buildHref(page - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page >= totalPages}
            aria-label={t("nextPage")}
            onClick={() => router.push(buildHref(page + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
