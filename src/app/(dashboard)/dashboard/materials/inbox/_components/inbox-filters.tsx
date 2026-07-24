"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ListFilterField,
  ListFiltersShell,
} from "@/components/shared/list-filters-shell";
import type { MaterialEstado } from "@/lib/types/materials";

const ESTADO_VALUES: Array<MaterialEstado | "all"> = [
  "all",
  "en_revision",
  "aprobada",
  "pagada",
  "entregada",
  "cancelada",
];

interface InboxFiltersProps {
  currentEstado: MaterialEstado | "all";
  currentQ: string;
}

export function InboxFilters({ currentEstado, currentQ }: InboxFiltersProps) {
  const t = useTranslations("materials.pages.inbox");
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
      if (key === "estado") {
        // Keep estado=all explicit — omitting the param falls back to en_revision on the server.
        params.set(key, normalized || "all");
      } else if (!normalized || normalized === "all") {
        params.delete(key);
      } else {
        params.set(key, normalized);
      }
      params.delete("page");
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      if (mode === "replace") {
        router.replace(nextUrl);
      } else {
        router.push(nextUrl);
      }
    },
    [pathname, router],
  );

  const handleSearchInputChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParam("q", value, "replace");
      }, 400);
    },
    [updateParam],
  );

  return (
    <ListFiltersShell title={t("filtersTitle")} hint={t("filtersHint")}>
      <ListFilterField id="materials-orders-search" label={t("filterSearch")} className="w-[300px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="materials-orders-search"
            placeholder={t("searchPlaceholder")}
            value={searchInput}
            onChange={(event) => handleSearchInputChange(event.target.value)}
            className="bg-background pl-9"
          />
        </div>
      </ListFilterField>

      <ListFilterField id="materials-orders-status" label={t("filterStatus")} className="w-[200px]">
        <Select
          value={currentEstado}
          onValueChange={(value) => updateParam("estado", value)}
        >
          <SelectTrigger id="materials-orders-status" className="bg-background">
            <SelectValue placeholder={t("filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            {ESTADO_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`statusOptions.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ListFilterField>
    </ListFiltersShell>
  );
}
