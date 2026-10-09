import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { InvestitureRequest } from "@/lib/api/investiture-requests";

const mockPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

import { RequestsListClientPage } from "./requests-list-client-page";

const later: InvestitureRequest = {
  request_id: "req-later",
  club_section_id: 2,
  ecclesiastical_year_id: 7,
  club_id: 11,
  club_name: "Club Águilas",
  section_name: "Conquistadores",
  district_name: "Distrito Norte",
  pending_count: 4,
  earliest_investiture_date: "2026-11-20",
  created_at: "2026-10-01T15:00:00.000Z",
  people: [],
};

const sooner: InvestitureRequest = {
  ...later,
  request_id: "req-sooner",
  club_name: "Club Halcones",
  section_name: "Aventureros",
  district_name: "Distrito Sur",
  pending_count: 2,
  earliest_investiture_date: "2026-11-05",
};

const years = [
  {
    ecclesiastical_year_id: 7,
    name: "2026",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    active: true,
  },
];

function renderPage(props: Partial<React.ComponentProps<typeof RequestsListClientPage>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RequestsListClientPage
        requests={[later, sooner]}
        yearId={7}
        years={years as never}
        loadError={null}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("RequestsListClientPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the header and one row per request, soonest date first, linking to the detail", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Autorizaciones de investidura" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Solicitudes pendientes de tu distrito o Campo."),
    ).toBeInTheDocument();

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Club Halcones")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Aventureros")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Distrito Sur")).toBeInTheDocument();
    expect(within(rows[0]).getByText("2")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Club Águilas")).toBeInTheDocument();
    expect(within(rows[1]).getByText("4")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Club Halcones" })).toHaveAttribute(
      "href",
      "/dashboard/investiture-requests/req-sooner",
    );
    expect(screen.getByRole("link", { name: "Club Águilas" })).toHaveAttribute(
      "href",
      "/dashboard/investiture-requests/req-later",
    );
  });

  it("opens the detail when the whole row is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    const row = screen.getAllByRole("row")[1];
    await user.click(within(row).getByText("Aventureros"));

    expect(mockPush).toHaveBeenCalledWith("/dashboard/investiture-requests/req-sooner");
  });

  it("shows the empty state when there are no requests", () => {
    renderPage({ requests: [] });

    expect(screen.getByText("No hay solicitudes pendientes")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the forbidden banner instead of the table when the list is refused", () => {
    renderPage({
      requests: [],
      loadError: { status: 403, message: "Tu rol no puede ver esta lista." },
    });

    expect(screen.getByText("Tu rol no puede ver esta lista.")).toBeInTheDocument();
    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
    expect(screen.queryByText("No hay solicitudes pendientes")).not.toBeInTheDocument();
  });

  it("shows a no-districts empty state instead of the banner for a pastor without districts", () => {
    renderPage({
      requests: [],
      isPastorOnly: true,
      loadError: {
        status: 403,
        code: "INVESTITURE_REQUEST_FORBIDDEN",
        message: "Tu rol no puede ver esta lista.",
      },
    });

    expect(screen.getByText("Todavía no tenés distritos asignados")).toBeInTheDocument();
    expect(screen.getByText("Pedí al Campo que te asigne.")).toBeInTheDocument();
    expect(screen.queryByText("Acceso denegado")).not.toBeInTheDocument();
    expect(screen.queryByText("Tu rol no puede ver esta lista.")).not.toBeInTheDocument();
  });

  it("keeps the forbidden banner for non-pastor roles", () => {
    renderPage({
      requests: [],
      isPastorOnly: false,
      loadError: {
        status: 403,
        code: "INVESTITURE_REQUEST_FORBIDDEN",
        message: "Tu rol no puede ver esta lista.",
      },
    });

    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no tenés distritos asignados")).not.toBeInTheDocument();
  });

  it("keeps the banner for a pastor when the failure is not a 403", () => {
    renderPage({
      requests: [],
      isPastorOnly: true,
      loadError: { status: 500, message: "Falló" },
    });

    expect(screen.getByText("Falló")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no tenés distritos asignados")).not.toBeInTheDocument();
  });

  it("explains that there is no active year when yearId is null", () => {
    renderPage({ requests: [], yearId: null });

    expect(screen.getByText("No hay un año eclesiástico activo")).toBeInTheDocument();
  });
});
