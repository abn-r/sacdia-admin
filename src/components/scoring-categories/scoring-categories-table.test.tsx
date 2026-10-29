import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import type { AuthUser } from "@/lib/auth/types";

const useAuthMock = vi.fn();
vi.mock("@/lib/auth/auth-context", () => ({ useAuth: () => useAuthMock() }));

const getCapMock = vi.fn();
vi.mock("@/lib/api/system-config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/system-config")>()),
  getScoringCategoryMaxPointsCap: () => getCapMock(),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { ScoringCategoriesTable } from "./scoring-categories-table";

function userWithRoles(roles: string[]): AuthUser {
  return {
    id: "u",
    email: "u@example.com",
    roles,
    authorization: {
      grants: { global_roles: roles.map((role_name) => ({ role_name })) },
      effective: { permissions: ["scoring_categories:read"] },
    },
  };
}

function renderTable(fetchCategories: () => Promise<never[]>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ScoringCategoriesTable
        editableLevel="DIVISION"
        fetchCategories={fetchCategories}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  getCapMock.mockResolvedValue(30);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ScoringCategoriesTable", () => {
  it("does not call admin-only system-config for a field role", async () => {
    useAuthMock.mockReturnValue({ user: userWithRoles(["director-lf"]) });

    renderTable(async () => []);

    await screen.findByText(messages.scoring_categories.table.emptyTitle);
    expect(getCapMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Puntaje máximo permitido/)).toBeNull();
  });

  it("loads and shows the points cap for an admin", async () => {
    useAuthMock.mockReturnValue({ user: userWithRoles(["admin"]) });

    renderTable(async () => []);

    expect(
      await screen.findByText("Puntaje máximo permitido por el sistema: 30 puntos por aspecto."),
    ).toBeInTheDocument();
    expect(getCapMock).toHaveBeenCalledTimes(1);
  });

  it("shows a user-facing message instead of the raw backend text on 403/500", async () => {
    useAuthMock.mockReturnValue({ user: userWithRoles(["admin"]) });
    const raw = "Configuración RBAC incorrecta en el handler";

    renderTable(async () => {
      throw new ApiError(raw, 500, null);
    });

    await waitFor(() =>
      expect(screen.getByText(messages.scoring_categories.table.loadFailed)).toBeInTheDocument(),
    );
    expect(screen.queryByText(raw)).toBeNull();

    cleanup();
    renderTable(async () => {
      throw new ApiError(raw, 403, null);
    });

    await waitFor(() =>
      expect(screen.getByText(messages.scoring_categories.table.forbidden)).toBeInTheDocument(),
    );
    expect(screen.queryByText(raw)).toBeNull();
  });
});
