"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useClubsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestParamsRef = useRef(searchParamsString);

  const currentSearch =
    searchParams.get("search") ??
    searchParams.get("name") ??
    searchParams.get("q") ??
    "";
  const currentStatusFilter = searchParams.get("active") ?? "all";
  const currentLocalField = searchParams.get("localFieldId") ?? "all";
  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    latestParamsRef.current = searchParamsString;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [searchParamsString]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      if (key !== "search" && debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const params = new URLSearchParams(latestParamsRef.current);
      const normalized = value.trim();
      if (!normalized || normalized === "all") {
        params.delete(key);
      } else {
        params.set(key, normalized);
      }
      if (key === "search") {
        params.delete("name");
        params.delete("q");
      }
      params.set("page", "1");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router],
  );

  const handleSearchInputChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParam("search", value);
      }, 400);
    },
    [updateParam],
  );

  const hasActiveFilters = Boolean(
    currentSearch || currentStatusFilter !== "all" || currentLocalField !== "all",
  );

  const clearFilters = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setSearchInput("");
    router.push(pathname);
  }, [pathname, router]);

  return {
    searchInput,
    currentSearch,
    currentStatusFilter,
    currentLocalField,
    hasActiveFilters,
    updateParam,
    handleSearchInputChange,
    clearFilters,
  };
}
