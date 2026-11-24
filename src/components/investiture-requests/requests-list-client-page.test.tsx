import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { InvestitureRequest } from "@/lib/api/investiture-requests";

const mockPush = vi.hoisted(() => vi.fn());
const mockReplace = vi.hoisted(() => vi.fn());
const mockSearch = vi.hoisted(() => ({ value: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, refresh: vi.fn() }),
  usePathname: () => "/dashboard/investiture-requests",
  useSearchParams: () => new URLSearchParams(mockSearch.value),
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

const NOW = "2026-11-24T12:00:00.000Z";

const base: InvestitureRequest = {
  request_id: "req-later",
  club_section_id: 2,
  ecclesiastical_year_id: 7,
  club_name: "Club Cedros",
  section_name: "Conquistadores",
  district_name: "Distrito Sur",
  pending_count: 5,
  earliest_investiture_date: "2026-12-06",
  created_at: "2026-11-15T15:00:00.000Z",
  people: [],
};

const sooner: InvestitureRequest = {
  ...base,
  request_id: "req-sooner",
  club_name: "Club Orión",
  section_name: "Aventureros",
  district_name: "Distrito Norte",
  pending_count: 2,
  earliest_investiture_date: "2026-11-30",
  created_at: "2026-11-23T15:00:00.000Z",
};

const resolved: InvestitureRequest = {
  ...base,
  request_id: "req-done",
  club_name: "Club Faro",
  pending_count: 0,
  invested_count: 6,
  rejected_count: 1,
};

const years = [
  { ecclesiastical_year_id: 7, name: "2026", start_date: "2026-01-01", end_date: "2026-12-31", active: true },
];

function renderPage(props: Partial<React.ComponentProps<typeof RequestsListClientPage>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RequestsListClientPage
        requests={[base, sooner, resolved]}
        yearId={7}
        years={years}
        loadError={null}
        nowIso={NOW}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("RequestsListClientPage", () => {
  afterEach(() => {
    cleanup();
    mockSearch.value = "";
    mockPush.mockReset();
  });

  it("states the finding in the header and splits Por autorizar from Resueltas with counts", () => {
    renderPage();

    expect(screen.getByText("2 secciones esperan tu autorización")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Por autorizar/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Por autorizar/ })).toHaveTextContent("2");
    expect(screen.getByRole("tab", { name: /Resueltas/ })).toHaveTextContent("1");
  });

  it("lists pending sections soonest first, with how many people are still undecided and the waiting time", () => {
    renderPage({
      requests: [
        { ...base, people: new Array(5).fill(null).map((_, i) => ({ person_id: `p${i}` })) as never },
        sooner,
        resolved,
      ],
    });
    const table = screen.getAllByRole("table")[0] as HTMLElement;
    const rows = within(table).getAllByRole("row").slice(1);

    expect(rows).toHaveLength(2);
    expect(within(rows[0] as HTMLElement).getByText("Club Orión")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText("5 de 5")).toBeInTheDocument();
    // Cedros was submitted 8 days ago, Orión 21 hours ago.
    expect(within(rows[1] as HTMLElement).getByText("Hace 8 días")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText("Hoy")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByRole("link", { name: "Revisar" })).toHaveAttribute(
      "href",
      "/dashboard/investiture-requests/req-later",
    );
  });

  it("shows the resolved ones under the Resueltas tab with their result", () => {
    mockSearch.value = "tab=resolved";
    renderPage();
    const table = screen.getAllByRole("table")[0] as HTMLElement;

    expect(within(table).getByText("Club Faro")).toBeInTheDocument();
    expect(within(table).getByText("6 investidas · 1 rechazada")).toBeInTheDocument();
    expect(within(table).queryByText("Club Orión")).not.toBeInTheDocument();
  });

  it("filters by search and offers to clear it when nothing matches", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Buscar club"), "zzz");

    expect(screen.getByText("Sin coincidencias")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(screen.getAllByText("Club Orión").length).toBeGreaterThan(0);
  });

  it("uses an empty state when nothing is pending", () => {
    renderPage({ requests: [resolved] });

    expect(screen.getByText("No hay solicitudes por autorizar")).toBeInTheDocument();
  });

  it("explains who authorizes on a 403 instead of an access-denied banner", () => {
    renderPage({ loadError: { status: 403, message: "No tienes permiso" } });

    expect(screen.getByText("Esta bandeja es para quien autoriza")).toBeInTheDocument();
    expect(screen.queryByText(/Acceso denegado/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("keeps the pastor-without-districts copy for a pastor-only viewer", () => {
    renderPage({
      isPastorOnly: true,
      loadError: { status: 403, code: "INVESTITURE_REQUEST_FORBIDDEN", message: "x" },
    });

    expect(screen.getByText(messages.investiture_requests.list.noDistrictsTitle)).toBeInTheDocument();
  });

  it("never passes a failed load off as an empty list", () => {
    renderPage({ requests: [], loadError: { status: 500, message: "Falló el servidor" } });

    expect(screen.getByText("Falló el servidor")).toBeInTheDocument();
    expect(screen.queryByText("No hay solicitudes por autorizar")).not.toBeInTheDocument();
  });

  it("asks for a year when the catalog has none", () => {
    renderPage({ yearId: null, requests: [] });

    expect(screen.getByText(messages.investiture_requests.list.noYearTitle)).toBeInTheDocument();
  });
});
