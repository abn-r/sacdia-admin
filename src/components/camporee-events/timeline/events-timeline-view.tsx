"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarX2 } from "lucide-react";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableHead, TableHeader, TableRow, TableBody } from "@/components/ui/table";
import { RowActionsHead } from "@/components/shared/row-actions";
import { Button } from "@/components/ui/button";
import { groupEventsByDay, hasProgramFilters } from "@/lib/camporee-events/program-groups";
import type { CamporeeEventsData } from "@/lib/camporee-timeline/types";
import { EventsToolbar } from "./events-toolbar";
import { EventDayCard } from "./event-day-card";

interface Props {
  camporeeId: string;
  data: CamporeeEventsData;
  readonly?: boolean;
}

const COLUMNS = 7;

/**
 * Program of the camporee: one table grouped by day. Filters are for everyone;
 * create, edit and cancel follow the user's own permission (`readonly`).
 */
export function EventsTimelineView({ camporeeId, data, readonly = false }: Props) {
  const t = useTranslations("evaluation.camporeeEvents.program");
  const router = useRouter();
  const searchParams = useSearchParams();
  const isUnionCamporee = data.camporeeType === "union";
  const basePath = isUnionCamporee
    ? `/dashboard/campamentos/union/${camporeeId}`
    : `/dashboard/campamentos/${camporeeId}`;

  const openCreate = React.useCallback(() => {
    if (readonly) return;
    router.push(`${basePath}/events/new`);
  }, [readonly, router, basePath]);

  const handleEdit = React.useCallback(
    (eventId: string) => router.push(`${basePath}/events/${eventId}/edit`),
    [router, basePath],
  );

  const groups = React.useMemo(() => groupEventsByDay(data.days, data.events), [data]);
  const filtered = hasProgramFilters(searchParams);
  const noEvents = data.events.length === 0;

  return (
    <div className="space-y-4">
      <EventsToolbar
        data={data}
        camporeeId={camporeeId}
        basePath={basePath}
        onCreate={readonly ? undefined : openCreate}
      />

      <p className="text-[13px] text-muted-foreground tabular-nums">
        {t("summary", { events: data.events.length, days: data.days.length })}
      </p>

      {noEvents ? (
        <EmptyState
          icon={CalendarX2}
          variant={filtered ? "no-results" : "default"}
          title={filtered ? t("noResultsTitle") : t("emptyTitle")}
          description={filtered ? t("noResultsDescription") : t("emptyDescription")}
        >
          {!filtered && !readonly ? (
            <Button type="button" size="sm" onClick={openCreate}>
              {t("createEvent")}
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          <DataTableShell className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">{t("col.time")}</TableHead>
                  <TableHead>{t("col.event")}</TableHead>
                  <TableHead>{t("col.venue")}</TableHead>
                  <TableHead>{t("col.leader")}</TableHead>
                  <TableHead className="text-right">{t("col.points")}</TableHead>
                  <TableHead>{t("col.status")}</TableHead>
                  <RowActionsHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map(({ day, events }) => (
                  <EventDayCard
                    key={day.id}
                    day={day}
                    events={events}
                    venues={data.venues}
                    camporeeId={camporeeId}
                    isUnionCamporee={isUnionCamporee}
                    onAdd={openCreate}
                    onEdit={handleEdit}
                    readonly={readonly}
                    colSpan={COLUMNS}
                  />
                ))}
              </TableBody>
            </Table>
          </DataTableShell>

          <div className="md:hidden">
            {groups.map(({ day, events }) => (
              <EventDayCard
                key={day.id}
                layout="list"
                day={day}
                events={events}
                venues={data.venues}
                camporeeId={camporeeId}
                isUnionCamporee={isUnionCamporee}
                onAdd={openCreate}
                onEdit={handleEdit}
                readonly={readonly}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
