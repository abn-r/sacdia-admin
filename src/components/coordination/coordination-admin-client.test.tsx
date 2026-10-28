import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import { listCoordinationZones, listCoordinatorAssignments } from "@/lib/api/coordination";
import { listAdminUsers } from "@/lib/api/admin-users";

const mocks = vi.hoisted(() => ({
  listAdminDistricts: vi.fn(),
  listAdminClubTypes: vi.fn(),
  listDistricts: vi.fn(),
  listClubTypes: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: mocks.toastError, warning: vi.fn() },
}));

// /admin/districts and /admin/club-types only admit catalog editors
// (admin, assistant-admin, super-admin): a local field director gets 403.
vi.mock("@/lib/api/admin-districts", () => ({
  listAdminDistricts: mocks.listAdminDistricts,
}));
vi.mock("@/lib/api/admin-club-types", () => ({
  listAdminClubTypes: mocks.listAdminClubTypes,
}));

vi.mock("@/lib/api/geography", () => ({
  listDistricts: mocks.listDistricts,
}));
vi.mock("@/lib/api/catalogs", () => ({
  listClubTypes: mocks.listClubTypes,
}));

vi.mock("@/lib/api/coordination", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/coordination")>()),
  listCoordinationZones: vi.fn().mockResolvedValue([]),
  listCoordinatorAssignments: vi.fn().mockResolvedValue([]),
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

function renderForLocalFieldDirector() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CoordinationAdminClient
        localFields={[
          {
            local_field_id: 4,
            name: "Asociación Centro de Veracruz",
            union_id: 20,
          } as never,
        ]}
        territoryScope={{ level: "local_field", localFieldId: 4 }}
      />
    </NextIntlClientProvider>,
  );
}

describe("CoordinationAdminClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const forbidden = new ApiError("Forbidden", 403, {
      code: "GUARD_PERMISSION_DENIED",
    });
    mocks.listAdminDistricts.mockRejectedValue(forbidden);
    mocks.listAdminClubTypes.mockRejectedValue(forbidden);
    mocks.listDistricts.mockResolvedValue([
      { district_id: 7, name: "Distrito QA", local_field_id: 4 },
    ]);
    mocks.listClubTypes.mockResolvedValue([
      { club_type_id: 2, name: "Conquistadores" },
    ]);
  });

  afterEach(() => cleanup());

  it("loads for a local field director without admin-only catalog routes", async () => {
    renderForLocalFieldDirector();

    await waitFor(() => expect(mocks.listDistricts).toHaveBeenCalledWith(4));
    expect(mocks.listClubTypes).toHaveBeenCalled();
    expect(mocks.listAdminDistricts).not.toHaveBeenCalled();
    expect(mocks.listAdminClubTypes).not.toHaveBeenCalled();

    expect(
      await screen.findByText(messages.coordinationAdmin.zones.title),
    ).toBeInTheDocument();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("shows a skeleton, never the empty states, until zones/assignments settle", async () => {
    let resolveZones!: (value: never[]) => void;
    let resolveAssignments!: (value: never[]) => void;
    vi.mocked(listCoordinationZones).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveZones = resolve;
      }),
    );
    vi.mocked(listCoordinatorAssignments).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAssignments = resolve;
      }),
    );

    renderForLocalFieldDirector();

    // Synchronously after mount (before the effect settles) and while pending.
    expect(screen.getByTestId("coordination-loading")).toBeInTheDocument();
    expect(screen.queryByText(messages.coordinationAdmin.zones.empty)).toBeNull();
    expect(screen.queryByText(messages.coordinationAdmin.assignments.empty)).toBeNull();

    await waitFor(() => expect(mocks.listDistricts).toHaveBeenCalled());
    expect(screen.getByTestId("coordination-loading")).toBeInTheDocument();
    expect(screen.queryByText(messages.coordinationAdmin.zones.empty)).toBeNull();

    resolveZones([]);
    resolveAssignments([]);

    expect(
      await screen.findByText(messages.coordinationAdmin.zones.empty),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.coordinationAdmin.assignments.empty)).toBeInTheDocument();
    expect(screen.queryByTestId("coordination-loading")).toBeNull();
  });

  it("loads coordinators once per role per mount", async () => {
    renderForLocalFieldDirector();

    expect(
      await screen.findByText(messages.coordinationAdmin.zones.empty),
    ).toBeInTheDocument();
    await waitFor(() => expect(listAdminUsers).toHaveBeenCalled());

    const roles = vi.mocked(listAdminUsers).mock.calls.map(([query]) => query?.role);
    expect(roles.sort()).toEqual(["coordinator", "general-coordinator", "zone-coordinator"]);
  });
});
