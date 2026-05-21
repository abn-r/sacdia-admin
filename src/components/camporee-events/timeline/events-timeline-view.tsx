"use client";

import * as React from "react";
import type { CamporeeEventsData } from "@/lib/camporee-timeline/types";
import { EventsSummaryKpis } from "./events-summary-kpis";
import { EventsToolbar } from "./events-toolbar";
import { EventDayCard } from "./event-day-card";
import { CreateEventDrawer } from "./create-event-drawer";

interface Props {
  camporeeId: string;
  data: CamporeeEventsData;
  readonly?: boolean;
}

export function EventsTimelineView({ data, readonly = false }: Props) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerDay, setDrawerDay] = React.useState<number>(1);

  const openCreate = (dayNumber?: number) => {
    if (readonly) return;
    if (dayNumber) setDrawerDay(dayNumber);
    setDrawerOpen(true);
  };

  const eventsByDay = React.useMemo(() => {
    const map = new Map<number, typeof data.events>();
    data.days.forEach((d) => map.set(d.numero, []));
    data.events.forEach((e) => {
      const arr = map.get(e.dayNumber);
      if (arr) arr.push(e);
    });
    return map;
  }, [data]);

  return (
    <div>
      <EventsSummaryKpis data={data} />

      {!readonly && (
        <EventsToolbar
          data={data}
          onCreate={() => openCreate()}
          onImportFromCatalog={() => openCreate()}
        />
      )}

      <div className="flex flex-col gap-4">
        {data.days.map((d) => (
          <EventDayCard
            key={d.id}
            day={d}
            events={eventsByDay.get(d.numero) ?? []}
            venues={data.venues}
            onAdd={openCreate}
            onEdit={(eventId) => {
              // TODO: wire backend (navigate to edit page)
              console.log("edit event", eventId);
            }}
            readonly={readonly}
          />
        ))}
      </div>

      {!readonly && (
        <CreateEventDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          data={data}
          defaultDayNumber={drawerDay}
        />
      )}
    </div>
  );
}
