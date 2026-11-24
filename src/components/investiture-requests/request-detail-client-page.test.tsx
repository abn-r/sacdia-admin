import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import type {
  InvestitureRequest,
  InvestitureRequestPerson,
  InvestitureResolution,
} from "@/lib/api/investiture-requests";

const mockResolve = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

vi.mock("@/lib/api/investiture-requests", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/investiture-requests")>();
  return {
    ...original,
    resolveInvestitureRequest: (...args: unknown[]) => mockResolve(...args),
  };
});

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

import { RequestDetailClientPage } from "./request-detail-client-page";

function person(overrides: Partial<InvestitureRequestPerson>): InvestitureRequestPerson {
  return {
    person_id: "p0",
    user_id: "u0",
    user_name: "Persona",
    class_id: 1,
    class_name: "Amigo",
    section_name: "Conquistadores",
    enrollment_id: 100,
    investiture_date: "2026-11-20",
    status: "PENDING",
    can_authorize: true,
    authorization_comment: null,
    rejection_reason: null,
    system_reason: null,
    resolution_code: null,
    resolved_by_id: null,
    resolved_by_name: null,
    date_changed_by_id: null,
    date_changed_at: null,
    ...overrides,
  };
}

const HUMAN_REASON = "MOTIVO-HUMANO-SECRETO";
const SYSTEM_TEXT = "Ya tenía la clase aprobada en otra sección.";

const baseRequest: InvestitureRequest = {
  request_id: "req-1",
  club_section_id: 3,
  ecclesiastical_year_id: 7,
  club_name: "Club Cedros",
  section_name: "Conquistadores",
  district_name: "Distrito Sur",
  created_at: "2026-10-01T15:00:00.000Z",
  people: [
    person({ person_id: "p1", user_name: "Sofía Mendoza", class_name: "Compañero" }),
    person({ person_id: "p2", user_name: "Diego Ramírez", class_name: "Compañero" }),
    person({ person_id: "p3", user_name: "Camila Rojas", class_name: "Explorador" }),
    person({ person_id: "p4", user_name: "Tomás Aguilar", class_name: "Amigo" }),
    person({
      person_id: "p5",
      user_name: "Emiliano Torres",
      status: "REJECTED_BY_SYSTEM",
      can_authorize: false,
      system_reason: SYSTEM_TEXT,
    }),
    person({
      person_id: "p6",
      user_name: "Valeria Cruz",
      status: "INVESTED",
      can_authorize: false,
      resolved_by_name: "Mateo Herrera",
    }),
    person({
      person_id: "p7",
      user_name: "Lucía Paz",
      status: "REJECTED_BY_PERSON",
      can_authorize: false,
      rejection_reason: HUMAN_REASON,
      resolved_by_name: "Mateo Herrera",
    }),
  ],
};

function renderPage(request: InvestitureRequest = baseRequest) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RequestDetailClientPage request={request} yearName="2026" />
    </NextIntlClientProvider>,
  );
}

const rowOf = (name: string) => screen.getByText(name).closest("li") as HTMLElement;

async function choose(user: ReturnType<typeof userEvent.setup>, name: string, label: string) {
  await user.click(within(rowOf(name)).getByRole("radio", { name: label }));
}

