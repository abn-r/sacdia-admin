"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HISTORY_RANGES,
  NOTIFICATION_AUDIENCES,
  type HistoryRange,
  type NotificationAudience,
} from "@/lib/notifications/history-view";

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Search, audience and date filters of the sent history. They live in the URL
 * (`?q=&audience=&range=`) so the server page applies them; changing one goes
 * back to page 1.
 */
export function NotificationHistoryFilters() {
  const t = useTranslations("people.community.notifications.history.filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams?.get("q") ?? "";
  const audience = (searchParams?.get("audience") as NotificationAudience | null) ?? "all";
  const range = (searchParams?.get("range") as HistoryRange | null) ?? "all";
  const [query, setQuery] = useState(urlQuery);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function push(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => push({ q: value.trim() }), SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 basis-56">
        <Label htmlFor="notification-search" className="sr-only">
          {t("searchLabel")}
        </Label>
        <div className="relative">
          <Search
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="notification-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="w-full space-y-1 sm:w-[200px]">
        <Label htmlFor="notification-audience" className="sr-only">
          {t("audienceLabel")}
        </Label>
        <Select value={audience} onValueChange={(value) => push({ audience: value })}>
          <SelectTrigger id="notification-audience" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audienceAll")}</SelectItem>
            {NOTIFICATION_AUDIENCES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`audience.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full space-y-1 sm:w-[200px]">
        <Label htmlFor="notification-range" className="sr-only">
          {t("rangeLabel")}
        </Label>
        <Select value={range} onValueChange={(value) => push({ range: value })}>
          <SelectTrigger id="notification-range" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HISTORY_RANGES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`range.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
