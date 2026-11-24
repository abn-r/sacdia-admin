import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  usePathname: () => "/dashboard/clubs/7",
  useSearchParams: () => new URLSearchParams("tab=sections&section=11"),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const listCounselors = vi.fn();
const getAssignable = vi.fn();
vi.mock("@/lib/api/clubs", () => ({
  listClassCounselorAssignments: (...args: unknown[]) => listCounselors(...args),
  getAssignableRoles: (...args: unknown[]) => getAssignable(...args),
}));
const listClasses = vi.fn();
vi.mock("@/lib/api/classes", () => ({ listClasses: (...args: unknown[]) => listClasses(...args) }));
const listContinuations = vi.fn();
vi.mock("@/lib/api/annual-continuations", () => ({
  listAnnualContinuationsFromClient: (...args: unknown[]) => listContinuations(...args),
  submitAnnualContinuationsFromClient: vi.fn(),
}));

const revokeRole = vi.fn();
const toggleSection = vi.fn();
const assignRole = vi.fn();
vi.mock("@/lib/clubs/detail-actions", () => ({
  assignClubRoleAction: (...args: unknown[]) => assignRole(...args),
  assignClassCounselorAction: vi.fn(),
  revokeClubRoleAction: (...args: unknown[]) => revokeRole(...args),
  revokeClassCounselorAction: vi.fn(),
  toggleClubSectionActiveAction: (...args: unknown[]) => toggleSection(...args),
  createClubSectionAction: vi.fn(),
}));
const designate = vi.fn();
vi.mock("@/lib/clubs/actions", () => ({
  designateClubSectionDirectorAction: (...args: unknown[]) => designate(...args),
  succeedClubSectionDirectorAction: vi.fn(),
}));

import messages from "../../../../messages/es.json";
import { buildClubDetail, installRadixPolyfills } from "./detail-test-data";
import { SectionsTab } from "./sections-tab";

installRadixPolyfills();

const yearLabels = { current: "2026", next: "2027" };

function renderTab(data = buildClubDetail()) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SectionsTab data={data} yearLabels={yearLabels} canRevokeRoles />
    </NextIntlClientProvider>,
  );
}

function positionRow(label: string) {
  const row = screen.getByText(label).closest("li");
  if (!row) throw new Error(`no row for ${label}`);
  return row as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  listCounselors.mockResolvedValue([
    {
      assignment_id: "c-1",
      user_id: "u-valeria",
      class_id: 5,
      classes: { name: "Amigo" },
      users: { name: "Valeria", paternal_last_name: "Ortiz" },
    },
  ]);
  listClasses.mockResolvedValue({ data: [{ class_id: 5, name: "Amigo" }] });
  listContinuations.mockResolvedValue([]);
  getAssignable.mockResolvedValue({ guide_major_eligible: true, section_kind: "x", roles: [] });
  revokeRole.mockResolvedValue({ ok: true, success: "Rol removido." });
  toggleSection.mockResolvedValue({ ok: true, success: "Sección actualizada." });
});
afterEach(cleanup);

