import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import {
  listCoordinationZones,
  listCoordinatorAssignments,
  removeDistrictFromCoordinationZone,
  updateCoordinationZone,
  updateCoordinatorAssignment,
} from "@/lib/api/coordination";
import { listAdminUsers } from "@/lib/api/admin-users";

const mocks = vi.hoisted(() => ({
  listDistricts: vi.fn(),
  listClubTypes: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  replace: vi.fn(),
  search: { current: "" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/coordination",
  useSearchParams: () => new URLSearchParams(mocks.search.current),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError, warning: vi.fn() },
}));

vi.mock("@/lib/api/geography", () => ({ listDistricts: mocks.listDistricts }));
vi.mock("@/lib/api/catalogs", () => ({ listClubTypes: mocks.listClubTypes }));

vi.mock("@/lib/api/coordination", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/coordination")>()),
  listCoordinationZones: vi.fn().mockResolvedValue([]),
  listCoordinatorAssignments: vi.fn().mockResolvedValue([]),
  updateCoordinationZone: vi.fn().mockResolvedValue({}),
  updateCoordinatorAssignment: vi.fn().mockResolvedValue({}),
  removeDistrictFromCoordinationZone: vi.fn().mockResolvedValue({}),
  assignDistrictToCoordinationZone: vi.fn().mockResolvedValue({}),
  backfillCoordinatorAssignments: vi.fn().mockResolvedValue({
    dry_run: true,
    local_field_id: 4,
    existing_general: null,
    created: [
      { user_id: "u9", email: null, name: "Tomás", paternal_last_name: "Vega", maternal_last_name: null, role_name: "coordinator" },
    ],
    skipped: [
      { user_id: "u1", email: null, name: "Gabriela", paternal_last_name: "Soto", maternal_last_name: null, role_name: "coordinator", reason: "already_assigned" },
    ],
  }),
}));

vi.mock("@/lib/clubs/fetch-list", () => ({
  fetchClubsList: vi.fn().mockResolvedValue({ items: [], meta: null }),
  getClubListId: (club: { club_id?: number }) => club.club_id ?? null,
}));

vi.mock("@/lib/api/admin-users", () => ({
  listAdminUsers: vi.fn().mockResolvedValue({ items: [], meta: null }),
}));

vi.mock("@/lib/api/clubs", () => ({
  listClubSections: vi.fn().mockResolvedValue([]),
}));

import { CoordinationAdminClient } from "@/components/coordination/coordination-admin-client";

const c = messages.people.community.coordination;

/** Table and mobile list are both in the DOM (CSS hides one): take the first match. */
async function findFirst(text: string) {
  return (await screen.findAllByText(text))[0] as HTMLElement;
}

const NORTH = {
  zone_id: 9,
  local_field_id: 4,
  name: "Zona Norte",
  description: "Norte / Metropolitana",
  active: true,
  districts: [
    { zone_district_id: 1, zone_id: 9, districlub_type_id: 7, active: true, districts: { name: "Centro" } },
    { zone_district_id: 2, zone_id: 9, districlub_type_id: 8, active: true, districts: { name: "Norte" } },
  ],
};

const GABRIELA = {
  assignment_id: "a1",
  user_id: "u1",
  local_field_id: 4,
  assignment_type: "ZONE" as const,
  zone_id: 9,
  club_type_id: 2,
  club_section_id: null,
  active: true,
  start_date: "2026-01-01",
  end_date: null,
  users: { user_id: "u1", email: null, name: "Gabriela", paternal_last_name: "Soto", maternal_last_name: null },
  club_types: { club_type_id: 2, name: "Conquistadores", active: true },
  coordination_zones: { zone_id: 9, name: "Zona Norte", active: true },
};

function renderClient(options: { canManage?: boolean; fields?: Array<{ local_field_id: number; name: string }>; level?: "local_field" | "union" } = {}) {
  const { canManage = true, level = "local_field" } = options;
  const fields = options.fields ?? [{ local_field_id: 4, name: "Asociación Valle Alto" }];
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CoordinationAdminClient
        localFields={fields.map((f) => ({ ...f, union_id: 20 }) as never)}
        territoryScope={
          level === "local_field"
            ? { level: "local_field", localFieldId: 4 }
            : ({ level: "union", unionId: 20 } as never)
        }
        canManage={canManage}
      />
    </NextIntlClientProvider>,
  );
}

