import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type {
  DistrictPastor,
  InvestitureWindow,
  PastorQuota,
} from "@/lib/api/investiture-field-config";

const mockRefresh = vi.hoisted(() => vi.fn());
const mockRemove = vi.hoisted(() => vi.fn());
const mockUpdateWindow = vi.hoisted(() => vi.fn());
const mockUpdateQuota = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
}));
vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("@/lib/api/investiture-field-config", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/investiture-field-config")>()),
  removeDistrictPastor: (...args: unknown[]) => mockRemove(...args),
  updateInvestitureWindow: (...args: unknown[]) => mockUpdateWindow(...args),
  updatePastorQuota: (...args: unknown[]) => mockUpdateQuota(...args),
}));

vi.mock("./assign-pastor-dialog", () => ({
  AssignPastorDialog: ({ open, districtName }: { open: boolean; districtName: string }) =>
    open ? <div role="dialog">assign-dialog:{districtName}</div> : null,
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

import {
  InvestitureSettingsClientPage,
  type DistrictPastorsEntry,
} from "./investiture-settings-client-page";

function pastor(overrides: Partial<DistrictPastor> = {}): DistrictPastor {
  return {
    districlub_type_id: 5,
    user_id: "u1",
    user_name: "Joel Campos",
    email: "joel@example.org",
    can_authorize: true,
    ...overrides,
  };
}

function entry(overrides: Partial<DistrictPastorsEntry> = {}): DistrictPastorsEntry {
  return {
    districtId: 5,
    name: "Distrito Norte",
    list: { districlub_type_id: 5, slots: 2, can_assign: true, pastors: [pastor()] },
    error: null,
    ...overrides,
  };
}

const years = [
  { ecclesiastical_year_id: 7, name: "2026", start_date: "2026-01-01", end_date: "2026-12-31", active: true },
];

const windowEditable: InvestitureWindow = {
  local_field_id: 3,
  ecclesiastical_year_id: 7,
  start_date: "2026-09-01",
  end_date: "2026-12-15",
  configured: true,
  operational: true,
  can_edit: true,
};

const quotaReader: PastorQuota = { slots: 2, configured: true, can_edit: false };
const quotaEditor: PastorQuota = { slots: 2, configured: true, can_edit: true };

function renderPage(props: Partial<React.ComponentProps<typeof InvestitureSettingsClientPage>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <InvestitureSettingsClientPage
        localFieldId={3}
        yearId={7}
        years={years}
        window={windowEditable}
        windowError={null}
        districts={[entry()]}
        districtsError={null}
        quota={quotaReader}
        quotaError={null}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("InvestitureSettingsClientPage", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    mockRemove.mockReset();
    mockUpdateWindow.mockReset();
    mockUpdateQuota.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });
  afterEach(() => cleanup());

  it("puts the window and the pastors in one screen whose breadcrumb says Configuración > Investiduras", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Investiduras" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Configuración" })).toHaveAttribute("href", "/dashboard/configuration");
    expect(screen.getByRole("heading", { name: "Ventana de solicitudes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pastores por distrito" })).toBeInTheDocument();
    expect(screen.queryByText("Autorización de investiduras")).not.toBeInTheDocument();
  });

  it("asks for a field before showing anything when none is chosen", () => {
    renderPage({ localFieldId: null, window: null, districts: [] });

    expect(screen.getByText("Elige un Campo")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pastores por distrito" })).not.toBeInTheDocument();
  });

  describe("window", () => {
    it("saves only when dirty, through the single save bar", async () => {
      const user = userEvent.setup();
      mockUpdateWindow.mockResolvedValue({ ...windowEditable, end_date: "2026-12-20" });
      renderPage();

      const save = screen.getByRole("button", { name: "Guardar" });
      expect(save).toBeDisabled();

      const end = screen.getByLabelText("Fin");
      await user.clear(end);
      await user.type(end, "2026-12-20");
      expect(save).toBeEnabled();
      await user.click(save);

      await waitFor(() =>
        expect(mockUpdateWindow).toHaveBeenCalledWith(3, 7, {
          start_date: "2026-09-01",
          end_date: "2026-12-20",
        }),
      );
      expect(mockToast.success).toHaveBeenCalled();
    });

    it("rejects a start after the end without calling the API", async () => {
      const user = userEvent.setup();
      renderPage();

      const start = screen.getByLabelText("Inicio");
      await user.clear(start);
      await user.type(start, "2026-12-30");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      expect(await screen.findByText("El inicio no puede ser posterior al fin.")).toBeInTheDocument();
      expect(mockUpdateWindow).not.toHaveBeenCalled();
    });

    it("is read-only for roles that can only consult it", () => {
      renderPage({ window: { ...windowEditable, can_edit: false } });

      expect(screen.queryByLabelText("Inicio")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
      expect(screen.getByText(/Solo lectura/)).toBeInTheDocument();
    });

    it("shows a failed load as an error, not as an empty window", () => {
      renderPage({ window: null, windowError: { status: 500, message: "Falló la ventana" } });

      expect(screen.getByText("Falló la ventana")).toBeInTheDocument();
      expect(screen.queryByLabelText("Inicio")).not.toBeInTheDocument();
    });
  });

  describe("pastors", () => {
    it("marks a district nobody authorizes in, and says why", () => {
      renderPage({
        districts: [
          entry({ districtId: 6, name: "Distrito Centro", list: { districlub_type_id: 6, slots: 2, can_assign: true, pastors: [] } }),
        ],
      });

      const block = screen.getByRole("heading", { name: "Distrito Centro" }).parentElement as HTMLElement;
      expect(within(block).getByText("Nadie autoriza")).toBeInTheDocument();
      expect(screen.getByText(/nadie puede autorizar las investiduras de este distrito/)).toBeInTheDocument();
    });

    it("does not mark a district that has an active pastor", () => {
      renderPage();

      expect(screen.queryByText("Nadie autoriza")).not.toBeInTheDocument();
      expect(screen.queryByText("Autoriza")).not.toBeInTheDocument();
    });

    it("explains an inactive account: it takes the slot but cannot authorize", () => {
      renderPage({
        districts: [
          entry({
            list: {
              districlub_type_id: 5,
              slots: 2,
              can_assign: true,
              pastors: [pastor({ can_authorize: false, account_inactive: true })],
            },
          }),
        ],
      });

      expect(screen.getByText("Cuenta inactiva")).toBeInTheDocument();
      expect(screen.getByText("Ocupa cupo, no autoriza ni recibe correos")).toBeInTheDocument();
      // The only pastor cannot authorize, so the district is also marked.
      expect(screen.getByText("Nadie autoriza")).toBeInTheDocument();
    });

    it("opens the assign dialog for the district", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole("button", { name: "Asignar pastor a Distrito Norte" }));

      expect(screen.getByRole("dialog")).toHaveTextContent("assign-dialog:Distrito Norte");
    });

    it("hides assign when the API says the viewer cannot, and when the district is full", () => {
      renderPage({
        districts: [
          entry({ list: { districlub_type_id: 5, slots: 2, can_assign: false, pastors: [pastor()] } }),
          entry({
            districtId: 6,
            name: "Distrito Sur",
            list: {
              districlub_type_id: 6,
              slots: 1,
              can_assign: true,
              pastors: [pastor({ user_id: "u2" })],
            },
          }),
        ],
      });

      expect(screen.queryByRole("button", { name: /Asignar pastor a/ })).not.toBeInTheDocument();
      expect(screen.getByText("Cupo completo.")).toBeInTheDocument();
    });

    it("removes a pastor only after confirming", async () => {
      const user = userEvent.setup();
      mockRemove.mockResolvedValue({});
      renderPage();

      await user.click(screen.getByRole("button", { name: "Quitar a Joel Campos" }));
      const dialog = await screen.findByRole("alertdialog");
      expect(mockRemove).not.toHaveBeenCalled();
      await user.click(within(dialog).getByRole("button", { name: "Quitar" }));

      await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(5, "u1"));
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("keeps the confirmation open with the message when removing fails", async () => {
      const user = userEvent.setup();
      mockRemove.mockRejectedValue(new Error("boom"));
      renderPage();

      await user.click(screen.getByRole("button", { name: "Quitar a Joel Campos" }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: "Quitar" }));

      expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
    });

    it("shows a district whose pastors failed to load as an error inside that district", () => {
      renderPage({
        districts: [entry({ list: null, error: { status: 500, message: "No cargó Distrito Norte" } })],
      });

      expect(screen.getByText("No cargó Distrito Norte")).toBeInTheDocument();
      expect(screen.queryByText("Nadie autoriza")).not.toBeInTheDocument();
    });

    it("lets super-admin change the quota, but not assign or remove", async () => {
      const user = userEvent.setup();
      mockUpdateQuota.mockResolvedValue({ ...quotaEditor, slots: 3 });
      renderPage({ quota: quotaEditor });

      expect(screen.queryByRole("button", { name: /Asignar pastor a/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Quitar a/ })).not.toBeInTheDocument();

      const input = screen.getByLabelText("Cupo de pastores por distrito");
      await user.clear(input);
      await user.type(input, "3");
      await user.click(screen.getByRole("button", { name: "Guardar cupo" }));

      await waitFor(() => expect(mockUpdateQuota).toHaveBeenCalledWith(3));
    });
  });
});
