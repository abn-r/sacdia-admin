"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SECTION_COLOR } from "@/lib/camporee-timeline/event-categories";
import { cn } from "@/lib/utils";

import type { CamporeeDay, CamporeeEvent, Section, Venue } from "@/lib/camporee-timeline/types";
import { EventRow } from "./event-row";
import { durMin, sortByStart, toMin, formatHours } from "@/lib/camporee-timeline/helpers";

interface Props {
  day: CamporeeDay;
  events: CamporeeEvent[];
  venues: Venue[];
  onAdd: (dayNumber: number) => void;
  onEdit: (eventId: string) => void;
  readonly?: boolean;
}

function HeatBar({ events }: { events: CamporeeEvent[] }) {
  const buckets = Array(18).fill(0);
  events.forEach((e) => {
    const startH = Math.floor(toMin(e.startsAt) / 60) - 6;
    const endH = Math.ceil(toMin(e.endsAt) / 60) - 6;
    for (let i = Math.max(0, startH); i < Math.min(18, endH); i++) buckets[i]++;
  });
  const maxB = Math.max(...buckets, 1);
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1">
        Distribución horaria · 06–24h
      </div>
      <div className="flex gap-[1px]">
        {buckets.map((v, i) => {
          const intensity = v === 0 ? 0 : v / maxB;
          return (
            <span
              key={i}
              title={`${i + 6}:00 — ${v} evento${v === 1 ? "" : "s"}`}
              className={cn(
                "flex-1 h-1.5 rounded-[1px]",
                v === 0 && "bg-muted",
                intensity > 0 && intensity <= 0.33 && "bg-primary/40",
                intensity > 0.33 && intensity <= 0.66 && "bg-primary/70",
                intensity > 0.66 && "bg-primary",
              )}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground/70 mt-0.5">
        <span>06h</span><span>09h</span><span>12h</span>
        <span>15h</span><span>18h</span><span>21h</span><span>24h</span>
      </div>
    </div>
  );
}

const SECTION_NAMES: Section[] = [
  "Aventureros",
  "Conquistadores",
  "Guías Mayores",
];

function DayBadge({ day }: { day: CamporeeDay }) {
  return (
    <div className="size-[52px] rounded-xl bg-primary text-primary-foreground grid place-items-center">
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-90 leading-none">
        Día
      </div>
      <div className="text-[22px] font-bold tracking-tight leading-none mt-0.5 tabular-nums">
        {day.numero}
      </div>
    </div>
  );
}

export function EventDayCard({ day, events, venues, onAdd, onEdit, readonly = false }: Props) {
  const sorted = React.useMemo(() => [...events].sort(sortByStart), [events]);
  const totalMin = sorted.reduce((s, e) => s + durMin(e.startsAt, e.endsAt), 0);
  const venuesUsed = new Set(sorted.map((e) => e.venueId)).size;

  const secCount: Record<Section, number> = {
    Aventureros: 0,
    Conquistadores: 0,
    "Guías Mayores": 0,
  };
  sorted.forEach((e) => e.sections.forEach((s) => { secCount[s] = (secCount[s] || 0) + 1; }));

  const venueOf = (id: string) => venues.find((v) => v.id === id) ?? { id, name: "—", capacity: 0 };

  if (sorted.length === 0) {
    return (
      <Card className="block gap-0 py-0 rounded-xl border-border/60 bg-card shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 bg-muted/30 flex items-center gap-4">
          <DayBadge day={day} />
          <div className="flex-1">
            <div className="text-[15px] font-semibold tracking-tight">
              {day.diaSemana} · {day.fechaFmt}
            </div>
            <div className="text-[12px] text-muted-foreground">Sin eventos programados</div>
          </div>
        </div>
        {!readonly && (
          <button
            type="button"
            onClick={() => onAdd(day.numero)}
            className="w-full py-5 text-[12.5px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 font-medium"
          >
            <Plus className="size-3.5" /> Agregar el primer evento de este día
          </button>
        )}
      </Card>
    );
  }

  return (
    <Card className="block gap-0 py-0 rounded-xl border-border/60 bg-card shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 bg-muted/30 grid grid-cols-[auto_1fr_auto] gap-5 items-center">
        <DayBadge day={day} />

        <div>
          <div className="text-[15px] font-semibold tracking-tight">
            {day.diaSemana} · {day.fechaFmt}
          </div>
          <div className="text-[12px] text-muted-foreground flex items-center gap-2 mt-0.5">
            <span>{sorted.length} eventos programados</span>
            <span className="size-0.5 rounded-full bg-muted-foreground/40" />
            <span>{formatHours(totalMin)}h de contenido</span>
            <span className="size-0.5 rounded-full bg-muted-foreground/40" />
            <span>{venuesUsed} sedes en uso</span>
            <span className="size-0.5 rounded-full bg-muted-foreground/40" />
            <span className="inline-flex items-center gap-1">
              Secciones
              <span className="inline-flex gap-0.5">
                {SECTION_NAMES.map((s) =>
                  secCount[s] > 0 ? (
                    <span
                      key={s}
                      className={cn("size-1.5 rounded-full", SECTION_COLOR[s].dot)}
                      title={`${s}: ${secCount[s]}`}
                    />
                  ) : null,
                )}
              </span>
            </span>
          </div>
        </div>

        <div className="w-[200px]">
          <HeatBar events={sorted} />
        </div>
      </div>

      <div className="flex flex-col">
        {sorted.map((ev) => (
          <EventRow
            key={ev.id}
            event={ev}
            venue={venueOf(ev.venueId)}
            onEdit={() => onEdit(ev.id)}
          />
        ))}
      </div>

      {!readonly && (
        <>
          <Separator />
          <button
            type="button"
            onClick={() => onAdd(day.numero)}
            className="w-full py-2.5 text-[12px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 font-medium"
          >
            <Plus className="size-3.5" /> Agregar evento al {day.diaSemana.toLowerCase()}
          </button>
        </>
      )}
    </Card>
  );
}
