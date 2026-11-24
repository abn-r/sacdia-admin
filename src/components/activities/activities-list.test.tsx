import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import { ActivitiesList } from "./activities-list";
import { TEST_MESSAGES } from "./test-messages";
import type { Activity } from "@/lib/api/activities";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/dashboard/clubs/activities",
  useSearchParams: () => new URLSearchParams(),
}));

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
    activity_date: "2026-11-29",
    activity_time: "09:00",
    ...partial,
  };
}

const ITEMS = [
  activity({ activity_id: 1, name: "Caminata al mirador", activity_date: "2026-11-07" }),
  activity({
    activity_id: 2,
    name: "Reunión directiva",
    activity_date: "2026-11-25",
    activity_time: "20:00",
    platform: 1,
    activity_place: "Virtual",
    audience: "board",
    activity_series_id: 5,
  }),
];

function renderList(props: Partial<React.ComponentProps<typeof ActivitiesList>> = {}) {
  const onDelete = vi.fn();
  render(
    <NextIntlClientProvider locale="es" messages={TEST_MESSAGES}>
      <ActivitiesList
        activities={ITEMS}
        today="2026-11-24"
        sectionLabels={{ 3: "Conquistadores" }}
        detailPath={(id) => `/dashboard/clubs/activities/${id}`}
        editPath={(id) => `/dashboard/clubs/activities/${id}/edit`}
        canEdit
        onDelete={onDelete}
        {...props}
      />
    </NextIntlClientProvider>,
  );
  return { onDelete };
}

describe("ActivitiesList", () => {
  it("mutes the past rows and links names to the detail", () => {
    renderList();
    const table = screen.getAllByRole("table")[0]!;

    const past = within(table).getByRole("link", { name: "Caminata al mirador" }).closest("tr");
    const current = within(table).getByRole("link", { name: "Reunión directiva" }).closest("tr");
    expect(past).toHaveAttribute("data-phase", "past");
    expect(current).toHaveAttribute("data-phase", "current");
    expect(within(table).getByRole("link", { name: "Reunión directiva" })).toHaveAttribute(
      "href",
      "/dashboard/clubs/activities/2",
    );
  });

  it("shows Virtual instead of an address and says the series repeats", () => {
    renderList();
    const row = within(screen.getAllByRole("table")[0]!).getByRole("link", { name: "Reunión directiva" }).closest("tr")!;

    expect(within(row).getByText("Virtual")).toBeInTheDocument();
    expect(within(row).getByText(/Directiva · se repite/)).toBeInTheDocument();
    expect(within(row).getByText("Conquistadores")).toBeInTheDocument();
  });

  it("puts edit and delete in the row menu and asks to delete", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderList();
    const table = screen.getAllByRole("table")[0]!;

    await user.click(within(table).getByRole("button", { name: /Reunión directiva/ }));
    expect(await screen.findByRole("menuitem", { name: /Editar/ })).toHaveAttribute(
      "href",
      "/dashboard/clubs/activities/2/edit",
    );
    await user.click(screen.getByRole("menuitem", { name: /Eliminar…/ }));

    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ activity_id: 2 }));
  });

  it("hides the menu actions without the edit permission", () => {
    renderList({ canEdit: false });
    expect(within(screen.getAllByRole("table")[0]!).queryByRole("button", { name: /Reunión directiva/ })).toBeNull();
  });

  it("explains an empty period instead of drawing an empty table", () => {
    renderList({ activities: [] });
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Sin actividades en este periodo")).toBeInTheDocument();
  });
});