describe("SectionsTab positions (decision A)", () => {
  it("shows one row per position: who holds it, or «Asignar»", async () => {
    renderTab();

    expect(await screen.findByText("Cargos 2026")).toBeInTheDocument();
    expect(within(positionRow("Director")).getByText("Mateo Herrera")).toBeInTheDocument();
    expect(within(positionRow("Secretario")).getByText("Paola Núñez")).toBeInTheDocument();
    const deputy = positionRow("Subdirector");
    expect(within(deputy).getByText("Sin asignar")).toBeInTheDocument();
    expect(within(deputy).getByRole("button", { name: "Asignar Subdirector" })).toBeInTheDocument();
    // A filled single-slot position offers no second "Asignar".
    expect(within(positionRow("Director")).queryByRole("button", { name: /Asignar/ })).toBeNull();
  });

  it("keeps counselors in one row with the class next to the name", async () => {
    renderTab();

    const row = positionRow("Consejeros");
    await waitFor(() => expect(within(row).getByText("Valeria Ortiz")).toBeInTheDocument());
    expect(row).toHaveTextContent("Valeria Ortiz · Amigo");
  });

  it("puts director 2027 and the annual enrollment in the same section", async () => {
    renderTab();

    expect(await screen.findByRole("heading", { name: "Director 2027" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inscripción anual" })).toBeInTheDocument();
  });

  it("shows the year, never the ecclesiastical year id", async () => {
    renderTab(buildClubDetail({ nextYearId: 12, designationsBySectionId: {
      11: {
        succession_id: "s-1",
        user_id: "u-iker",
        ecclesiastical_year_id: 12,
        effective_date: "2027-01-01",
        status: "pending",
        version: 1,
        outgoing_assignment_id: null,
      },
    } }));

    expect(await screen.findByRole("heading", { name: "Director 2027" })).toBeInTheDocument();
    expect(screen.queryByText(/designado para/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Iker Montes/)).toBeInTheDocument();
    expect(screen.getByText(/será director cuando empiece 2027/)).toBeInTheDocument();
  });
});

describe("SectionsTab actions", () => {
  it("states the three reasons the plan won't activate before designating", async () => {
    renderTab();

    await userEvent.click(await screen.findByRole("button", { name: "Designar…" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("El plan no se activa si:")).toBeInTheDocument();
    expect(within(dialog).getByText(/el director actual sigue activo/)).toBeInTheDocument();
    expect(within(dialog).getByText(/no es Guía Mayor/)).toBeInTheDocument();
    expect(within(dialog).getByText(/consentimiento del tutor/)).toBeInTheDocument();
    expect(designate).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("button", { name: "Designar" })).toBeDisabled();
  });

  it("asks for confirmation before removing a position, then revokes it", async () => {
    renderTab();

    await userEvent.click(await screen.findByRole("button", { name: "Acciones de Paola Núñez" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Quitar cargo…" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("¿Quitar a Paola Núñez como secretario?");
    expect(dialog).toHaveTextContent("Sigue siendo miembro de la sección");
    expect(revokeRole).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Quitar cargo" }));
    await waitFor(() => expect(revokeRole).toHaveBeenCalledTimes(1));
    const form = revokeRole.mock.calls[0]?.[1] as FormData;
    expect(form.get("assignment_id")).toBe("as-2");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("asks for confirmation before disabling a section and says what changes", async () => {
    renderTab();

    await userEvent.click(await screen.findByRole("button", { name: "Deshabilitar sección…" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("¿Deshabilitar Conquistadores?");
    expect(dialog).toHaveTextContent("4 miembros dejan de ver las actividades");
    expect(dialog).toHaveTextContent("no se pueden inscribir en 2027");
    expect(toggleSection).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Deshabilitar" }));
    await waitFor(() => expect(toggleSection).toHaveBeenCalledTimes(1));
    expect((toggleSection.mock.calls[0]?.[3] as FormData).get("active")).toBe("false");
  });

  it("shows ineligible people dimmed with the reason instead of disabling without explanation", async () => {
    getAssignable.mockImplementation(async (_club: number, _section: number, userId: string) => ({
      guide_major_eligible: userId !== "u-iker",
      section_kind: "x",
      roles: [
        {
          role_id: "r-dep",
          role_name: "deputy-director",
          allowed: userId !== "u-iker",
          violation_rule: null,
          violation_code: userId === "u-iker" ? "CLUB_ROLE_GUIDE_MAJOR_REQUIRED" : null,
        },
      ],
    }));
    renderTab();

    await userEvent.click(await screen.findByRole("button", { name: "Asignar Subdirector" }));
    const dialog = await screen.findByRole("dialog");

    const reason = await within(dialog).findByText(
      "Solo una Guía Mayor puede tener un rol distinto de miembro.",
    );
    const blockedRow = reason.closest("div.opacity-60");
    expect(blockedRow).not.toBeNull();
    expect(within(blockedRow as HTMLElement).getByText("Iker Montes")).toBeInTheDocument();
    expect(within(blockedRow as HTMLElement).getByRole("radio")).toBeDisabled();

    const eligible = within(dialog).getByRole("radio", { name: /Tomás Vega|Valeria Ortiz/ });
    await waitFor(() => expect(eligible).toBeEnabled());
  });
});

describe("SectionsTab annual enrollment", () => {
  it("lists the suggested class by name, not by number, and blocked people with the reason", async () => {
    listContinuations.mockResolvedValue([
      {
        user_id: "u-iker",
        name: "Iker Montes",
        base_section_id: 11,
        ecclesiastical_year_id: 12,
        annual_status: "not_enrolled",
        current_role: null,
        eligibility: "eligible",
        blocked_reason: null,
        suggested_class: { status: "resolved", class_id: 5 },
      },
      {
        user_id: "u-tomas",
        name: "Tomás Vega",
        base_section_id: 11,
        ecclesiastical_year_id: 12,
        annual_status: "not_enrolled",
        current_role: null,
        eligibility: "blocked",
        blocked_reason: "MR_CONSENT_NOT_VERIFIED",
        suggested_class: { status: "blocked" },
      },
    ]);
    renderTab();

    await userEvent.click(await screen.findByRole("button", { name: "Inscripción anual" }));
    const sheet = await screen.findByRole("dialog");
    expect(await within(sheet).findByText("Clase sugerida: Amigo")).toBeInTheDocument();
    expect(sheet).not.toHaveTextContent("Clase sugerida: 5");
    expect(within(sheet).getByText(/Es menor y el consentimiento del tutor/)).toBeInTheDocument();
    expect(within(sheet).getByRole("checkbox", { name: /Tomás Vega/ })).toBeDisabled();
  });
});
