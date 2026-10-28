import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import enMessages from "../../../messages/en.json";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Role } from "@/lib/rbac/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/rbac/actions", () => ({ deactivateRoleAction: vi.fn() }));

import { RolesTable } from "./roles-table";

function role(overrides: Partial<Role> = {}, permissionCount = 1): Role {
  return {
    role_id: "r1",
    role_name: "tesorero-club",
    role_category: "CLUB",
    description: "Encargado de la tesorería",
    active: true,
    role_permissions: Array.from({ length: permissionCount }, (_, i) => ({
      role_permission_id: `rp${i}`,
      role_id: "r1",
      permission_id: `p${i}`,
      active: true,
      permissions: { permission_id: `p${i}`, permission_name: `users:read${i}`, description: null },
    })),
    ...overrides,
  };
}

function renderTable(roles: Role[]) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <TooltipProvider>
        <RolesTable roles={roles} isSuperAdmin />
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
}

describe("RolesTable", () => {
  afterEach(cleanup);

  it("uses the singular for a role with one permission", () => {
    renderTable([role({}, 1)]);

    expect(screen.getByRole("button", { name: "Ver el permiso de tesorero-club" })).toBeInTheDocument();
    expect(screen.getByText("1 permiso")).toBeInTheDocument();
  });

  it("uses the plural for several permissions", () => {
    renderTable([role({}, 3)]);

    expect(
      screen.getByRole("button", { name: "Ver los 3 permisos de tesorero-club" }),
    ).toBeInTheDocument();
  });

  it("offers deactivation only through the row menu", () => {
    renderTable([role()]);

    expect(screen.queryByRole("button", { name: /^Desactivar tesorero-club$/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: /Acciones de/ }).length).toBeGreaterThan(0);
  });

  it("renders the column headers, tabs and status from the Spanish messages", () => {
    renderTable([role({}, 1)]);

    for (const name of ["Nombre", "Categoría", "Descripción", "Permisos", "Estado"]) {
      expect(screen.getByRole("columnheader", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.getByRole("tab", { name: "Activos" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar roles...")).toBeInTheDocument();
    expect(screen.getAllByText("Activo").length).toBeGreaterThan(0);
  });

  it("renders the column headers, tabs and footer in the active locale", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <TooltipProvider>
          <RolesTable roles={[role({}, 1)]} isSuperAdmin={false} />
        </TooltipProvider>
      </NextIntlClientProvider>,
    );

    for (const name of ["Name", "Category", "Description", "Permissions", "Status"]) {
      expect(screen.getByRole("columnheader", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.queryByRole("columnheader", { name: /Nombre/ })).toBeNull();
    expect(screen.getByRole("tab", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByText("Read-only view.")).toBeInTheDocument();
    expect(screen.getByText(/of/, { selector: "p" })).toHaveTextContent("Showing 1 of 1 roles");
  });
});
