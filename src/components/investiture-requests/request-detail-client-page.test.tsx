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

const SYSTEM_TEXT =
  "Al comprobar el avance, esta persona no cubría los requisitos mínimos. Revisar sus evidencias de avance.";

const baseRequest: InvestitureRequest = {
  request_id: "req-1",
  club_section_id: 3,
  ecclesiastical_year_id: 7,
  club_id: 11,
  club_name: "Club Águilas",
  section_name: "Conquistadores",
  district_name: "Distrito Norte",
  pending_count: 2,
  earliest_investiture_date: "2026-11-20",
  created_at: "2026-10-01T15:00:00.000Z",
  people: [
    person({ person_id: "p1", user_name: "Ana Solís", class_name: "Amigo" }),
    person({ person_id: "p2", user_name: "Luis Peña", class_name: "Compañero" }),
    person({
      person_id: "p3",
      user_name: "Marta Ruiz",
      status: "INVESTED",
      can_authorize: false,
      authorization_comment: "Muy bien",
      resolved_by_name: "Pastor Gómez",
    }),
    person({
      person_id: "p4",
      user_name: "Pedro Díaz",
      status: "REJECTED_BY_SYSTEM",
      can_authorize: false,
      system_reason: SYSTEM_TEXT,
      resolved_by_name: null,
    }),
    person({
      person_id: "p5",
      user_name: "Sara Lima",
      status: "REJECTED_BY_PERSON",
      can_authorize: false,
      rejection_reason: HUMAN_REASON,
      resolved_by_name: "Pastor Gómez",
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

function rowOf(name: string) {
  return screen.getByText(name).closest("tr") as HTMLElement;
}

async function choose(user: ReturnType<typeof userEvent.setup>, name: string, label: string) {
  await user.click(within(rowOf(name)).getByRole("radio", { name: label }));
}

const emptyResolution = {
  request_id: "req-1",
  invested: [],
  rejected_by_person: [],
  rejected_by_system: [],
  retired: [],
  blocked: [],
  already_resolved: [],
};

describe("RequestDetailClientPage", () => {
  beforeEach(() => {
    mockResolve.mockResolvedValue(emptyResolution);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the request header with club, section, district and year", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Club Águilas" })).toBeInTheDocument();
    expect(screen.getByText(/Conquistadores · Distrito Norte · 2026/)).toBeInTheDocument();
  });

  it("sends the chosen decisions only after the irreversible confirmation", async () => {
    const user = userEvent.setup();
    renderPage();

    await choose(user, "Ana Solís", "Investir");
    await user.type(within(rowOf("Ana Solís")).getByLabelText("Comentario (opcional)"), "¡Bien!");
    await choose(user, "Luis Peña", "Rechazar");
    await user.type(
      within(rowOf("Luis Peña")).getByLabelText("Motivo del rechazo"),
      "Faltan evidencias",
    );

    await user.click(screen.getByRole("button", { name: "Confirmar decisiones (2)" }));
    expect(mockResolve).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/no se pueden deshacer/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(mockResolve).toHaveBeenCalledWith("req-1", {
        invest: [{ person_id: "p1", comment: "¡Bien!" }],
        reject: [{ person_id: "p2", reason: "Faltan evidencias" }],
      });
    });
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(toastMock.success).toHaveBeenCalled();
  });

  it("omits the comment when an investiture has none", async () => {
    const user = userEvent.setup();
    renderPage();

    await choose(user, "Ana Solís", "Investir");
    await user.click(screen.getByRole("button", { name: "Confirmar decisiones (1)" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(mockResolve).toHaveBeenCalledWith("req-1", {
        invest: [{ person_id: "p1" }],
        reject: [],
      });
    });
  });

  it("disables the confirm button with no decisions or with a rejection missing its reason", async () => {
    const user = userEvent.setup();
    renderPage();

    const button = screen.getByRole("button", { name: "Confirmar decisiones (0)" });
    expect(button).toBeDisabled();

    await choose(user, "Luis Peña", "Rechazar");
    expect(screen.getByRole("button", { name: "Confirmar decisiones (1)" })).toBeDisabled();

    await user.type(within(rowOf("Luis Peña")).getByLabelText("Motivo del rechazo"), "Sin evidencias");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Confirmar decisiones (1)" })).toBeEnabled(),
    );
  });

  it("keeps people undecided by default", () => {
    renderPage();

    expect(
      within(rowOf("Ana Solís")).getByRole("radio", { name: "Sin decidir" }),
    ).toBeChecked();
  });

  it("shows Sistema and the long system text for system rejections, and never a human reason", () => {
    renderPage();

    const systemRow = rowOf("Pedro Díaz");
    expect(within(systemRow).getByText(/Sistema/)).toBeInTheDocument();
    expect(within(systemRow).getByText(SYSTEM_TEXT)).toBeInTheDocument();

    const personRow = rowOf("Sara Lima");
    expect(within(personRow).getByText(/Pastor Gómez/)).toBeInTheDocument();
    expect(within(personRow).queryByText(/motivo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(HUMAN_REASON)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(HUMAN_REASON);

    const investedRow = rowOf("Marta Ruiz");
    expect(within(investedRow).getByText(/Pastor Gómez/)).toBeInTheDocument();
    expect(within(investedRow).getByText(/Muy bien/)).toBeInTheDocument();
  });

  it("does not render controls when nobody can be authorized and explains why", () => {
    renderPage({
      ...baseRequest,
      people: baseRequest.people.map((p) => ({ ...p, can_authorize: false })),
    });

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar decisiones/ })).not.toBeInTheDocument();
    expect(screen.getByText(/no tenés permiso para autorizar/i)).toBeInTheDocument();
  });

  it("shows a persistent banner when the window is closed", async () => {
    mockResolve.mockRejectedValue(
      new ApiError("closed", 409, { code: "INVESTITURE_REQUEST_WINDOW_CLOSED" }),
    );
    const user = userEvent.setup();
    renderPage();

    await choose(user, "Ana Solís", "Investir");
    await user.click(screen.getByRole("button", { name: "Confirmar decisiones (1)" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    expect(
      await screen.findByText(
        "La ventana del Campo está cerrada. Pedí al Campo que la amplíe para poder autorizar.",
      ),
    ).toBeInTheDocument();
    expect(toastMock.error).toHaveBeenCalledWith(
      "La ventana del Campo está cerrada. Pedí al Campo que la amplíe para poder autorizar.",
    );
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("shows the resolution summary with partial results after confirming", async () => {
    mockResolve.mockResolvedValue({
      ...emptyResolution,
      invested: [person({ person_id: "p1", user_name: "Ana Solís", status: "INVESTED" })],
      rejected_by_system: [
        person({
          person_id: "p2",
          user_name: "Luis Peña",
          status: "REJECTED_BY_SYSTEM",
          system_reason: SYSTEM_TEXT,
        }),
      ],
    });
    const user = userEvent.setup();
    renderPage();

    await choose(user, "Ana Solís", "Investir");
    await choose(user, "Luis Peña", "Investir");
    await user.click(screen.getByRole("button", { name: "Confirmar decisiones (2)" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    const summary = await screen.findByRole("region", { name: "Resultado de la resolución" });
    expect(within(summary).getByText("Investidos")).toBeInTheDocument();
    expect(within(summary).getByText("Rechazados por el sistema")).toBeInTheDocument();
    expect(within(summary).getByText(SYSTEM_TEXT)).toBeInTheDocument();
  });
});
