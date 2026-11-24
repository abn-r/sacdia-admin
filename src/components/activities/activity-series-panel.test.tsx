import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import { ActivitySeriesPanel } from "./activity-series-panel";
import { TEST_MESSAGES } from "./test-messages";
import type { Activity, ActivitySeriesSummary } from "@/lib/api/activities";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/activities", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/activities")>()),
  cancelFutureActivitySeries: vi.fn(),
}));

afterEach(cleanup);

const SERIES: ActivitySeriesSummary = {
  activity_series_id: 5,
  club_id: 1,
  ecclesiastical_year_id: 1,
  name: "Reunión directiva",
  until_date: "2026-12-16",
  kind: "weekly",
  weekdays: [3],
  counts: { total: 7, active: 7, upcoming: 3, past: 4 },
};

function session(id: number, date: string): Activity {
  return {
    activity_id: id,
    name: "Reunión directiva",
    club_id: 1,
    club_type_id: 2,
    club_section_id: 3,
    lat: 0,
    long: 0,
    activity_place: "Virtual",
    activity_type_id: 1,
    active: true,
    activity_date: date,
    activity_time: "20:00",
  };
}

function renderPanel(props: Partial<React.ComponentProps<typeof ActivitySeriesPanel>> = {}) {
  render(
    <NextIntlClientProvider locale="es" messages={TEST_MESSAGES}>
      <ActivitySeriesPanel
        series={SERIES}
        sessions={[session(10, "2026-11-18"), session(11, "2026-11-25"), session(12, "2026-12-02")]}
        sessionsFailed={false}
        currentActivityId={11}
        today="2026-11-24"
        canEdit
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("ActivitySeriesPanel", () => {
  it("states the rule, the end and the number of sessions, with a way to view the series", () => {
    renderPanel();

    expect(screen.getByText("Cada miércoles hasta el 16 de diciembre de 2026 · 7 sesiones")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ver serie/ })).toBeInTheDocument();
  });

  it("lists the sessions in the sheet and marks this one", async () => {
    renderPanel();

    await userEvent.setup().click(screen.getByRole("button", { name: /Ver serie/ }));

    expect(await screen.findByRole("link", { name: /Esta sesión/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("offers to cancel the upcoming sessions only to who can edit, and only if there are any", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /Ver serie/ }));
    expect(await screen.findByRole("button", { name: "Cancelar futuras" })).toBeInTheDocument();
    cleanup();

    renderPanel({ canEdit: false });
    await user.click(screen.getByRole("button", { name: /Ver serie/ }));
    await screen.findByRole("link", { name: /Esta sesión/ });
    expect(screen.queryByRole("button", { name: "Cancelar futuras" })).toBeNull();
  });

  it("says when the sessions could not be loaded", async () => {
    renderPanel({ sessions: [], sessionsFailed: true });

    await userEvent.setup().click(screen.getByRole("button", { name: /Ver serie/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar las sesiones de la serie.");
  });
});
