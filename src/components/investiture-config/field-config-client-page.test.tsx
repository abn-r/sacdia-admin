import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import type { InvestitureWindow } from "@/lib/api/investiture-field-config";

const mockPush = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());
const mockUpdateWindow = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("@/lib/api/investiture-field-config", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/investiture-field-config")>()),
  updateInvestitureWindow: (...args: unknown[]) => mockUpdateWindow(...args),
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

import { FieldConfigClientPage } from "./field-config-client-page";

const years = [
  {
    ecclesiastical_year_id: 7,
    name: "2026",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    active: true,
  },
];

const editableWindow: InvestitureWindow = {
  local_field_id: 3,
  ecclesiastical_year_id: 7,
  start_date: "2026-10-01",
  end_date: "2026-12-20",
  configured: true,
  operational: true,
  can_edit: true,
};

function renderPage(props: Partial<React.ComponentProps<typeof FieldConfigClientPage>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <FieldConfigClientPage
        localFieldId={3}
        yearId={7}
        years={years as never}
        window={editableWindow}
        windowError={null}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("FieldConfigClientPage", () => {
  beforeEach(() => {
    mockUpdateWindow.mockReset().mockResolvedValue({ ...editableWindow });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the window card and the range sentence of the saved window", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Ventana de investidura" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ventana de solicitudes")).toBeInTheDocument();
    expect(screen.queryByText("Porcentaje mínimo de la clase")).not.toBeInTheDocument();
    expect(
      screen.getByText(/^Del .*2026.* al .*2026.*, inclusive, en la zona del Campo\.$/),
    ).toBeInTheDocument();
  });

  it("is read-only without a save button when can_edit is false", () => {
    renderPage({
      window: { ...editableWindow, can_edit: false },
    });

    expect(screen.queryByRole("button", { name: "Guardar ventana" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Inicio")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Solo lectura/).length).toBeGreaterThan(0);
  });

  it("saves the window dates and refreshes", async () => {
    const user = userEvent.setup();
    renderPage();

    const start = screen.getByLabelText("Inicio");
    const end = screen.getByLabelText("Fin");
    await user.clear(start);
    await user.type(start, "2026-10-05");
    await user.clear(end);
    await user.type(end, "2026-11-30");
    await user.click(screen.getByRole("button", { name: "Guardar ventana" }));

    await waitFor(() =>
      expect(mockUpdateWindow).toHaveBeenCalledWith(3, 7, {
        start_date: "2026-10-05",
        end_date: "2026-11-30",
      }),
    );
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Ventana guardada."));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("explains there is no operational window when the dates are null", () => {
    renderPage({
      window: {
        ...editableWindow,
        start_date: null,
        end_date: null,
        configured: false,
        operational: false,
      },
    });

    expect(
      screen.getByText(
        "No hay ventana operativa para este año. Configúrala para permitir presentar y autorizar.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/inclusive, en la zona del Campo/)).not.toBeInTheDocument();
  });

  it("blocks a start date after the end date", async () => {
    const user = userEvent.setup();
    renderPage();

    const start = screen.getByLabelText("Inicio");
    await user.clear(start);
    await user.type(start, "2026-12-25");
    await user.click(screen.getByRole("button", { name: "Guardar ventana" }));

    expect(
      await screen.findByText("El inicio no puede ser posterior al fin."),
    ).toBeInTheDocument();
    expect(mockUpdateWindow).not.toHaveBeenCalled();
  });

  it("maps backend errors to a toast", async () => {
    const user = userEvent.setup();
    mockUpdateWindow.mockRejectedValue(
      new ApiError("Forbidden", 403, { code: "INVESTITURE_WINDOW_EDIT_CLOSED" }),
    );
    renderPage();

    await user.click(screen.getByRole("button", { name: "Guardar ventana" }));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        messages.investiture_requests.errors.window_edit_closed,
      ),
    );
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("shows the load error of the window as a banner", () => {
    renderPage({ window: null, windowError: { status: 403, message: "Sin acceso a la ventana." } });

    expect(screen.getByText("Sin acceso a la ventana.")).toBeInTheDocument();
    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar ventana" })).not.toBeInTheDocument();
  });

  it("asks for a local field when none is selected", () => {
    renderPage({ localFieldId: null, window: null });

    expect(screen.getByText("Selecciona un Campo")).toBeInTheDocument();
  });

  it("changes the year keeping the selected local field", async () => {
    const user = userEvent.setup();
    renderPage({
      years: [
        ...years,
        {
          ecclesiastical_year_id: 6,
          name: "2025",
          start_date: "2025-01-01",
          end_date: "2025-12-31",
          active: false,
        },
      ] as never,
    });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("2025"));

    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/investiture-settings?local_field_id=3&year=6",
    );
  });
});
