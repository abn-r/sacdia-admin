"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListFilterField } from "@/components/shared/list-filters-shell";

interface InboxFiltersProps {
  currentQ: string;
  /** Present only on the "Cerrados" tab. */
  closedFilter?: "entregada" | "cancelada";
}

/** Search (and, on Cerrados, delivered/cancelled). The tab itself lives in `UrlTabs`. */
export function InboxFilters({ currentQ, closedFilter }: InboxFiltersProps) {
  const t = useTranslations("materials.pages.inbox");
  const tm = useTranslations("ops.materials.closedFilter");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);
  const [searchInput, setSearchInput] = useState(currentQ);

  useEffect(() => {
    latestParamsRef.current = searchParamsString;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [searchParamsString]);

  useEffect(() => {
    setSearchInput(currentQ);
  }, [currentQ]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateParam = useCallback(
    (key: string, value: string, mode: "push" | "replace" = "push") => {
      if (key !== "q" && debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const params = new URLSearchParams(latestParamsRef.current);
      const normalized = value.trim();
      if (!normalized) params.delete(key);
      else params.set(key, normalized);
      params.delete("page");
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      if (mode === "replace") router.replace(nextUrl);
      else router.push(nextUrl);
    },
    [pathname, router],
  );

  const handleSearchInputChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => updateParam("q", value, "replace"), 400);
    },
    [updateParam],
  );

  return (
    <div className="flex flex-wrap items-end gap-4">
      <ListFilterField id="materials-orders-search" label={t("filterSearch")} className="w-[300px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="materials-orders-search"
            placeholder={t("searchPlaceholder")}
            value={searchInput}
            onChange={(event) => handleSearchInputChange(event.target.value)}
            className="pl-9"
          />
        </div>
      </ListFilterField>

      {closedFilter ? (
        <ListFilterField id="materials-orders-closed" label={tm("label")} className="w-[200px]">
          <Select
            value={closedFilter}
            onValueChange={(value) => updateParam("closed", value === "entregada" ? "" : value)}
          >
            <SelectTrigger id="materials-orders-closed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entregada">{tm("entregada")}</SelectItem>
              <SelectItem value="cancelada">{tm("cancelada")}</SelectItem>
            </SelectContent>
          </Select>
        </ListFilterField>
      ) : null}
    </div>
  );
}
