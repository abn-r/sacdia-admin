import { describe, expect, it } from "vitest";
import {
  buildPendingItems,
  countEventsWithoutJudge,
  setDeadlines,
} from "./summary";

describe("buildPendingItems", () => {
  it("is empty when nothing waits", () => {
    expect(
      buildPendingItems({
        pending: { clubs: [], members: [], payments: [] },
        eventsWithoutJudge: 0,
      }),
    ).toEqual([]);
  });

  it("names each pending thing with where it is solved", () => {
    const items = buildPendingItems({
      pending: {
        clubs: [{ camporee_club_id: 1 } as never],
        members: [{ user_id: "a" }, { user_id: "b" }, { user_id: "c" }],
        payments: [
          { camporee_payment_id: "p1", amount: "900.00", payment_type: "inscription" },
          { camporee_payment_id: "p2", amount: 450, payment_type: "inscription" },
        ],
      },
      eventsWithoutJudge: 2,
    });
    expect(items.map((i) => [i.key, i.count, i.group, i.view])).toEqual([
      ["members", 3, "registrations", "pending"],
      ["clubs", 1, "registrations", "pending"],
      ["payments", 2, "money", "payments"],
      ["eventsWithoutJudge", 2, "scores", "judges"],
    ]);
    expect(items.find((i) => i.key === "payments")?.amount).toBe(1350);
  });
});

describe("countEventsWithoutJudge", () => {
  it("counts scoring events with no active assignment", () => {
    const events = [
      { camporee_event_id: 1, scoring_enabled: true },
      { camporee_event_id: 2, scoring_enabled: true },
      { camporee_event_id: 3, scoring_enabled: false },
    ];
    expect(
      countEventsWithoutJudge(events, { 1: [{ active: true }], 2: [{ active: false }] }),
    ).toBe(1);
  });
});

describe("setDeadlines", () => {
  it("lists only the deadlines that are set, in form order", () => {
    expect(
      setDeadlines({ payment_deadline: "2027-02-05T00:00:00Z", agenda_visible_from: null }).map(
        (d) => d.key,
      ),
    ).toEqual(["payment_deadline"]);
  });
});
