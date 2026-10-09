import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import type { DistrictPastor, PastorQuota } from "@/lib/api/investiture-field-config";

const mockRefresh = vi.hoisted(() => vi.fn());
const mockRemove = vi.hoisted(() => vi.fn());
const mockUpdateQuota = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
}));
vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("@/lib/api/investiture-field-config", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/investiture-field-config")>()),
  removeDistrictPastor: (...args: unknown[]) => mockRemove(...args),
  updatePastorQuota: (...args: unknown[]) => mockUpdateQuota(...args),
}));

vi.mock("./assign-pastor-dialog", () => ({
  AssignPastorDialog: ({ open, districtName }: { open: boolean; districtName: string }) =>
    open ? <div role="dialog">assign-dialog:{districtName}</div> : null,
}));

import { PastorsClientPage, type DistrictPastorsEntry } from "./pastors-client-page";

function pastor(overrides: Partial<DistrictPastor> = {}): DistrictPastor {
  return {
    districlub_type_id: 5,
    user_id: "u1",
    user_name: "Ana Pérez",
    email: "ana@example.org",
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

const quotaReader: PastorQuota = { slots: 2, configured: false, can_edit: false };
const quotaEditor: PastorQuota = { slots: 2, configured: true, can_edit: true };

function renderPage(props: Partial<React.ComponentProps<typeof PastorsClientPage>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PastorsClientPage
        localFieldId={3}
        districts={[entry()]}
        quota={quotaReader}
        quotaError={null}
        loadError={null}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("PastorsClientPage", () => {
  beforeEach(() => {
    mockRemove.mockReset().mockResolvedValue(pastor({ can_authorize: false }));
    mockUpdateQuota.mockReset().mockResolvedValue({ ...quotaEditor, slots: 3 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the occupancy and each pastor of a district", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Pastores por distrito" })).toBeInTheDocument();
    const card = screen.getByRole("region", { name: "Distrito Norte" });
    expect(within(card).getByText("1/2 pastores")).toBeInTheDocument();
    expect(within(card).getByText("Ana Pérez")).toBeInTheDocument();
    expect(within(card).getByText("ana@example.org")).toBeInTheDocument();
    expect(within(card).queryByText("Sin rol de pastor")).not.toBeInTheDocument();
    expect(within(card).queryByText("Cuenta inactiva")).not.toBeInTheDocument();
  });

  it("flags pastors without the pastor role or with an inactive account", () => {
    renderPage({
      districts: [
        entry({
          list: {
            districlub_type_id: 5,
            slots: 3,
            can_assign: true,
            pastors: [
              pastor({ user_id: "u1", user_name: "Sin Rol", can_authorize: false, role_missing: true }),
              pastor({ user_id: "u2", user_name: "Baja Cuenta", can_authorize: false, account_inactive: true }),
            ],
          },
        }),
      ],
    });

    expect(screen.getByText("Sin rol de pastor")).toBeInTheDocument();
    expect(screen.getByText("Cuenta inactiva")).toBeInTheDocument();
    expect(screen.getAllByText("Ocupa cupo, no autoriza ni recibe correos")).toHaveLength(2);
  });

  it("offers to assign only while there is a free slot", () => {
    renderPage({
      districts: [
        entry({ districtId: 5, name: "Distrito Norte" }),
        entry({
          districtId: 6,
          name: "Distrito Sur",
          list: {
            districlub_type_id: 6,
            slots: 1,
            can_assign: false,
            pastors: [pastor({ districlub_type_id: 6, user_id: "u9", user_name: "Luis Gil" })],
          },
        }),
      ],
    });

    const north = screen.getByRole("region", { name: "Distrito Norte" });
    const south = screen.getByRole("region", { name: "Distrito Sur" });
    expect(within(north).getByRole("button", { name: "Asignar pastor" })).toBeInTheDocument();
    expect(within(south).queryByRole("button", { name: "Asignar pastor" })).not.toBeInTheDocument();
    expect(within(south).getByText("Cupo completo.")).toBeInTheDocument();
  });

  it("opens the assignment dialog for the chosen district", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Asignar pastor" }));

    expect(screen.getByText("assign-dialog:Distrito Norte")).toBeInTheDocument();
  });

  it("asks for confirmation before removing a pastor", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Quitar a Ana Pérez" }));

    expect(mockRemove).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("¿Quitar pastor del distrito?")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Quitar" }));

    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(5, "u1"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Pastor quitado."));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("does not remove anything when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Quitar a Ana Pérez" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("maps a removal failure to a toast", async () => {
    const user = userEvent.setup();
    mockRemove.mockRejectedValue(
      new ApiError("Not found", 404, { code: "INVESTITURE_PASTOR_NOT_ASSIGNED" }),
    );
    renderPage();

    await user.click(screen.getByRole("button", { name: "Quitar a Ana Pérez" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Quitar" }));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        messages.investiture_requests.errors.pastor_not_assigned,
      ),
    );
  });

  it("keeps the quota read-only for roles that cannot edit it", () => {
    renderPage();

    expect(screen.getByText("Cupo de pastores por distrito")).toBeInTheDocument();
    expect(screen.getByText("2 pastores por distrito")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar cupo" })).not.toBeInTheDocument();
  });

  it("lets super-admin edit the quota, without assign or remove actions", async () => {
    const user = userEvent.setup();
    renderPage({
      quota: quotaEditor,
      districts: [
        entry({
          list: { districlub_type_id: 5, slots: 2, can_assign: false, pastors: [pastor()] },
        }),
      ],
    });

    expect(screen.queryByRole("button", { name: "Asignar pastor" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar a Ana Pérez" })).not.toBeInTheDocument();

    const input = screen.getByLabelText("Cupo");
    await user.clear(input);
    await user.type(input, "3");
    await user.click(screen.getByRole("button", { name: "Guardar cupo" }));

    await waitFor(() => expect(mockUpdateQuota).toHaveBeenCalledWith(3));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Cupo guardado."));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("rejects a negative or fractional quota without calling the API", async () => {
    const user = userEvent.setup();
    renderPage({ quota: quotaEditor });

    const input = screen.getByLabelText("Cupo");
    await user.clear(input);
    await user.type(input, "1.5");
    await user.click(screen.getByRole("button", { name: "Guardar cupo" }));

    expect(
      await screen.findByText("Ingresá un número entero mayor o igual a 0."),
    ).toBeInTheDocument();
    expect(mockUpdateQuota).not.toHaveBeenCalled();
  });

  it("shows the backend message when the quota drops below current assignments", async () => {
    const user = userEvent.setup();
    mockUpdateQuota.mockRejectedValue(
      new ApiError("Conflict", 409, { code: "INVESTITURE_PASTOR_QUOTA_BELOW_ASSIGNMENTS" }),
    );
    renderPage({ quota: quotaEditor });

    const input = screen.getByLabelText("Cupo");
    await user.clear(input);
    await user.type(input, "0");
    await user.click(screen.getByRole("button", { name: "Guardar cupo" }));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        messages.investiture_requests.errors.pastor_quota_below_assignments,
      ),
    );
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("shows a banner for a district that failed to load and keeps the others", () => {
    renderPage({
      districts: [
        entry({ districtId: 6, name: "Distrito Roto", list: null, error: { status: 500, message: "Falló la carga" } }),
        entry(),
      ],
    });

    const broken = screen.getByRole("region", { name: "Distrito Roto" });
    expect(within(broken).getByText("Falló la carga")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Distrito Norte" })).toBeInTheDocument();
  });

  it("shows the empty state for a Field without districts", () => {
    renderPage({ districts: [] });

    expect(screen.getByText("Este Campo no tiene distritos")).toBeInTheDocument();
  });

  it("asks for a Field when none is selected", () => {
    renderPage({ localFieldId: null, districts: [] });

    expect(screen.getByText("Seleccioná un Campo")).toBeInTheDocument();
    expect(screen.queryByText("Este Campo no tiene distritos")).not.toBeInTheDocument();
  });

  it("shows the list load error instead of the districts", () => {
    renderPage({
      districts: [],
      loadError: { status: 403, message: "Sin acceso a los distritos." },
    });

    expect(screen.getByText("Sin acceso a los distritos.")).toBeInTheDocument();
    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
    expect(screen.queryByText("Este Campo no tiene distritos")).not.toBeInTheDocument();
  });
});
