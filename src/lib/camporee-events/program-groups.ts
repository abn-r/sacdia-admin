import type { CamporeeDay, CamporeeEvent, EventStatus } from "@/lib/camporee-timeline/types";
import { sortByStart } from "@/lib/camporee-timeline/helpers";

export interface ProgramDayGroup {
  day: CamporeeDay;
  events: CamporeeEvent[];
}

/** Events grouped by camporee day (all days kept, even empty ones), sorted by start time. */
export function groupEventsByDay(days: CamporeeDay[], events: CamporeeEvent[]): ProgramDayGroup[] {
  return days.map((day) => ({
    day,
    events: events.filter((event) => event.dayNumber === day.numero).sort(sortByStart),
  }));
}

/** Statuses that need no mark in the table. Only the exception is marked. */
export const PROGRAM_NORMAL_STATUSES: EventStatus[] = ["publicado", "en_curso", "realizado"];

/** Events that were scheduled but never published or were cancelled. */
export function countProgramExceptions(events: CamporeeEvent[]): number {
  return events.filter((event) => !PROGRAM_NORMAL_STATUSES.includes(event.status)).length;
}

export const PROGRAM_FILTER_KEYS = ["q", "category", "section", "venue", "status"] as const;

export function hasProgramFilters(params: { get(name: string): string | null }): boolean {
  return PROGRAM_FILTER_KEYS.some((key) => Boolean(params.get(key)));
}
