import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

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

vi.mock("@/components/camporee-events/rubrics-editor", () => ({
  RubricsEditor: () => <div data-testid="rubrics-editor" />,
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

describe("EventFormPage", () => {
  afterEach(() => cleanup());

  it("renders optional venue and leader selects without empty SelectItem values", () => {
    const action = vi.fn(async () => ({}));

    expect(() =>
      render(
        <EventFormPage
          mode="create"
          camporeeId={70}
          camporee={camporee}
          venues={venues}
          users={[{ value: "user-1", label: "Ana Responsable", email: "ana@example.com" }]}
          action={action}
        />,
      ),
    ).not.toThrow();

    expect(screen.getByText("Sede")).toBeInTheDocument();
    expect(screen.getByText("Responsable")).toBeInTheDocument();
    expect(screen.getByText("Especialidades de preparación")).toBeInTheDocument();
  });

  it("closes the form with a warning toast when the event was saved but its rubrics were not", async () => {
    mocks.push.mockClear();
    mocks.refresh.mockClear();
    mocks.toastWarning.mockClear();
    const action = vi.fn(async () => ({ warning: "Los datos enviados no son válidos para esta acción." }));
    const user = userEvent.setup();

    render(
      <EventFormPage
        mode="create"
        camporeeId={70}
        camporee={camporee}
        venues={venues}
        users={[]}
        action={action}
      />,
    );

    await user.type(screen.getByLabelText(/Título/), "Competencia de nudos");
    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole("button", { name: "continue" }));
    }
    await user.click(screen.getByRole("button", { name: "Crear evento" }));

    await waitFor(() => expect(mocks.toastWarning).toHaveBeenCalledTimes(1));
    expect(mocks.toastWarning).toHaveBeenCalledWith(
      "rubricsWarningTitle",
      expect.objectContaining({ description: "rubricsWarningDescription" }),
    );
    // The saved event must not stay open for a retry: the form leaves to the agenda.
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

    render(
      <EventFormPage
        mode="create"
        camporeeId={70}
        camporee={camporee}
        venues={venues}
        users={[]}
        action={action}
      />,
    );

    await user.type(screen.getByLabelText(/Título/), "Competencia de nudos");
    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole("button", { name: "continue" }));
    }
    await user.click(screen.getByRole("button", { name: "Crear evento" }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("createdToast"));
    expect(mocks.toastWarning).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith("/dashboard/campamentos/70?tab=events");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("confirms an updated event with its own success toast", async () => {
    mocks.toastSuccess.mockClear();
    const action = vi.fn(async () => ({ saved: "updated" as const }));
    const user = userEvent.setup();

    render(
      <EventFormPage
        mode="edit"
        camporeeId={70}
        camporee={camporee}
        venues={venues}
        users={[]}
        event={{ camporee_event_id: 9, title: "Competencia de nudos" } as unknown as BackendCamporeeEvent}
        action={action}
      />,
    );

    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole("button", { name: "continue" }));
    }
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("updatedToast"));
  });

  it("tells the server whether the event already had rubrics", async () => {
    const action = vi.fn(async () => ({}));
    const { container, rerender } = render(
      <EventFormPage
        mode="create"
        camporeeId={70}
        camporee={camporee}
        venues={venues}
        users={[]}
        action={action}
      />,
    );
    const field = () =>
      container.querySelector<HTMLInputElement>('input[name="rubrics_initially_configured"]');
    expect(field()?.value).toBe("false");

    rerender(
      <EventFormPage
        mode="create"
        camporeeId={70}
        camporee={camporee}
        venues={venues}
        users={[]}
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
      />,
    );
    expect(field()?.value).toBe("true");
  });
});
