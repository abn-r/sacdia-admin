import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Permission, Role } from "@/lib/rbac/types";

const mockToast = vi.hoisted(() => ({ message: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));

import { PermissionsMatrix } from "./permissions-matrix";

const permissions: Permission[] = [
  { permission_id: "p-read", permission_name: "users:read", description: null, active: true },
  { permission_id: "p-create", permission_name: "users:create", description: null, active: true },
] as Permission[];

const roles: Role[] = [
  {
    role_id: "r1",
    role_name: "tesorero-club",
    role_category: "CLUB",
    description: null,
    active: true,
    role_permissions: [],
  },
];

function renderMatrix(setAction = vi.fn().mockResolvedValue({ ok: true })) {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <TooltipProvider>
        <PermissionsMatrix
          roles={roles}
          permissions={permissions}
          toggleAction={vi.fn().mockResolvedValue({ ok: true })}
          setAction={setAction}
          canWrite
        />
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
  return setAction;
}

describe("PermissionsMatrix", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("gives every permission cell an accessible name with permission and role", () => {
    renderMatrix();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.map((c) => c.getAttribute("aria-label"))).toEqual([
      "Pantalla completa · Usuarios · Tesorero Club",
      "Ver listado · Tesorero Club",
      "Crear usuario · Tesorero Club",
    ]);
    for (const checkbox of checkboxes) {
      expect(checkbox).toHaveAccessibleName(/ · Tesorero Club$/);
    }
  });

  it("lists the permissions a cascade adds in the toast", async () => {
    const setAction = renderMatrix();

    fireEvent.click(screen.getByRole("checkbox", { name: "Crear usuario · Tesorero Club" }));

    await waitFor(() => expect(setAction).toHaveBeenCalled());
    await waitFor(() => expect(mockToast.message).toHaveBeenCalled());
    const [, options] = mockToast.message.mock.calls[0] as [string, { description: string }];
    expect(options.description).toBe(
      "Usuarios · Tesorero Club. Se agregaron: Crear usuario, Ver listado.",
    );
    expect(setAction.mock.calls[0][1].sort()).toEqual(["p-create", "p-read"]);
  });
});
