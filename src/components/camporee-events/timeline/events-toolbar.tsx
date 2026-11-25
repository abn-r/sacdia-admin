"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_CATEGORIES } from "@/lib/camporee-timeline/event-categories";
import type { CamporeeEventsData } from "@/lib/camporee-timeline/types";
import { PROGRAM_FILTER_KEYS, hasProgramFilters } from "@/lib/camporee-events/program-groups";

interface Props {
  data: CamporeeEventsData;
  camporeeId: string;
  basePath?: string;
  /** Shown only when the user can create events. */
  onCreate?: () => void;
  /** @deprecated "Importar" repeated "Nuevo evento"; kept so older callers still compile. */
  onImportFromCatalog?: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState<T>(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const ALL = "all";
const STATUS_FILTERS = ["programado", "publicado", "en_curso", "realizado", "cancelado"] as const;
const SECTION_FILTERS = ["adventurers", "pathfinders", "master_guides"] as const;

/**
 * Filters and search for the camporee program. Everyone can filter; only
 * users who can create events see "Nuevo evento". The filters live in the URL
 * (`q`, `category`, `section`, `venue`, `status`) and the server applies them.
 */
export function EventsToolbar({
  data,
  camporeeId,
  basePath = `/dashboard/campamentos/${camporeeId}`,
  onCreate,
}: Props) {
  const t = useTranslations("evaluation.camporeeEvents.program");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = React.useState(searchParams.get("q") ?? "");
  const [category, setCategory] = React.useState(searchParams.get("category") ?? "");
  const [section, setSection] = React.useState(searchParams.get("section") ?? "");
  const [venue, setVenue] = React.useState(searchParams.get("venue") ?? "");
  const [status, setStatus] = React.useState(searchParams.get("status") ?? "");

  const debouncedQuery = useDebounce(query, 300);

  React.useEffect(() => {
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (!(PROGRAM_FILTER_KEYS as readonly string[]).includes(key)) params.set(key, value);
    });

    if (debouncedQuery) params.set("q", debouncedQuery);
    if (category && category !== ALL) params.set("category", category);
    if (section && section !== ALL) params.set("section", section);
    if (venue && venue !== ALL) params.set("venue", venue);
    if (status && status !== ALL) params.set("status", status);

    // Skip when nothing changed (mount, or URL already in sync): avoids a
    // redundant server render and extra history entries.
    const normalize = (value: URLSearchParams) => {
      const sorted = new URLSearchParams(value);
      sorted.sort();
      return sorted.toString();
    };
    if (normalize(params) === normalize(new URLSearchParams(searchParams.toString()))) return;

    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, category, section, venue, status, basePath, router]);

  const filtered = hasProgramFilters(searchParams) || Boolean(query);

  function clearFilters() {
    setQuery("");
    setCategory("");
    setSection("");
    setVenue("");
    setStatus("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="search">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          aria-label={t("filters.search")}
          placeholder={t("filters.searchPlaceholder")}
          className="h-9 w-full pl-8 sm:w-[280px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Select value={category || ALL} onValueChange={(v) => setCategory(v === ALL ? "" : v)}>
        <SelectTrigger aria-label={t("filters.category")} className="h-9 w-full sm:w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filters.categoryAll")}</SelectItem>
          {EVENT_CATEGORIES.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {t(`categories.${c.id}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={section || ALL} onValueChange={(v) => setSection(v === ALL ? "" : v)}>
        <SelectTrigger aria-label={t("filters.section")} className="h-9 w-full sm:w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filters.sectionAll")}</SelectItem>
          {SECTION_FILTERS.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`sections.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={venue || ALL} onValueChange={(v) => setVenue(v === ALL ? "" : v)}>
        <SelectTrigger aria-label={t("filters.venue")} className="h-9 w-full sm:w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filters.venueAll")}</SelectItem>
          {data.venues.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? "" : v)}>
        <SelectTrigger aria-label={t("filters.status")} className="h-9 w-full sm:w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filters.statusAll")}</SelectItem>
          {STATUS_FILTERS.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`statuses.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filtered ? (
        <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
          {t("filters.clear")}
        </Button>
      ) : null}

      {onCreate ? (
        <Button type="button" size="sm" className="sm:ml-auto" onClick={onCreate}>
          <Plus />
          {t("createEvent")}
        </Button>
      ) : null}
    </div>
  );
}
