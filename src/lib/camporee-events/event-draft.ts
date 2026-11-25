export type EventDraftSection = "data" | "schedule" | "points";
export type EventDraftField = "title" | "times" | "rubrics";

export interface EventDraftIssue {
  section: EventDraftSection;
  field: EventDraftField;
}

export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export type TimeIssue = "format" | "order" | null;

/** Validates the "HH:MM" pair of the event; empty values are allowed. */
export function validateTimes(start: string, end: string): TimeIssue {
  if (start && !TIME_REGEX.test(start)) return "format";
  if (end && !TIME_REGEX.test(end)) return "format";
  if (start && end && start >= end) return "order";
  return null;
}

/**
 * First problem that blocks saving, in page order (title, times, rubrics).
 * Server-side validation still has the last word; this only keeps the user
 * from sending a draft that is certain to be rejected.
 */
export function firstEventDraftIssue(input: {
  title: string;
  timeIssue: TimeIssue;
  scoringEnabled: boolean;
  rubricsValid: boolean;
}): EventDraftIssue | null {
  if (!input.title.trim()) return { section: "data", field: "title" };
  if (input.timeIssue) return { section: "schedule", field: "times" };
  if (input.scoringEnabled && !input.rubricsValid) return { section: "points", field: "rubrics" };
  return null;
}

export const EVENT_SECTION_IDS: Record<EventDraftSection | "leader" | "attachments", string> = {
  data: "event-data",
  schedule: "event-schedule",
  leader: "event-leader",
  points: "event-points",
  attachments: "event-attachments",
};
