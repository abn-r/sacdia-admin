"use client";

import { usePanelPath } from "@/lib/v2/panel-path-context";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Download, SlidersHorizontal, Plus, Library } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EVENT_CATEGORIES,
  EVENT_STATUS_LABEL,
} from "@/lib/camporee-timeline/event-categories";
import type { CamporeeEventsData } from "@/lib/camporee-timeline/types";

interface Props {
  data: CamporeeEventsData;
  camporeeId: string;
  basePath?: string;
  onCreate: () => void;
  onImportFromCatalog?: () => void;
}

// ─── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState<T>(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventsToolbar({
  data,
  camporeeId,
  basePath = `/dashboard/camporees/${camporeeId}`,
  onCreate,
  onImportFromCatalog,
}: Props) {
  const { toPanelPath } = usePanelPath();

  const t = useTranslations("camporeeEvents.timeline");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialise from current URL params
  const [query, setQuery] = React.useState(searchParams.get("q") ?? "");
  const [category, setCategory] = React.useState(searchParams.get("category") ?? "");
  const [section, setSection] = React.useState(searchParams.get("section") ?? "");
  const [venue, setVenue] = React.useState(searchParams.get("venue") ?? "");
  const [status, setStatus] = React.useState(searchParams.get("status") ?? "");

  const debouncedQuery = useDebounce(query, 300);

  // Push URL params whenever any filter changes
  React.useEffect(() => {
    const params = new URLSearchParams();
    // Preserve existing non-filter params (e.g. tab)
    searchParams.forEach((value, key) => {
      if (!["q", "category", "section", "venue", "status"].includes(key)) {
        params.set(key, value);
      }
    });

    if (debouncedQuery) params.set("q", debouncedQuery);
    if (category && category !== "all") params.set("category", category);
    if (section && section !== "all") params.set("section", section);
    if (venue && venue !== "all") params.set("venue", venue);
    if (status && status !== "all") params.set("status", status);

    router.push(`${toPanelPath(basePath)}?${params.toString()}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, category, section, venue, status, basePath, router, toPanelPath]);

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-xs p-3 mb-3.5 flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative">
        <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          placeholder={t("toolbarSearchPlaceholder")}
          className="pl-8 h-9 w-[280px] text-[12.5px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Category filter */}
      <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 w-[180px] text-[12.5px]">
          <SelectValue placeholder="Cualquier categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Cualquier categoría</SelectItem>
          {EVENT_CATEGORIES.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Section filter */}
      <Select value={section || "all"} onValueChange={(v) => setSection(v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 w-[170px] text-[12.5px]">
          <SelectValue placeholder="Cualquier sección" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Cualquier sección</SelectItem>
          <SelectItem value="adventurers">Aventureros</SelectItem>
          <SelectItem value="pathfinders">Conquistadores</SelectItem>
          <SelectItem value="master_guides">Guías Mayores</SelectItem>
        </SelectContent>
      </Select>

      {/* Venue filter */}
      <Select value={venue || "all"} onValueChange={(v) => setVenue(v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 w-[170px] text-[12.5px]">
          <SelectValue placeholder="Cualquier sede" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Cualquier sede</SelectItem>
          {data.venues.map((v) => (
            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 w-[160px] text-[12.5px]">
          <SelectValue placeholder="Cualquier estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Cualquier estado</SelectItem>
          {Object.entries(EVENT_STATUS_LABEL).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Right side */}
      <div className="ml-auto flex gap-2 items-center">
        <span className="text-[12px] text-muted-foreground">
          Mostrando <b className="text-foreground">{data.events.length}</b> eventos en{" "}
          <b className="text-foreground">{data.days.length} días</b>
        </span>
        <Button variant="outline" size="sm" className="h-8 text-[12px]">
          <SlidersHorizontal />
          Más filtros
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-[12px]">
          <Download />
          Exportar
        </Button>
        {onImportFromCatalog && (
          <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={onImportFromCatalog}>
            <Library />
            Importar
          </Button>
        )}
        <Button size="sm" className="h-8 text-[12px]" onClick={onCreate}>
          <Plus />
          Crear evento
        </Button>
      </div>
    </div>
  );
}
