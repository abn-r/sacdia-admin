import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import type { RoleRequirement } from "@/lib/api/role-requirements";
import type { AuthUser } from "@/lib/auth/types";
import { buildAuthUser } from "@/lib/auth/testing/auth-user-fixture";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};

const authState = vi.hoisted(() => ({ user: null as AuthUser | null }));
vi.mock("@/lib/auth/auth-context", () => ({ useAuth: () => ({ user: authState.user }) }));

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockList = vi.fn<(...args: any[]) => Promise<RoleRequirement[]>>();
const mockUpdate = vi.fn<(...args: any[]) => Promise<unknown>>();
const mockCertifications = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/role-requirements", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/role-requirements")>();
  return {
    ...original,
    listRoleRequirements: (...args: unknown[]) => mockList(...args),
    updateRoleRequirement: (...args: unknown[]) => mockUpdate(...args),
  };
});
vi.mock("@/lib/api/certifications", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/certifications")>();
  return { ...original, listAdminCertifications: (...args: unknown[]) => mockCertifications(...args) };
});

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

import { RoleRequirementsPanel } from "@/components/role-requirements/role-requirements-panel";

const m = messages.role_requirements;

function row(id: number, role: string, overrides: Partial<RoleRequirement> = {}): RoleRequirement {
  return {
    requirement_id: id,
    role: { role_id: `r-${id}`, name: role },
    club_type: null,
    requirement_type: "COUNSELOR_TRAINING",
    mode: "INFO",
    effective_from: null,
    equivalent_certification: null,
    active: true,
    modified_at: "2026-11-10T00:00:00.000Z",
    ...overrides,
  };
}

const ROWS = [
  row(1, "director"),
  row(2, "deputy-director", { mode: "WARN" }),
  row(3, "secretary"),
  row(4, "treasurer", { mode: "BLOCK", effective_from: "2027-01-01" }),
  row(5, "secretary-treasurer", { equivalent_certification: { certification_id: 7, name: "Consejero maestro" } }),
  row(6, "counselor"),
];

function setAdmin(canManage = true) {
  authState.user = buildAuthUser({
    roles: ["admin"],
    permissions: canManage ? ["role_requirements:manage"] : [],
  });
}

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <RoleRequirementsPanel />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

async function openEdit(user: ReturnType<typeof userEvent.setup>, role: string) {
  await user.click(await screen.findByRole("button", { name: `${m.table.edit}: ${role}` }));
  return screen.findByRole("dialog");
}

async function chooseMode(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, label: string) {
  await user.click(within(dialog).getByLabelText(m.edit.modeLabel));
  await user.click(await screen.findByRole("option", { name: label }));
}

beforeEach(() => {
  mockList.mockReset();
  mockUpdate.mockReset();
  mockCertifications.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  setAdmin();
  mockList.mockResolvedValue(ROWS);
  mockUpdate.mockResolvedValue(row(1, "director"));
  mockCertifications.mockResolvedValue({
    status: "success",
    data: [
      { certification_id: 7, name: "Consejero maestro", active: true, certification_versions: [] },
      { certification_id: 8, name: "Curso inactivo", active: false, certification_versions: [] },
    ],
  });
});

afterEach(() => cleanup());

