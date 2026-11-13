import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
  listStaff: vi.fn(),
  listAssignments: vi.fn(),
  replace: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api/camporee-staff", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/camporee-staff")>();
  return {
    ...original,
    listCamporeeStaff: (...a: unknown[]) => mocks.listStaff(...a),
    listCamporeeEventStaffAssignments: (...a: unknown[]) => mocks.listAssignments(...a),
    replaceCamporeeEventStaffAssignments: (...a: unknown[]) => mocks.replace(...a),
  };
});

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

import { EventStaffAssignmentsSection } from "@/components/camporee-events/event-staff-assignments-section";

const t = messages.camporees.eventInstanceForm.staffAssignments;

function staff(id: string, name: string) {
  return {
    camporee_staff_member_id: id,
    local_camporee_id: 7,
    union_camporee_id: null,
    user_id: `user-${id}`,
    category: "support",
    role_label: null,
    notes: null,
    status: "active",
    active: true,
    user: {
      user_id: `user-${id}`,
      email: null,
      name,
      paternal_last_name: null,
      maternal_last_name: null,
      full_name: name,
      user_image: null,
    },
  };
}

function assignment(memberId: string, role: string) {
  return {
    camporee_event_staff_assignment_id: `a-${memberId}`,
    camporee_event_id: 9,
    camporee_staff_member_id: memberId,
    assignment_role: role,
    title_override: null,
    notes: null,
    display_order: 0,
    active: true,
  };
}

function renderSection(type: "local" | "union" = "local") {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EventStaffAssignmentsSection eventId={9} camporeeId={7} camporeeType={type} />
    </NextIntlClientProvider>,
  );
}

describe("EventStaffAssignmentsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listStaff.mockResolvedValue([staff("s1", "Ana Pérez"), staff("s2", "Luis Gómez")]);
    mocks.listAssignments.mockResolvedValue([]);
    mocks.replace.mockImplementation(async (_id: number, rows: { camporee_staff_member_id: string; assignment_role: string }[]) =>
      rows.map((r) => assignment(r.camporee_staff_member_id, r.assignment_role)),
    );
  });
  afterEach(() => cleanup());

  it("warns that publishing is blocked when there is no responsible", async () => {
    renderSection();
    expect(await screen.findByText(t.noResponsible)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t.save })).toBeDisabled();
  });

  it("points to the roster tab when the roster is empty", async () => {
    mocks.listStaff.mockResolvedValue([]);
    renderSection("union");
    const link = await screen.findByRole("link", { name: t.rosterLink });
    expect(link).toHaveAttribute("href", "/dashboard/campamentos/union/7?tab=staff");
  });

  it("adds a responsible and saves the whole list with PUT", async () => {
    renderSection();
    await screen.findByText(t.noResponsible);
    await userEvent.click(screen.getByRole("combobox", { name: t.memberLabel }));
    await userEvent.click(await screen.findByRole("option", { name: /Ana Pérez/ }));
    await userEvent.click(screen.getByRole("button", { name: t.add }));

    expect(screen.getByText(t.unsaved)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: t.save }));

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(9, [
        { camporee_staff_member_id: "s1", assignment_role: "responsible", display_order: 0 },
      ]),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(t.saved);
    expect(await screen.findByText(t.hasResponsible)).toBeInTheDocument();
  });

  it("removes an assignment and saves", async () => {
    mocks.listAssignments.mockResolvedValue([assignment("s1", "responsible"), assignment("s2", "assistant")]);
    renderSection();
    await screen.findByText(t.hasResponsible);
    await userEvent.click(screen.getByRole("button", { name: "Quitar a Luis Gómez de las asignaciones" }));
    await userEvent.click(screen.getByRole("button", { name: t.save }));
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(9, [
        { camporee_staff_member_id: "s1", assignment_role: "responsible", display_order: 0 },
      ]),
    );
  });

  it("shows a clear message when the backend requires a responsible", async () => {
    mocks.listAssignments.mockResolvedValue([assignment("s1", "responsible")]);
    mocks.replace.mockRejectedValue(
      new ApiError("Bad", 400, { code: "CAMPOREE_EVENT_RESPONSIBLE_REQUIRED" }),
    );
    renderSection();
    await screen.findByText(t.hasResponsible);
    await userEvent.click(screen.getByRole("button", { name: "Quitar a Ana Pérez de las asignaciones" }));
    await userEvent.click(screen.getByRole("button", { name: t.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent(t.errors.responsibleRequired);
  });
});
