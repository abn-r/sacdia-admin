/**
 * PermissionsMatrix tests
 *
 * Covers the per-role dirty tracking, the toggle behavior, the save
 * action invocation, the undo path, and the search filter. The sync
 * action is a vitest mock; sonner toasts are stubbed so we can assert
 * the success path without touching the DOM portal.
 */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { Permission, Role } from "@/lib/rbac/types";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

import { PermissionsMatrix } from "@/components/rbac/permissions-matrix";

const PERMISSIONS: Permission[] = [
  {
    permission_id: "p1",
    permission_name: "clubs:read",
    description: "Listar clubes",
    active: true,
    created_at: "2026-01-01T00:00:00Z",
    modified_at: "2026-01-01T00:00:00Z",
  },
  {
    permission_id: "p2",
    permission_name: "clubs:write",
    description: "Modificar clubes",
    active: true,
    created_at: "2026-01-01T00:00:00Z",
    modified_at: "2026-01-01T00:00:00Z",
  },
  {
    permission_id: "p3",
    permission_name: "honors:read",
    description: "Ver especialidades",
    active: true,
    created_at: "2026-01-01T00:00:00Z",
    modified_at: "2026-01-01T00:00:00Z",
  },
];

const ROLES: Role[] = [
  {
    role_id: "r1",
    role_name: "admin",
    role_category: "GLOBAL",
    description: null,
    active: true,
    role_permissions: [
      {
        role_permission_id: "rp1",
        role_id: "r1",
        permission_id: "p1",
        active: true,
        permissions: {
          permission_id: "p1",
          permission_name: "clubs:read",
          description: null,
        },
      },
    ],
  },
  {
    role_id: "r2",
    role_name: "director",
    role_category: "CLUB",
    description: null,
    active: true,
    role_permissions: [],
  },
];

type SyncAction = Parameters<typeof PermissionsMatrix>[0]["syncAction"];

function renderMatrix(syncAction?: SyncAction) {
  const action = syncAction ?? (vi.fn(async () => ({})) as unknown as SyncAction);
  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PermissionsMatrix
        roles={ROLES}
        permissions={PERMISSIONS}
        syncAction={action}
      />
    </NextIntlClientProvider>,
  );
  return { ...utils, action };
}

function getCellCheckbox(roleId: string, permissionId: string): HTMLInputElement {
  const id = `m-${roleId}-${permissionId}`;
  const el = document.getElementById(id);
  if (!el) throw new Error(`Checkbox not found: ${id}`);
  return el as HTMLInputElement;
}

describe("PermissionsMatrix", () => {
  beforeEach(() => {
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  afterEach(() => cleanup());

  it("renders permission rows and role columns", () => {
    renderMatrix();
    expect(screen.getByText("clubs:read")).toBeInTheDocument();
    expect(screen.getByText("clubs:write")).toBeInTheDocument();
    expect(screen.getByText("honors:read")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("director")).toBeInTheDocument();
  });

  it("renders the search input with the translated placeholder", () => {
    const { container } = renderMatrix();
    const input = container.querySelector('input[type="search"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toMatch(/buscar permiso/i);
  });

  it("reflects initial selections from role_permissions", () => {
    renderMatrix();
    expect(getCellCheckbox("r1", "p1")).toHaveAttribute("data-state", "checked");
    expect(getCellCheckbox("r1", "p2")).toHaveAttribute("data-state", "unchecked");
    expect(getCellCheckbox("r2", "p1")).toHaveAttribute("data-state", "unchecked");
  });

  it("does not show save/undo until a cell is toggled", () => {
    renderMatrix();
    expect(screen.queryByRole("button", { name: /guardar/i })).not.toBeInTheDocument();
  });

  it("toggling a cell exposes save and undo per role", async () => {
    renderMatrix();
    const cell = getCellCheckbox("r1", "p2");
    await userEvent.click(cell);

    expect(getCellCheckbox("r1", "p2")).toHaveAttribute("data-state", "checked");
    expect(await screen.findByRole("button", { name: /guardar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /descartar/i })).toBeInTheDocument();
  });

  it("undo reverts the role to its initial selection", async () => {
    renderMatrix();
    await userEvent.click(getCellCheckbox("r1", "p2"));
    expect(getCellCheckbox("r1", "p2")).toHaveAttribute("data-state", "checked");

    await userEvent.click(screen.getByRole("button", { name: /descartar/i }));

    expect(getCellCheckbox("r1", "p2")).toHaveAttribute("data-state", "unchecked");
    expect(screen.queryByRole("button", { name: /guardar/i })).not.toBeInTheDocument();
  });

  it("save dispatches syncAction with the role id and selected ids", async () => {
    const action = vi.fn(async () => ({}));
    renderMatrix(action as unknown as SyncAction);

    await userEvent.click(getCellCheckbox("r1", "p2"));
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });

    const [roleId, , formData] = action.mock.calls[0];
    expect(roleId).toBe("r1");
    expect(formData).toBeInstanceOf(FormData);
    const ids = (formData as FormData).get("permission_ids") as string;
    const idSet = new Set(ids.split(","));
    expect(idSet.has("p1")).toBe(true);
    expect(idSet.has("p2")).toBe(true);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it("surfaces toast.error when syncAction returns an error", async () => {
    const action = vi.fn(async () => ({ error: "boom" }));
    renderMatrix(action as unknown as SyncAction);

    await userEvent.click(getCellCheckbox("r2", "p3"));
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("filters permission rows by search query", async () => {
    renderMatrix();
    const search = screen.getByPlaceholderText(/buscar permiso/i);
    await userEvent.type(search, "honors");

    expect(screen.queryByText("clubs:read")).not.toBeInTheDocument();
    expect(screen.queryByText("clubs:write")).not.toBeInTheDocument();
    expect(screen.getByText("honors:read")).toBeInTheDocument();
  });

  it("shows EmptyState noMatches when search has no result", async () => {
    renderMatrix();
    const search = screen.getByPlaceholderText(/buscar permiso/i);
    await userEvent.type(search, "zzz-nothing");

    expect(await screen.findByText(/sin coincidencias/i)).toBeInTheDocument();
  });
});
