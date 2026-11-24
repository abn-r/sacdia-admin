"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListFilterField } from "@/components/shared/list-filters-shell";
import type { LocalFieldOption, MaterialCategoryAdmin } from "@/lib/types/materials";

interface CatalogFiltersProps {
  currentQ: string;
  currentCat: string;
  categories: MaterialCategoryAdmin[];
  currentLocalFieldId: number | null;
  localFields: LocalFieldOption[];
}

export function CatalogFilters({
  currentQ,
  currentCat,
  categories,
  currentLocalFieldId,
  localFields,
}: CatalogFiltersProps) {
  const t = useTranslations("materials.pages.inventory");
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
      if (!normalized || normalized === "all") params.delete(key);
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
      <ListFilterField id="materials-catalog-search" label={t("filterSearch")} className="w-[300px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="materials-catalog-search"
            placeholder={t("searchPlaceholder")}
            value={searchInput}
            onChange={(event) => handleSearchInputChange(event.target.value)}
            className="pl-9"
          />
        </div>
      </ListFilterField>

      <ListFilterField id="materials-catalog-category" label={t("filterCategory")} className="w-[220px]">
        <Select value={currentCat || "all"} onValueChange={(value) => updateParam("cat", value)}>
          <SelectTrigger id="materials-catalog-category">
            <SelectValue placeholder={t("filterCategory")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("categoryAll")}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ListFilterField>

      {localFields.length > 0 ? (
        <ListFilterField id="materials-catalog-lf" label={t("filterLocalField")} className="w-[240px]">
          <Select
            value={currentLocalFieldId != null ? String(currentLocalFieldId) : "all"}
            onValueChange={(value) => updateParam("local_field_id", value)}
          >
            <SelectTrigger id="materials-catalog-lf">
              <SelectValue placeholder={t("filterLocalField")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("localFieldAll")}</SelectItem>
              {localFields.map((lf) => (
                <SelectItem key={lf.local_field_id} value={String(lf.local_field_id)}>
                  {lf.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ListFilterField>
      ) : null}
    </div>
  );
}
