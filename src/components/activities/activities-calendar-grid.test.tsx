import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { ActivitiesCalendarGrid } from "./activities-calendar-grid";
import { TEST_MESSAGES } from "./test-messages";
import { groupActivitiesByDate } from "@/lib/activities/helpers";
import type { Activity } from "@/lib/api/activities";

afterEach(cleanup);

function activity(partial: Partial<Activity>): Activity {
  return {
    activity_id: 1,
    name: "Clase de nudos",
    club_id: 1,
    club_type_id: 2,
    club_section_id: 3,
    lat: 0,
    long: 0,
    activity_place: "Parque del Lago",
    activity_type_id: 1,
    active: true,
    ...partial,
  };
}

const ITEMS = [
  activity({ activity_id: 1, name: "Caminata al mirador", activity_date: "2026-11-07", activity_time: "07:00" }),
  activity({ activity_id: 2, name: "Reunión directiva", activity_date: "2026-11-25", activity_time: "20:00", activity_series_id: 5 }),
];

function renderGrid(view: "month" | "week", locale = "es") {
  const messages = locale === "es" ? TEST_MESSAGES : { ...TEST_MESSAGES };
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ActivitiesCalendarGrid
        view={view}
        anchor={new Date(2026, 10, 24)}
        activitiesByDate={groupActivitiesByDate(ITEMS)}
        today="2026-11-24"
        onSelectDate={vi.fn()}
        detailPath={(id) => `/dashboard/clubs/activities/${id}`}
      />
    </NextIntlClientProvider>,
  );
}

describe("ActivitiesCalendarGrid", () => {
  it("mutes what already happened and keeps the upcoming activity at full weight", () => {
    renderGrid("month");

    expect(screen.getByRole("link", { name: /Caminata al mirador/ })).toHaveAttribute("data-phase", "past");
    expect(screen.getByRole("link", { name: /Reunión directiva/ })).toHaveAttribute("data-phase", "current");
  });

  it("marks only today's day number", () => {
    renderGrid("month");

    const today = document.querySelectorAll('[aria-current="date"]');
    expect(today).toHaveLength(1);
    expect(today[0]).toHaveTextContent("24");
  });

  it("links each activity to its detail", () => {
    renderGrid("month");

    expect(screen.getByRole("link", { name: /Reunión directiva/ })).toHaveAttribute(
      "href",
      "/dashboard/clubs/activities/2",
    );
  });

  it("names the weekdays in the panel language, Sunday first", () => {
    renderGrid("month");
    const header = screen.getByText("dom");
    expect(header).toBeInTheDocument();
    cleanup();

    renderGrid("month", "en");
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.queryByText("dom")).toBeNull();
  });

  it("shows the week as seven days", () => {
    renderGrid("week");
    const days = screen.getAllByRole("button");
    expect(days).toHaveLength(7);
    expect(within(days[3]!).getByText("25")).toBeInTheDocument();
  });
});
