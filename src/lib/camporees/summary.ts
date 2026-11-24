import type { PendingApprovals } from "@/lib/api/camporees";
import type { CamporeeGroup } from "@/lib/camporees/groups";

function toAmount(amount: unknown): number {
  const n = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(n) ? n : 0;
}

export type PendingItemKey =
  | "members"
  | "clubs"
  | "payments"
  | "eventsWithoutJudge";

export type PendingItem = {
  key: PendingItemKey;
  count: number;
  /** Sum for the payments item. */
  amount?: number;
  group: CamporeeGroup;
  view: string;
};

/** Events that score but have nobody assigned as a judge. */
export function countEventsWithoutJudge(
  events: Array<{ camporee_event_id: number; scoring_enabled?: boolean | null }>,
  assignmentsByEvent: Record<number, Array<{ active?: boolean | null }>>,
): number {
  return events.filter((event) => {
    if (!event.scoring_enabled) return false;
    const assignments = assignmentsByEvent[event.camporee_event_id] ?? [];
    return !assignments.some((assignment) => assignment.active !== false);
  }).length;
}

/**
 * What the summary says is missing. Only entries with something to do appear;
 * each one names the group and view that resolves it.
 */
export function buildPendingItems(input: {
  pending: PendingApprovals;
  eventsWithoutJudge: number;
}): PendingItem[] {
  const items: PendingItem[] = [];
  const members = input.pending.members.length;
  const clubs = input.pending.clubs.length;
  const payments = input.pending.payments;
  if (members > 0) {
    items.push({ key: "members", count: members, group: "registrations", view: "pending" });
  }
  if (clubs > 0) {
    items.push({ key: "clubs", count: clubs, group: "registrations", view: "pending" });
  }
  if (payments.length > 0) {
    items.push({
      key: "payments",
      count: payments.length,
      amount: payments.reduce((sum, p) => sum + toAmount(p.amount), 0),
      group: "money",
      view: "payments",
    });
  }
  if (input.eventsWithoutJudge > 0) {
    items.push({
      key: "eventsWithoutJudge",
      count: input.eventsWithoutJudge,
      group: "scores",
      view: "judges",
    });
  }
  return items;
}

export type DeadlineKey =
  | "club_registration_deadline"
  | "member_registration_deadline"
  | "payment_deadline"
  | "agenda_visible_from";

/** Deadlines that are set, in the order the form lists them. */
export function setDeadlines(camporee: {
  club_registration_deadline?: string | null;
  member_registration_deadline?: string | null;
  payment_deadline?: string | null;
  agenda_visible_from?: string | null;
}): Array<{ key: DeadlineKey; value: string }> {
  const keys: DeadlineKey[] = [
    "club_registration_deadline",
    "member_registration_deadline",
    "payment_deadline",
    "agenda_visible_from",
  ];
  return keys.flatMap((key) => {
    const value = camporee[key];
    return value ? [{ key, value }] : [];
  });
}
