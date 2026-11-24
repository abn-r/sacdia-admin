"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDayHeading } from "@/lib/camporee-events/day-label";
import { sortByStart } from "@/lib/camporee-timeline/helpers";
import type { CamporeeDay, CamporeeEvent, Venue } from "@/lib/camporee-timeline/types";
import { EventRow } from "./event-row";

interface Props {
  day: CamporeeDay;
  events: CamporeeEvent[];
  venues: Venue[];
  camporeeId: string;
  isUnionCamporee?: boolean;
  onAdd: (dayNumber: number) => void;
  onEdit: (eventId: string) => void;
  readonly?: boolean;
  /** `table` renders rows for a `<tbody>` (md+); `list` renders a section for small screens. */
  layout?: "table" | "list";
  /** Columns of the table the group lives in (header row spans them). */
  colSpan?: number;
}

/**
 * One day of the program: a group header ("viernes · 12 feb 2027", event count,
 * add) followed by that day's events in time order. Not a card: the groups share
 * one table.
 */
export function EventDayCard({
  day,
  events,
  venues,
  camporeeId,
  isUnionCamporee = false,
  onAdd,
  onEdit,
  readonly = false,
  layout = "table",
  colSpan = 7,
}: Props) {
  const t = useTranslations("evaluation.camporeeEvents.program");
  const locale = useLocale();
  const sorted = React.useMemo(() => [...events].sort(sortByStart), [events]);
  const venueOf = (id: string): Venue => venues.find((v) => v.id === id) ?? { id, name: "—", capacity: 0 };

  const heading = (
    <>
      <span className="font-medium text-foreground">{formatDayHeading(day.fecha, locale)}</span>
      <span className="ml-2 text-[13px] font-normal text-muted-foreground tabular-nums">
        {t("dayCount", { count: sorted.length })}
      </span>
    </>
  );
  const addButton = readonly ? null : (
    <Button type="button" variant="ghost" size="sm" onClick={() => onAdd(day.numero)}>
      <Plus />
      {t("addToDay")}
    </Button>
  );

  if (layout === "list") {
    return (
      <section aria-label={formatDayHeading(day.fecha, locale)} className="space-y-1">
        <div className="flex items-center justify-between gap-2 py-2 text-sm">
          <div>{heading}</div>
          {addButton}
        </div>
        {sorted.length === 0 ? (
          <p className="pb-3 text-sm text-muted-foreground">{t("dayEmpty")}</p>
        ) : (
          <ul>
            {sorted.map((event) => (
              <EventRow
                key={event.id}
                layout="list"
                event={event}
                venue={venueOf(event.venueId)}
                camporeeId={camporeeId}
                isUnionCamporee={isUnionCamporee}
                onEdit={() => onEdit(event.id)}
                readonly={readonly}
              />
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={colSpan - 1} className="text-sm">
          {heading}
        </TableCell>
        <TableCell className="text-right">{addButton}</TableCell>
      </TableRow>
      {sorted.length === 0 ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={colSpan} className="text-sm text-muted-foreground">
            {t("dayEmpty")}
          </TableCell>
        </TableRow>
      ) : (
        sorted.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            venue={venueOf(event.venueId)}
            camporeeId={camporeeId}
            isUnionCamporee={isUnionCamporee}
            onEdit={() => onEdit(event.id)}
            readonly={readonly}
          />
        ))
      )}
    </>
  );
}
