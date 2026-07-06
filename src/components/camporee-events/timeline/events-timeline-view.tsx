"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { CamporeeEventsData } from "@/lib/camporee-timeline/types";
import { EventsSummaryKpis } from "./events-summary-kpis";
import { EventsToolbar } from "./events-toolbar";
import { EventDayCard } from "./event-day-card";

interface Props {
  camporeeId: string;
  data: CamporeeEventsData;
  readonly?: boolean;
}

export function EventsTimelineView({ camporeeId, data, readonly = false }: Props) {
  const router = useRouter();
  const isUnionCamporee = data.camporeeType === "union";
  const basePath = isUnionCamporee
    ? `/dashboard/camporees/union/${camporeeId}`
    : `/dashboard/camporees/${camporeeId}`;

  // Navigate to the dedicated create-event page instead of opening a drawer.
  // The spec (PR6a+PR7) mandates a dedicated page for create/edit (DS §6.1.1:
  // >4 fields + relations). The drawer is removed from the create flow.
  const openCreate = React.useCallback(() => {
    if (readonly) return;
    router.push(`${basePath}/events/new`);
  }, [readonly, router, basePath]);

  const handleEdit = React.useCallback(
    (eventId: string) => {
      router.push(`${basePath}/events/${eventId}/edit`);
    },
    [router, basePath],
  );

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
          camporeeId={camporeeId}
          basePath={basePath}
          onCreate={openCreate}
          onImportFromCatalog={openCreate}
        />
      )}

      <div className="flex flex-col gap-4">
        {data.days.map((d) => (
          <EventDayCard
            key={d.id}
            day={d}
            events={eventsByDay.get(d.numero) ?? []}
            venues={data.venues}
            camporeeId={camporeeId}
            isUnionCamporee={isUnionCamporee}
            onAdd={openCreate}
            onEdit={handleEdit}
            readonly={readonly}
          />
        ))}
      </div>
    </div>
  );
}
