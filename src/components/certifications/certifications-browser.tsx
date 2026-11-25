"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { CertificationsList } from "@/components/certifications/certifications-list";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ListFilterField } from "@/components/shared/list-filters-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { filterCertifications, type CertificationListItem } from "@/lib/certifications/list";

interface CertificationsBrowserProps {
  items: CertificationListItem[];
  total: number;
  /** 1-based page that `items` belongs to. */
  page: number;
  limit: number;
}

/**
 * List with search and server pagination. The API paginates (`page`, `limit`)
 * but has no `search` param, so the query only filters the loaded page and the
 * UI says so when there are more pages.
 */
export function CertificationsBrowser({ items, total, page, limit }: CertificationsBrowserProps) {
  const t = useTranslations("evaluation.certYear.certifications.list");
  const [query, setQuery] = useState("");

  const visible = filterCertifications(items, query);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const isFiltered = query.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <ListFilterField id="certifications-search" label={t("searchLabel")} className="w-[280px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="certifications-search"
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </div>
        </ListFilterField>
        {isFiltered && totalPages > 1 ? (
          <p role="status" className="pb-2 text-[13px] text-muted-foreground">
            {t("pageOnlyNotice")}
          </p>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          variant="no-results"
          title={t("noResultsTitle")}
          description={t("noResultsDescription")}
        >
          <Button type="button" variant="outline" onClick={() => setQuery("")}>
            {t("clearFilters")}
          </Button>
        </EmptyState>
      ) : (
        <CertificationsList items={visible} />
      )}

      <DataTablePagination page={page} totalPages={totalPages} total={total} limit={limit} />
    </div>
  );
}