describe("CoordinationAdminClient", () => {
  beforeAll(() => {
    // Radix Select measures its trigger.
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search.current = "";
    mocks.listDistricts.mockResolvedValue([
      { district_id: 7, name: "Centro", local_field_id: 4 },
      { district_id: 8, name: "Norte", local_field_id: 4 },
      { district_id: 10, name: "Sur", local_field_id: 4 },
    ]);
    mocks.listClubTypes.mockResolvedValue([{ club_type_id: 2, name: "Conquistadores" }]);
    vi.mocked(listCoordinationZones).mockResolvedValue([NORTH] as never);
    vi.mocked(listCoordinatorAssignments).mockResolvedValue([GABRIELA] as never);
  });

  afterEach(() => cleanup());

  it("shows a skeleton, never the empty states, until zones settle", async () => {
    let resolveZones!: (value: never[]) => void;
    vi.mocked(listCoordinationZones).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveZones = resolve;
      }),
    );

    renderClient();

    expect(screen.getByTestId("coordination-loading")).toBeInTheDocument();
    expect(screen.queryByText(c.zones.emptyTitle)).toBeNull();

    resolveZones([]);
    expect(await screen.findByText(c.zones.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByTestId("coordination-loading")).toBeNull();
  });

  it("names the local field and never falls back to a numbered one", async () => {
    renderClient();
    expect(await findFirst("Zona Norte")).toBeInTheDocument();
    expect(screen.getByTestId("coordination-field")).toHaveTextContent("Asociación Valle Alto");
    expect(screen.queryByText(/Campo local #/)).toBeNull();
  });

  it("lists zones in a table with their districts and coordinator count", async () => {
    renderClient();
    const row = (await findFirst("Zona Norte")).closest("tr") as HTMLElement;
    expect(within(row).getByText("Centro")).toBeInTheDocument();
    expect(within(row).getByText("Norte")).toBeInTheDocument();
    expect(within(row).getByText("1")).toBeInTheDocument();
  });

  it("keeps the forms closed until a button opens them", async () => {
    renderClient();
    await findFirst("Zona Norte");
    expect(screen.queryByLabelText(messages.coordinationAdmin.fields.name)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: c.actions.newZone }));
    expect(await screen.findByLabelText(messages.coordinationAdmin.fields.name)).toBeInTheDocument();
  });

  it("asks before deactivating a zone and says what happens", async () => {
    renderClient();
    await findFirst("Zona Norte");

    await userEvent.click(screen.getAllByRole("button", { name: "Acciones de Zona Norte" })[0]);
    await userEvent.click(await screen.findByRole("menuitem", { name: c.actions.deactivateZone }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("¿Desactivar Zona Norte?")).toBeInTheDocument();
    expect(within(dialog).getByText(/La asignación activa que la usa deja de dar acceso/)).toBeInTheDocument();
    expect(updateCoordinationZone).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: c.actions.deactivateConfirm }));
    await waitFor(() => expect(updateCoordinationZone).toHaveBeenCalledWith(9, { active: false }));
  });

  it("confirms removing a district and names who is affected", async () => {
    renderClient();
    await userEvent.click((await screen.findAllByRole("button", { name: "Zona Norte" }))[0]);

    const remove = await screen.findByRole("button", { name: "Quitar Centro de Zona Norte" });
    await userEvent.click(remove);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("¿Quitar el distrito Centro de Zona Norte?")).toBeInTheDocument();
    expect(within(dialog).getByText(/Gabriela Soto/)).toBeInTheDocument();
    expect(removeDistrictFromCoordinationZone).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: c.removeDistrict.confirm }));
    await waitFor(() => expect(removeDistrictFromCoordinationZone).toHaveBeenCalledWith(9, 7));
  });

  it("lets the picker choose among local fields for a territory role", async () => {
    renderClient({
      level: "union",
      fields: [
        { local_field_id: 4, name: "Asociación Valle Alto" },
        { local_field_id: 5, name: "Asociación Costa" },
      ],
    });
    await findFirst("Zona Norte");
    expect(screen.queryByTestId("coordination-field")).toBeNull();
    expect(screen.getByRole("button", { name: messages.shared.kit.scope.change })).toHaveTextContent(
      "Asociación Valle Alto",
    );
  });

  describe("assignments tab", () => {
    beforeEach(() => {
      mocks.search.current = "tab=assignments";
    });

    it("does not look up coordinators until the dialog opens, then once per role", async () => {
      renderClient();
      expect(await findFirst("Gabriela Soto")).toBeInTheDocument();
      expect(listAdminUsers).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: c.actions.newAssignment }));
      await waitFor(() => expect(listAdminUsers).toHaveBeenCalledTimes(3));
      const roles = vi.mocked(listAdminUsers).mock.calls.map(([query]) => query?.role);
      expect(roles.sort()).toEqual(["coordinator", "general-coordinator", "zone-coordinator"]);
    });

    it("asks before deactivating an assignment", async () => {
      renderClient();
      await findFirst("Gabriela Soto");
      await userEvent.click(screen.getAllByRole("button", { name: "Acciones de Gabriela Soto" })[0]);
      await userEvent.click(await screen.findByRole("menuitem", { name: c.actions.deactivateAssignment }));

      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).getByText("¿Desactivar la asignación de Gabriela Soto?")).toBeInTheDocument();
      expect(updateCoordinatorAssignment).not.toHaveBeenCalled();

      await userEvent.click(within(dialog).getByRole("button", { name: c.actions.deactivateConfirm }));
      await waitFor(() =>
        expect(updateCoordinatorAssignment).toHaveBeenCalledWith("a1", { active: false }),
      );
    });

    it("explains what the migration creates and whom it skips before running it", async () => {
      renderClient();
      await findFirst("Gabriela Soto");
      await userEvent.click(screen.getByRole("button", { name: c.actions.migrate }));

      expect(await screen.findByText("Se creará 1 asignación general")).toBeInTheDocument();
      expect(screen.getByText(/Tomás Vega/)).toBeInTheDocument();
      expect(screen.getByText("No se migran (1)")).toBeInTheDocument();
      expect(screen.getByText(messages.coordinationAdmin.backfill.reasons.alreadyAssigned)).toBeInTheDocument();
    });
  });

  it("hides every write control but keeps the lists when canManage is false", async () => {
    renderClient({ canManage: false });
    expect(await findFirst("Zona Norte")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: c.actions.newZone })).toBeNull();
    expect(screen.queryByRole("button", { name: c.actions.newAssignment })).toBeNull();
    expect(screen.queryByRole("button", { name: c.actions.migrate })).toBeNull();

    await userEvent.click(screen.getAllByRole("button", { name: "Zona Norte" })[0]);
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("Centro")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Quitar/ })).toBeNull();
    expect(screen.queryByText(c.actions.deactivateZone)).toBeNull();
  });

  it("shows an error, not an empty list, when the first load fails", async () => {
    vi.mocked(listCoordinationZones).mockRejectedValue(new ApiError("boom", 500, {}));
    renderClient();

    expect(await screen.findByRole("alert")).toHaveTextContent(c.loadError.title);
    expect(screen.queryByText(c.zones.emptyTitle)).toBeNull();
    expect(screen.queryByRole("button", { name: c.actions.newZone })).toBeNull();
  });

  it("keeps the data and warns when a reload fails", async () => {
    renderClient();
    await findFirst("Zona Norte");

    vi.mocked(listCoordinationZones).mockRejectedValue(new ApiError("boom", 500, {}));
    await userEvent.click(screen.getAllByRole("button", { name: "Acciones de Zona Norte" })[0]);
    await userEvent.click(await screen.findByRole("menuitem", { name: c.actions.deactivateZone }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: c.actions.deactivateConfirm }));

    await waitFor(() =>
      expect(document.querySelector('[data-slot="stale-data-notice"]')).not.toBeNull(),
    );
    expect(screen.getAllByText("Zona Norte").length).toBeGreaterThan(0);
  });
});
