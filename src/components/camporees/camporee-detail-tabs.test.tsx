import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import messages from "../../../messages/es.json";
import { CamporeeDetailTabs } from "@/components/camporees/camporee-detail-tabs";
import type { CamporeeDetailData } from "@/lib/camporees/detail-data";
import { normalizeCamporee } from "@/lib/camporees/normalize";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const search = vi.hoisted(() => ({ value: "" }));
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/dashboard/campamentos/73",
  useSearchParams: () => new URLSearchParams(search.value),
}));

vi.mock("@/lib/api/camporees", () => ({
  getCamporeePendingApprovals: vi.fn(),
  getUnionCamporeePendingApprovals: vi.fn(),
}));

// Programa y Puntajes render the components of the events / scoring modules.
vi.mock("@/components/camporee-events/camporee-events-tab", () => ({
  CamporeeEventsTab: () => <div data-testid="events-tab" />,
}));
vi.mock("@/components/camporee-scoring/event-judge-assignments-panel", () => ({
  EventJudgeAssignmentsPanel: () => <div data-testid="judges-panel" />,
}));
vi.mock("@/components/camporee-scoring/event-score-entry-panel", () => ({
  EventScoreEntryPanel: () => <div data-testid="entry-panel" />,
}));
vi.mock("@/components/camporee-scoring/camporee-leaderboard", () => ({
  CamporeeLeaderboard: () => <div data-testid="leaderboard" />,
}));
vi.mock("@/components/camporee-scoring/camporee-score-breakdown", () => ({
  CamporeeScoreBreakdown: () => <div data-testid="breakdown" />,
}));
vi.mock("@/components/camporees/camporee-staff-tab", () => ({
  CamporeeStaffTab: () => <div data-testid="staff-tab" />,
}));
vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="dynamic-tab" />,
}));

const t = createTranslator({ locale: "es", messages, namespace: "evaluation.camporees" });

const camporee = normalizeCamporee(
  {
    local_camporee_id: 73,
    name: "Camporee Valle Alto 2027",
    start_date: "2027-02-10",
    end_date: "2027-02-12",
    local_camporee_place: "Rancho El Encino",
    local_field_id: 4,
    local_fields: { local_field_id: 4, name: "Asociación Valle Alto" },
    registration_cost: 450,
    payment_deadline: "2027-02-05T23:59:00.000Z",
  },
  "local",
);

function makeData(overrides: Partial<CamporeeDetailData> = {}): CamporeeDetailData {
  return {
    kind: "local",
    id: 73,
    camporee,
    unionName: null,
    location: { group: "summary", view: null },
    members: [],
    membersMeta: undefined,
    membersFailure: null,
    clubs: [],
    clubsFailure: null,
    payments: [],
    paymentsFailure: null,
    paymentOrders: [],
    pending: { clubs: [], members: [], payments: [] },
    pendingFailure: null,
    events: [],
    eventsFailure: null,
    availableTemplates: [],
    venues: [],
    judges: [],
    assignmentsByEvent: {},
    scoringTargetsByEvent: {},
    rubricsByEvent: {},
    leaderboard: null,
    scoreBreakdown: null,
    scoresFailure: null,
    ...overrides,
  };
}

function renderTabs(data: CamporeeDetailData) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeDetailTabs
        data={data}
        canCreateEvents
        canEditEvents
        canEditJudgeAssignments
      />
    </NextIntlClientProvider>,
  );
}

const pendingMembers = [
  { user_id: "a", camporee_member_id: 1, name: "Camila Ibarra" },
  { user_id: "b", camporee_member_id: 2, name: "Santiago Ríos" },
  { user_id: "c", camporee_member_id: 3, name: "Elena Paredes" },
];