describe("RoleRequirementsPanel", () => {
  it("renders the six rows with role, club type, mode, date and equivalent certification", async () => {
    renderPanel();
    expect(await screen.findByText("Director")).toBeInTheDocument();
    expect(screen.getByText("Subdirector")).toBeInTheDocument();
    expect(screen.getByText("Consejero")).toBeInTheDocument();
    expect(screen.getAllByText(m.table.allClubTypes)).toHaveLength(6);
    expect(screen.getByText(m.modes.WARN)).toBeInTheDocument();
    expect(screen.getByText(m.modes.BLOCK)).toBeInTheDocument();
    expect(screen.getAllByText(m.modes.INFO)).toHaveLength(4);
    expect(screen.getByText("Consejero maestro")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: new RegExp(`^${m.table.edit}:`) })).toHaveLength(6);
  });

  it("shows a skeleton while loading and an error banner with retry on failure", async () => {
    const user = userEvent.setup();
    mockList.mockRejectedValueOnce(new Error("boom"));
    renderPanel();
    expect(screen.getByTestId("role-requirements-loading")).toBeInTheDocument();
    expect(await screen.findByText(m.error.title)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(await screen.findByText("Director")).toBeInTheDocument();
  });

  it("hides the edit actions without role_requirements:manage", async () => {
    setAdmin(false);
    renderPanel();
    await screen.findByText("Director");
    expect(screen.queryByRole("button", { name: new RegExp(`^${m.table.edit}:`) })).not.toBeInTheDocument();
  });

  it("saves INFO -> WARN directly, sending only the changed field", async () => {
    const user = userEvent.setup();
    renderPanel();
    const dialog = await openEdit(user, "Director");

    await chooseMode(user, dialog, m.modes.WARN);
    await user.click(within(dialog).getByRole("button", { name: m.edit.save }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(1, { mode: "WARN" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(m.toasts.saved));
  });

  it("asks for confirmation before switching to Obligatoria and states the impact with the date", async () => {
    const user = userEvent.setup();
    renderPanel();
    const dialog = await openEdit(user, "Director");

    await chooseMode(user, dialog, m.modes.BLOCK);
    fireEvent.change(within(dialog).getByLabelText(m.edit.effectiveLabel), { target: { value: "2027-03-01" } });
    await user.click(within(dialog).getByRole("button", { name: m.edit.save }));

    const confirm = await screen.findByRole("alertdialog");
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(within(confirm).getByText(m.blockConfirm.title)).toBeInTheDocument();
    expect(confirm).toHaveTextContent("Quienes ya tienen el cargo lo conservan");
    expect(confirm).toHaveTextContent("«Director»");

    await user.click(within(confirm).getByRole("button", { name: m.blockConfirm.confirm }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(1, { mode: "BLOCK", effective_from: "2027-03-01" }));
  });

  it("uses the immediate wording when there is no date, and cancelling the confirmation saves nothing", async () => {
    const user = userEvent.setup();
    renderPanel();
    const dialog = await openEdit(user, "Consejero");

    await chooseMode(user, dialog, m.modes.BLOCK);
    await user.click(within(dialog).getByRole("button", { name: m.edit.save }));

    const confirm = await screen.findByRole("alertdialog");
    expect(confirm).toHaveTextContent("Desde ahora");
    await user.click(within(confirm).getByRole("button", { name: m.blockConfirm.cancel }));

    expect(mockUpdate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("does not re-confirm when only the equivalent certification of an already Obligatoria row changes", async () => {
    const user = userEvent.setup();
    renderPanel();
    const dialog = await openEdit(user, "Tesorero");

    await waitFor(() => expect(within(dialog).getByLabelText(m.edit.equivalentLabel)).not.toBeDisabled());
    await user.click(within(dialog).getByLabelText(m.edit.equivalentLabel));
    await user.click(await screen.findByRole("option", { name: "Consejero maestro" }));
    await user.click(within(dialog).getByRole("button", { name: m.edit.save }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(4, { equivalent_certification_id: 7 }));
  });

  it("lists only active certifications as options", async () => {
    const user = userEvent.setup();
    renderPanel();
    const dialog = await openEdit(user, "Director");
    await waitFor(() => expect(within(dialog).getByLabelText(m.edit.equivalentLabel)).not.toBeDisabled());
    await user.click(within(dialog).getByLabelText(m.edit.equivalentLabel));
    expect(await screen.findByRole("option", { name: "Consejero maestro" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Curso inactivo" })).not.toBeInTheDocument();
  });

  it("omits the equivalent certification when the list cannot be loaded", async () => {
    const user = userEvent.setup();
    mockCertifications.mockRejectedValue(new Error("forbidden"));
    renderPanel();
    const dialog = await openEdit(user, "Secretario-tesorero");

    expect(await within(dialog).findByText(m.edit.equivalentUnavailable)).toBeInTheDocument();
    await chooseMode(user, dialog, m.modes.WARN);
    await user.click(within(dialog).getByRole("button", { name: m.edit.save }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(5, { mode: "WARN" }));
  });

  it("clears the effective date by sending null", async () => {
    const user = userEvent.setup();
    renderPanel();
    const dialog = await openEdit(user, "Tesorero");

    fireEvent.change(within(dialog).getByLabelText(m.edit.effectiveLabel), { target: { value: "" } });
    await user.click(within(dialog).getByRole("button", { name: m.edit.save }));

    // Obligatoria with a moved date still confirms.
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: m.blockConfirm.confirm }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(4, { effective_from: null }));
  });

  it("shows the mapped backend errors inside the dialog", async () => {
    const user = userEvent.setup();
    mockUpdate.mockRejectedValue(new ApiError("bad", 400, { code: "ROLE_REQUIREMENT_DATE_INVALID" }));
    renderPanel();
    const dialog = await openEdit(user, "Director");

    await chooseMode(user, dialog, m.modes.WARN);
    await user.click(within(dialog).getByRole("button", { name: m.edit.save }));

    expect(await within(dialog).findByText(m.errors.dateInvalid)).toBeInTheDocument();
  });

  it("on ROLE_REQUIREMENT_NOT_FOUND closes the dialog and refreshes the list", async () => {
    const user = userEvent.setup();
    mockUpdate.mockRejectedValue(new ApiError("gone", 404, { code: "ROLE_REQUIREMENT_NOT_FOUND" }));
    renderPanel();
    const dialog = await openEdit(user, "Director");

    await chooseMode(user, dialog, m.modes.WARN);
    await user.click(within(dialog).getByRole("button", { name: m.edit.save }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith(m.errors.notFound));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(mockList.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});
