import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { EventFormPage } from "@/components/camporee-events/event-form-page";
import type { Camporee } from "@/lib/api/camporees";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type { CamporeeVenue } from "@/lib/api/camporee-venues";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  toastWarning: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, back: vi.fn(), refresh: mocks.refresh }),
}));

vi.mock("sonner", () => ({
  toast: { warning: mocks.toastWarning, error: vi.fn(), success: mocks.toastSuccess },
}));

vi.mock("@/components/camporee-events/venue-create-dialog", () => ({
  VenueCreateDialog: () => null,
}));

vi.mock("@/lib/api/camporee-staff", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/camporee-staff")>()),
  listCamporeeStaff: vi.fn(async () => []),
  listCamporeeEventStaffAssignments: vi.fn(async () => []),
  replaceCamporeeEventStaffAssignments: vi.fn(async () => []),
}));

vi.mock("@/lib/api/admin-honors-catalog", () => ({
  listAdminHonorsCatalog: vi.fn(async () => []),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const camporee: Camporee = {
  camporee_id: 70,
  name: "Camporee local",
  start_date: "2026-07-02",
  end_date: "2026-07-03",
  includes_adventurers: true,
  includes_pathfinders: true,
  includes_master_guides: true,
};

const venues: CamporeeVenue[] = [
  {
    camporee_venue_id: 1,
    scope: "local_field",
    name: "Auditorio",
    capacity: 100,
    active: true,
  },
];

function renderForm(props: React.ComponentProps<typeof EventFormPage>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EventFormPage {...props} />
    </NextIntlClientProvider>,
  );
}

const baseProps = {
  camporeeId: 70,
  camporee,
  venues,
  users: [],
};

describe("EventFormPage", () => {
  afterEach(() => cleanup());

  it("is one page with an index of sections and a sticky save bar, not steps", () => {
    renderForm({
      ...baseProps,
      mode: "create",
      users: [{ value: "user-1", label: "Ana Responsable", email: "ana@example.com" }],
      action: vi.fn(async () => ({})),
    });

    const index = screen.getByRole("navigation", { name: "Secciones" });
    for (const name of ["Datos", "Horario y sede", "Responsable", "Puntos y rúbricas", "Adjuntos"]) {
      expect(within(index).getByRole("link", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Continuar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear evento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByText("Especialidades de preparación")).toBeInTheDocument();
  });

  it("shows the live rubric total against the maximum while typing", async () => {
    const user = userEvent.setup();
    renderForm({ ...baseProps, mode: "create", action: vi.fn(async () => ({})) });

    await user.clear(screen.getByLabelText(/Puntos máximos/));
    await user.type(screen.getByLabelText(/Puntos máximos/), "200");
    await user.click(screen.getByRole("switch", { name: "Habilitar puntaje por rúbricas" }));
    await user.click(screen.getByRole("button", { name: "Agregar criterio" }));
    await user.type(screen.getByLabelText("Puntos del criterio 1"), "80");

    expect(screen.getByRole("status")).toHaveTextContent(/suman 80 de 200 pts\. Faltan 120 pts/);

    await user.clear(screen.getByLabelText("Puntos del criterio 1"));
    await user.type(screen.getByLabelText("Puntos del criterio 1"), "200");
    expect(screen.getByRole("status")).toHaveTextContent("Las rúbricas suman 200 de 200 pts.");
    expect(screen.getByRole("status")).not.toHaveTextContent(/Faltan|Sobran/);
  });

  it("does not submit with scoring on and rubrics that do not add up to the maximum", async () => {
    const action = vi.fn(async () => ({}));
    const user = userEvent.setup();
    renderForm({ ...baseProps, mode: "create", action });

    await user.type(screen.getByLabelText(/Título/), "Competencia de nudos");
    await user.clear(screen.getByLabelText(/Puntos máximos/));
    await user.type(screen.getByLabelText(/Puntos máximos/), "100");
    await user.click(screen.getByRole("switch", { name: "Habilitar puntaje por rúbricas" }));
    await user.click(screen.getByRole("button", { name: "Agregar criterio" }));
    await user.type(screen.getByLabelText("Puntos del criterio 1"), "60");
    await user.click(screen.getByRole("button", { name: "Crear evento" }));

    expect(action).not.toHaveBeenCalled();
  });

  it("asks for the title before saving", async () => {
    const action = vi.fn(async () => ({}));
    const user = userEvent.setup();
    renderForm({ ...baseProps, mode: "create", action });

    await user.click(screen.getByRole("button", { name: "Crear evento" }));

    expect(await screen.findByText("Escribe el título del evento.")).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("closes the form with a warning toast when the event was saved but its rubrics were not", async () => {
    mocks.push.mockClear();
    mocks.refresh.mockClear();
    mocks.toastWarning.mockClear();
    const action = vi.fn(async () => ({ warning: "Los datos enviados no son válidos para esta acción." }));
    const user = userEvent.setup();

    renderForm({ ...baseProps, mode: "create", action });

    await user.type(screen.getByLabelText(/Título/), "Competencia de nudos");
    await user.click(screen.getByRole("button", { name: "Crear evento" }));

    await waitFor(() => expect(mocks.toastWarning).toHaveBeenCalledTimes(1));
    expect(mocks.toastWarning).toHaveBeenCalledWith(
      "El evento se guardó, pero las rúbricas no",
      expect.objectContaining({
        description: expect.stringContaining("Los datos enviados no son válidos"),
      }),
    );
    // The saved event must not stay open for a retry: the form leaves to the program.
    expect(mocks.push).toHaveBeenCalledWith("/dashboard/campamentos/70?tab=events");
    expect(mocks.refresh).toHaveBeenCalled();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("confirms a created event with a success toast and leaves the form", async () => {
    mocks.push.mockClear();
    mocks.refresh.mockClear();
    mocks.toastSuccess.mockClear();
    mocks.toastWarning.mockClear();
    const action = vi.fn(async () => ({ saved: "created" as const }));
    const user = userEvent.setup();

    renderForm({ ...baseProps, mode: "create", action });

    await user.type(screen.getByLabelText(/Título/), "Competencia de nudos");
    await user.click(screen.getByRole("button", { name: "Crear evento" }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Evento creado"));
    expect(mocks.toastWarning).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith("/dashboard/campamentos/70?tab=events");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("confirms an updated event with its own success toast", async () => {
    mocks.toastSuccess.mockClear();
    const action = vi.fn(async () => ({ saved: "updated" as const }));
    const user = userEvent.setup();

    renderForm({
      ...baseProps,
      mode: "edit",
      event: { camporee_event_id: 9, title: "Competencia de nudos" } as unknown as BackendCamporeeEvent,
      action,
    });

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Evento actualizado"));
  });

  it("goes back to the program of a union camporee on cancel", async () => {
    mocks.push.mockClear();
    const user = userEvent.setup();
    renderForm({ ...baseProps, mode: "create", isUnionCamporee: true, action: vi.fn(async () => ({})) });

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mocks.push).toHaveBeenCalledWith("/dashboard/campamentos/union/70?tab=events");
  });

  it("tells the server whether the event already had rubrics", async () => {
    const action = vi.fn(async () => ({}));
    const view = renderForm({ ...baseProps, mode: "create", action });
    const field = () =>
      view.container.querySelector<HTMLInputElement>('input[name="rubrics_initially_configured"]');
    expect(field()?.value).toBe("false");

    view.rerender(
      <NextIntlClientProvider locale="es" messages={messages}>
        <EventFormPage
          {...baseProps}
          mode="create"
          action={action}
          rubrics={[
            {
              camporee_event_rubric_id: 1,
              camporee_event_id: 9,
              title: "Orden",
              description: null,
              max_points: 10,
              display_order: 1,
              active: true,
            },
          ]}
        />
      </NextIntlClientProvider>,
    );
    expect(field()?.value).toBe("true");
  });
});