describe("CamporeeDetailTabs", () => {
  beforeEach(() => {
    search.value = "";
    replace.mockReset();
  });
  afterEach(cleanup);

  it("groups the 12 old tabs into 5", () => {
    renderTabs(makeData());
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent?.replace(/\d+$/, "").trim());
    expect(tabs).toEqual(["Resumen", "Inscripciones", "Dinero", "Programa", "Puntajes"].map(
      (_, i) => t(`views.groups.${(["summary", "registrations", "money", "program", "scores"] as const)[i]}`),
    ));
  });

  it("the summary says what is missing and links to where it is solved", () => {
    renderTabs(
      makeData({
        pending: {
          clubs: [],
          members: pendingMembers,
          payments: [
            { camporee_payment_id: "p1", amount: "900.00", payment_type: "inscription" },
            { camporee_payment_id: "p2", amount: 450, payment_type: "inscription" },
          ],
        },
        events: [
          { camporee_event_id: 1, scoring_enabled: true },
          { camporee_event_id: 2, scoring_enabled: true },
        ] as never,
      }),
    );
    const members = screen.getByText(t("summary.pending.members", { count: 3 }));
    expect(members).toBeVisible();
    const row = members.closest("li") as HTMLElement;
    expect(within(row).getByRole("link", { name: t("summary.pending.review") })).toHaveAttribute(
      "href",
      "/dashboard/campamentos/73?tab=registrations",
    );
    expect(screen.getByText(t("summary.pending.payments", { count: 2, amount: "$1350.00" }))).toBeVisible();
    const judges = screen.getByText(t("summary.pending.eventsWithoutJudge", { count: 2 })).closest("li") as HTMLElement;
    expect(within(judges).getByRole("link", { name: t("summary.pending.assign") })).toHaveAttribute(
      "href",
      "/dashboard/campamentos/73?tab=scores",
    );
  });

  it("says nothing is pending when all is in order", () => {
    renderTabs(makeData());
    expect(screen.getByText(t("summary.pending.none"))).toBeVisible();
  });

  it("a failed pending load is an error, not 'nothing pending'", () => {
    renderTabs(makeData({ pendingFailure: { kind: "error", detail: { code: 500 } } }));
    expect(screen.getByText(t("summary.pending.loadFailed"))).toBeVisible();
    expect(screen.queryByText(t("summary.pending.none"))).toBeNull();
  });

  it("Inscripciones opens on what waits for approval and has a segmented control", () => {
    search.value = "tab=registrations";
    renderTabs(
      makeData({
        location: { group: "registrations", view: "pending" },
        pending: { clubs: [], members: pendingMembers, payments: [] },
      }),
    );
    const views = screen.getByRole("radiogroup");
    expect(within(views).getAllByRole("radio").map((r) => r.getAttribute("aria-checked"))).toEqual([
      "true",
      "false",
      "false",
    ]);
    expect(screen.getByText(t("pending.membersTitle", { count: 3 }))).toBeVisible();
  });

  it("without anything pending, Inscripciones opens on the members", () => {
    search.value = "tab=registrations";
    renderTabs(makeData({ location: { group: "registrations", view: "pending" } }));
    const checked = screen
      .getAllByRole("radio")
      .find((radio) => radio.getAttribute("aria-checked") === "true");
    expect(checked).toHaveTextContent(t("views.views.members"));
  });

  it("a failed members load shows the error, never an empty list", async () => {
    const user = userEvent.setup();
    search.value = "tab=registrations&view=members";
    renderTabs(
      makeData({
        location: { group: "registrations", view: "members" },
        membersFailure: { kind: "error", detail: { code: 500 } },
      }),
    );
    expect(screen.getByText(t("errors.members"))).toBeVisible();
    // switching view does not need a server round trip
    await user.click(screen.getByRole("radio", { name: new RegExp(t("views.views.clubs")) }));
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.search).toContain("view=clubs");
  });

  it("Programa and Puntajes render the event and scoring components", () => {
    search.value = "tab=program";
    const { unmount } = renderTabs(makeData({ location: { group: "program", view: "events" } }));
    expect(screen.getByTestId("events-tab")).toBeInTheDocument();
    unmount();

    renderTabs(makeData({ location: { group: "scores", view: "results" } }));
    expect(screen.getByTestId("leaderboard")).toBeInTheDocument();
    expect(screen.getByTestId("breakdown")).toBeInTheDocument();
  });

  it("warns that scoring needs the registration closed", () => {
    renderTabs(makeData({ location: { group: "scores", view: "judges" } }));
    expect(screen.getByText(messages.camporees.clubRegistration.scoringGateTitle)).toBeVisible();
    expect(screen.getByTestId("judges-panel")).toBeInTheDocument();
  });

  it("a failed scores load shows the error instead of empty panels", () => {
    renderTabs(
      makeData({
        location: { group: "scores", view: "results" },
        scoresFailure: { kind: "offline" },
      }),
    );
    expect(screen.getByText(t("errors.scores"))).toBeVisible();
    expect(screen.queryByTestId("leaderboard")).toBeNull();
  });
});
