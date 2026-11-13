import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  candidates: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  deactivate: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api/camporee-staff", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/camporee-staff")>();
  return {
    ...original,
    listCamporeeStaff: (...a: unknown[]) => mocks.list(...a),
    listCamporeeStaffCandidates: (...a: unknown[]) => mocks.candidates(...a),
    addCamporeeStaffMember: (...a: unknown[]) => mocks.add(...a),
    updateCamporeeStaffMember: (...a: unknown[]) => mocks.update(...a),
    deactivateCamporeeStaffMember: (...a: unknown[]) => mocks.deactivate(...a),
  };
});

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

import { CamporeeStaffTab } from "@/components/camporees/camporee-staff-tab";

const t = messages.camporees.staffTab;

const member = {
  camporee_staff_member_id: "s1",
  local_camporee_id: 7,
  union_camporee_id: null,
  user_id: "u1",
  category: "kitchen",
  role_label: "Coordinadora de cocina",
  notes: "Turno tarde",
  status: "active",
  active: true,
  user: {
    user_id: "u1",
    email: "ana@test.com",
    name: "Ana",
    paternal_last_name: "Pérez",
    maternal_last_name: null,
    full_name: "Ana Pérez",
    user_image: null,
  },
};

const candidate = {
  user_id: "u2",
  email: "luis@test.com",
  name: "Luis",
  paternal_last_name: "Gómez",
  maternal_last_name: null,
  full_name: "Luis Gómez",
  user_image: null,
  already_staff_member_id: null,
};

function renderTab(props: Partial<React.ComponentProps<typeof CamporeeStaffTab>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CamporeeStaffTab camporeeId={7} camporeeType="local" canManage {...props} />
    </NextIntlClientProvider>,
  );
}

describe("CamporeeStaffTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([member]);
    mocks.candidates.mockResolvedValue([candidate, { ...candidate, user_id: "u1", full_name: "Ana Pérez", already_staff_member_id: "s1" }]);
    mocks.add.mockResolvedValue({ ...member, camporee_staff_member_id: "s2" });
    mocks.update.mockResolvedValue(member);
    mocks.deactivate.mockResolvedValue(member);
  });
  afterEach(() => cleanup());

  it("lists the roster of the right camporee kind", async () => {
    renderTab({ camporeeType: "union", camporeeId: 3 });
    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledWith("union", 3);
    expect(screen.getByText(/Coordinadora de cocina/)).toBeInTheDocument();
    expect(screen.getByText(t.categories.kitchen)).toBeInTheDocument();
  });

  it("is read-only without manage permission (no add, no row actions, no candidates call)", async () => {
    renderTab({ canManage: false });
    await screen.findByText("Ana Pérez");
    expect(screen.queryByRole("button", { name: t.addButton })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Acciones/ })).not.toBeInTheDocument();
    expect(screen.getByText(t.readOnlyHint)).toBeInTheDocument();
    expect(mocks.candidates).not.toHaveBeenCalled();
  });

  it("adds a candidate (already-rostered users are excluded)", async () => {
    renderTab();
    await screen.findByText("Ana Pérez");
    await userEvent.click(screen.getByRole("button", { name: t.addButton }));
    await waitFor(() => expect(mocks.candidates).toHaveBeenCalledWith("local", 7));

    await userEvent.click(await screen.findByRole("combobox", { name: t.userLabel }));
    const option = await screen.findByText("Luis Gómez");
    expect(screen.queryAllByText("Ana Pérez")).toHaveLength(1); // only the roster row
    await userEvent.click(option);

    await userEvent.type(screen.getByLabelText(t.roleLabel), "Logística");
    await userEvent.click(screen.getByRole("button", { name: t.saveAdd }));

    await waitFor(() =>
      expect(mocks.add).toHaveBeenCalledWith("local", 7, {
        user_id: "u2",
        category: "support",
        role_label: "Logística",
      }),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(t.toasts.added);
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
  });

  it("shows the duplicate error from the backend inside the dialog", async () => {
    mocks.add.mockRejectedValue(
      new ApiError("Conflict", 409, { code: "CAMPOREE_STAFF_DUPLICATE" }),
    );
    renderTab();
    await screen.findByText("Ana Pérez");
    await userEvent.click(screen.getByRole("button", { name: t.addButton }));
    await userEvent.click(await screen.findByRole("combobox", { name: t.userLabel }));
    await userEvent.click(await screen.findByText("Luis Gómez"));
    await userEvent.click(screen.getByRole("button", { name: t.saveAdd }));
    expect(await screen.findByRole("alert")).toHaveTextContent(t.errors.duplicate);
  });

  it("edits category, role and notes", async () => {
    renderTab();
    await screen.findByText("Ana Pérez");
    await userEvent.click(screen.getByRole("button", { name: /Acciones: Ana Pérez/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: t.edit }));
    const role = await screen.findByLabelText(t.roleLabel);
    await userEvent.clear(role);
    await userEvent.type(role, "Jefa de cocina");
    await userEvent.click(screen.getByRole("button", { name: t.saveEdit }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith("s1", {
        category: "kitchen",
        role_label: "Jefa de cocina",
        notes: "Turno tarde",
      }),
    );
  });

  it("asks for confirmation before deactivating", async () => {
    renderTab();
    await screen.findByText("Ana Pérez");
    await userEvent.click(screen.getByRole("button", { name: /Acciones: Ana Pérez/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: t.deactivate }));
    const dialog = await screen.findByRole("alertdialog");
    expect(mocks.deactivate).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: t.deactivateConfirm }));
    await waitFor(() => expect(mocks.deactivate).toHaveBeenCalledWith("s1"));
    expect(mocks.toastSuccess).toHaveBeenCalledWith(t.toasts.deactivated);
  });
});
