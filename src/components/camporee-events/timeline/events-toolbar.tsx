"use client";

import * as React from "react";
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
  onCreate: () => void;
  onImportFromCatalog?: () => void;
}

export function EventsToolbar({ data, onCreate, onImportFromCatalog }: Props) {
  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-xs p-3 mb-3.5 flex items-center gap-2 flex-wrap">
      <div className="relative">
        <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          placeholder="Buscar evento, líder o sede…"
          className="pl-8 h-9 w-[280px] text-[12.5px]"
        />
      </div>

      <Select>
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

      <Select>
        <SelectTrigger className="h-9 w-[170px] text-[12.5px]">
          <SelectValue placeholder="Cualquier sección" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Cualquier sección</SelectItem>
          <SelectItem value="aventureros">Aventureros</SelectItem>
          <SelectItem value="conquistadores">Conquistadores</SelectItem>
          <SelectItem value="guias">Guías Mayores</SelectItem>
        </SelectContent>
      </Select>

      <Select>
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

      <Select>
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

      <div className="ml-auto flex gap-2 items-center">
        <span className="text-[12px] text-muted-foreground">
          Mostrando <b className="text-foreground">{data.events.length}</b> eventos en{" "}
          <b className="text-foreground">{data.days.length} días</b>
        </span>
        <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => { /* TODO: wire filters */ }}>
          <SlidersHorizontal />
          Más filtros
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => { /* TODO: wire export */ }}>
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