describe("RequestDetailClientPage", () => {
  beforeEach(() => {
    mockResolve.mockReset();
    mockRefresh.mockReset();
    toastMock.success.mockReset();
  });
  afterEach(() => cleanup());

  it("names the section in the header and the breadcrumb says Investiduras", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Club Cedros" })).toBeInTheDocument();
    expect(screen.getByText("Conquistadores · Distrito Sur · 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Investiduras" })).toHaveAttribute(
      "href",
      "/dashboard/investiture-requests",
    );
    expect(screen.queryByText("Autorizaciones de investidura")).not.toBeInTheDocument();
  });

  it("offers a segmented decision only to people still pending that the viewer can authorize", () => {
    renderPage();

    expect(within(rowOf("Sofía Mendoza")).getAllByRole("radio")).toHaveLength(3);
    expect(within(rowOf("Valeria Cruz")).queryAllByRole("radio")).toHaveLength(0);
    expect(within(rowOf("Emiliano Torres")).queryAllByRole("radio")).toHaveLength(0);
  });

  it("opens the reason field under the person who gets rejected, and only there", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await choose(user, "Camila Rojas", "Rechazar");

    expect(within(rowOf("Camila Rojas")).getByRole("textbox")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("invests every undecided person with the shortcut and keeps explicit rejections", async () => {
    const user = userEvent.setup();
    renderPage();
    await choose(user, "Camila Rojas", "Rechazar");

    await user.click(screen.getByRole("button", { name: "Investir a todas las sin decidir" }));

    expect(within(rowOf("Sofía Mendoza")).getByRole("radio", { name: "Investir" })).toBeChecked();
    expect(within(rowOf("Tomás Aguilar")).getByRole("radio", { name: "Investir" })).toBeChecked();
    expect(within(rowOf("Camila Rojas")).getByRole("radio", { name: "Rechazar" })).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("3 por investir · 1 por rechazar · 0 sin decidir");
    expect(screen.getByRole("button", { name: "Investir a todas las sin decidir" })).toBeDisabled();
  });

  it("summarizes in the bottom bar and blocks confirming while a rejection has no reason", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole("button", { name: "Confirmar decisiones" })).toBeDisabled();

    await choose(user, "Sofía Mendoza", "Investir");
    await choose(user, "Camila Rojas", "Rechazar");

    expect(screen.getByRole("status")).toHaveTextContent("1 por investir · 1 por rechazar · 2 sin decidir");
    expect(screen.getByRole("status")).toHaveTextContent("Falta el motivo de un rechazo.");
    expect(screen.getByRole("button", { name: "Confirmar 2 decisiones" })).toBeDisabled();

    await user.type(within(rowOf("Camila Rojas")).getByRole("textbox"), "No completó la especialidad");
    expect(screen.getByRole("button", { name: "Confirmar 2 decisiones" })).toBeEnabled();
  });

  it("the confirmation says how many are invested, how many rejected and who stays undecided", async () => {
    const user = userEvent.setup();
    renderPage();
    await choose(user, "Sofía Mendoza", "Investir");
    await choose(user, "Diego Ramírez", "Investir");
    await choose(user, "Camila Rojas", "Rechazar");
    await user.type(within(rowOf("Camila Rojas")).getByRole("textbox"), "Falta una especialidad");

    await user.click(screen.getByRole("button", { name: "Confirmar 3 decisiones" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("¿Confirmar 3 decisiones?")).toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      "Se investirán 2 personas. Se rechazará 1 persona. Tomás Aguilar queda sin decidir.",
    );
    expect(dialog).toHaveTextContent("Las decisiones confirmadas no se pueden deshacer.");
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("sends the decisions, then shows the result per person including the system rejection", async () => {
    const user = userEvent.setup();
    const resolution: InvestitureResolution = {
      request_id: "req-1",
      invested: [person({ person_id: "p1", user_name: "Sofía Mendoza", status: "INVESTED", can_authorize: false, resolved_by_name: "Mateo Herrera" })],
      rejected_by_person: [person({ person_id: "p3", user_name: "Camila Rojas", status: "REJECTED_BY_PERSON", can_authorize: false, resolved_by_name: "Mateo Herrera" })],
      rejected_by_system: [person({ person_id: "p2", user_name: "Diego Ramírez", status: "REJECTED_BY_SYSTEM", can_authorize: false, system_reason: SYSTEM_TEXT })],
      retired: [],
      blocked: [],
      already_resolved: [],
    };
    mockResolve.mockResolvedValue(resolution);
    renderPage();

    await choose(user, "Sofía Mendoza", "Investir");
    await choose(user, "Diego Ramírez", "Investir");
    await choose(user, "Camila Rojas", "Rechazar");
    await user.type(within(rowOf("Camila Rojas")).getByRole("textbox"), "Falta una especialidad");
    await user.click(screen.getByRole("button", { name: "Confirmar 3 decisiones" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(mockResolve).toHaveBeenCalledWith("req-1", {
        invest: [{ person_id: "p1" }, { person_id: "p2" }],
        reject: [{ person_id: "p3", reason: "Falta una especialidad" }],
      }),
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(mockRefresh).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalled();

    const summary = screen.getByText("Decisiones aplicadas").closest("div") as HTMLElement;
    expect(summary).toHaveTextContent("1 investida · 1 rechazada por ti · 1 rechazada por el sistema");

    expect(within(rowOf("Sofía Mendoza")).queryAllByRole("radio")).toHaveLength(0);
    expect(within(rowOf("Sofía Mendoza")).getByText("Investido")).toBeInTheDocument();
    expect(within(rowOf("Camila Rojas")).getByText("Motivo: Falta una especialidad")).toBeInTheDocument();
    expect(
      within(rowOf("Diego Ramírez")).getByText(`Rechazado automáticamente: ${SYSTEM_TEXT}`),
    ).toBeInTheDocument();
    // The person left undecided keeps its control.
    expect(within(rowOf("Tomás Aguilar")).getAllByRole("radio")).toHaveLength(3);
  });

  it("keeps the dialog open with the mapped message when the window closed", async () => {
    const user = userEvent.setup();
    mockResolve.mockRejectedValue(
      new ApiError("closed", 409, { code: "INVESTITURE_REQUEST_WINDOW_CLOSED" }),
    );
    renderPage();
    await choose(user, "Sofía Mendoza", "Investir");
    await user.click(screen.getByRole("button", { name: "Confirmar 1 decisión" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      messages.investiture_requests.errors.window_closed_authorize,
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getAllByText(messages.investiture_requests.detail.windowClosedBanner).length).toBeGreaterThan(0);
  });

  it("shows resolved people as results, never the stored human reason of another authorizer", () => {
    renderPage();

    expect(within(rowOf("Valeria Cruz")).getByText("Investido")).toBeInTheDocument();
    expect(within(rowOf("Valeria Cruz")).getByText("Resuelto por Mateo Herrera")).toBeInTheDocument();
    expect(within(rowOf("Lucía Paz")).getByText("Rechazado")).toBeInTheDocument();
    expect(screen.queryByText(HUMAN_REASON)).not.toBeInTheDocument();
    expect(
      within(rowOf("Emiliano Torres")).getByText(`Rechazado automáticamente: ${SYSTEM_TEXT}`),
    ).toBeInTheDocument();
  });

  it("is read-only with a notice when nobody in the list can be authorized by the viewer", () => {
    renderPage({
      ...baseRequest,
      people: baseRequest.people.map((p) => (p.status === "PENDING" ? { ...p, can_authorize: false } : p)),
    });

    expect(screen.getByText(messages.investiture_requests.detail.readOnlyNotice)).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /Confirmar/ })).not.toBeInTheDocument();
  });
});
