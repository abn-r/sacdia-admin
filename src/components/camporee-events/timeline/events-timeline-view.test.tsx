import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../../messages/es.json";
import { EventsTimelineView } from "./events-timeline-view";
import type { CamporeeEvent, CamporeeEventsData } from "@/lib/camporee-timeline/types";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  search: "",
  cancel: vi.fn(),
  softDelete: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace, refresh: mocks.refresh, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: vi.fn() } }));
vi.mock("@/lib/camporee-events/actions", () => ({
  cancelCamporeeEventAction: mocks.cancel,
  softDeleteCamporeeEventAction: mocks.softDelete,
}));

function event(over: Partial<CamporeeEvent> & Pick<CamporeeEvent, "id" | "title" | "dayNumber" | "startsAt">): CamporeeEvent {
  return {
    camporeeId: "70",
    templateId: null,
    description: "",
    category: "competencia",
    endsAt: "10:00",
    venueId: "1",
    leaderName: "Tomás Vega",
    sections: [],
    capacity: 0,
    registered: 0,
    points: 100,
    status: "publicado",
    fromCatalog: false,
    ...over,
  };
}

const data: CamporeeEventsData = {
  camporeeId: "70",
  camporeeType: "local",
  unionName: "",
  days: [
    { id: "d1", numero: 1, fecha: "2027-02-12", diaSemana: "Viernes", fechaFmt: "12 feb" },
    { id: "d2", numero: 2, fecha: "2027-02-13", diaSemana: "Sábado", fechaFmt: "13 feb" },
  ],
  venues: [{ id: "1", name: "Explanada principal", capacity: 300 }],
  events: [
    event({ id: "2", title: "Nudos y amarres", dayNumber: 1, startsAt: "10:30", status: "programado", leaderName: "—" }),
    event({ id: "1", title: "Marcha y orden cerrado", dayNumber: 1, startsAt: "08:00" }),
    event({ id: "3", title: "Clausura", dayNumber: 2, startsAt: "16:30", status: "cancelado", points: 0 }),
  ],
  templates: [],
  summary: { total: 3, published: 1, cancelled: 1, venuesUsed: 1, hoursOfContent: 3, fromCatalog: 0, new: 3 },
};

function renderView(props: Partial<React.ComponentProps<typeof EventsTimelineView>> = {}, view = data) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EventsTimelineView camporeeId="70" data={view} {...props} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  mocks.search = "";
  vi.clearAllMocks();
});
afterEach(() => cleanup());

describe("EventsTimelineView (Programa)", () => {
  it("groups the events by day in one table, in time order", () => {
    renderView();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").map((row) => row.textContent ?? "");
    const order = ["viernes · 12 feb 2027", "Marcha y orden cerrado", "Nudos y amarres", "sábado · 13 feb 2027", "Clausura"];
    let cursor = -1;
    for (const needle of order) {
      const index = rows.findIndex((text, i) => i > cursor && text.includes(needle));
      expect(index, needle).toBeGreaterThan(cursor);
      cursor = index;
    }
  });

  it("has no dead 'Más filtros', 'Exportar' or 'Importar' buttons", () => {
    renderView();

    expect(screen.queryByRole("button", { name: /más filtros/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /exportar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /importar/i })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Nuevo evento" })).toHaveLength(1);
  });

  it("offers the filters to read-only users and hides create", () => {
    renderView({ readonly: true });

    expect(screen.getByRole("textbox", { name: "Buscar evento" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Categoría" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sede" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nuevo evento" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Acciones de/ })).toBeNull();
  });

  it("marks only the exception: unpublished, cancelled and no leader", () => {
    renderView();

    const table = screen.getByRole("table");
    expect(within(table).getByText("Sin publicar")).toBeInTheDocument();
    expect(within(table).getAllByText("Cancelado").length).toBeGreaterThan(0);
    expect(within(table).getByText("Sin responsable")).toBeInTheDocument();
    // The published event carries no mark at all.
    expect(within(table).queryByText("Publicado")).toBeNull();
  });

  it("shows a no-results state (not an empty table) when the filters match nothing", () => {
    mocks.search = "tab=events&q=zzz";
    renderView({}, { ...data, events: [] });

    expect(screen.getByText("Ningún evento coincide")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeInTheDocument();
  });

  it("navigates to the event page to create and to edit", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: "Nuevo evento" }));
    expect(mocks.push).toHaveBeenCalledWith("/dashboard/campamentos/70/events/new");

    await user.click(within(screen.getByRole("table")).getByRole("button", { name: "Marcha y orden cerrado" }));
    expect(mocks.push).toHaveBeenCalledWith("/dashboard/campamentos/70/events/1/edit");
  });

  it("uses the union routes for a union camporee", async () => {
    const user = userEvent.setup();
    renderView({}, { ...data, camporeeType: "union" });

    await user.click(screen.getByRole("button", { name: "Nuevo evento" }));
    expect(mocks.push).toHaveBeenCalledWith("/dashboard/campamentos/union/70/events/new");
  });

  it("asks before cancelling an event and only then calls the action", async () => {
    const user = userEvent.setup();
    mocks.cancel.mockResolvedValue({});
    renderView();

    const table = screen.getByRole("table");
    await user.click(within(table).getByRole("button", { name: "Acciones de Marcha y orden cerrado" }));
    await user.click(await screen.findByRole("menuitem", { name: "Cancelar evento…" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("¿Cancelar «Marcha y orden cerrado»?")).toBeInTheDocument();
    expect(mocks.cancel).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Cancelar evento" }));
    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledTimes(1));
    const [, formData] = mocks.cancel.mock.calls[0]!;
    expect((formData as FormData).get("id")).toBe("1");
    expect((formData as FormData).get("is_union")).toBe("false");
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Evento «Marcha y orden cerrado» cancelado"));
  });

  it("does not offer to cancel an event that is already cancelled", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(within(screen.getByRole("table")).getByRole("button", { name: "Acciones de Clausura" }));
    expect(await screen.findByRole("menuitem", { name: "Editar" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Cancelar evento…" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Eliminar…" })).toBeInTheDocument();
  });
});
