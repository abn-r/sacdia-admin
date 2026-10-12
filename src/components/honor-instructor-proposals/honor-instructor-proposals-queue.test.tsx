import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import type {
  HonorInstructorProposal,
  PaginatedHonorInstructorProposals,
} from "@/lib/api/honor-instructor-proposals";

const mockList = vi.fn<(...args: unknown[]) => Promise<PaginatedHonorInstructorProposals>>();
const mockApprove = vi.fn();
const mockReject = vi.fn();

vi.mock("@/lib/api/honor-instructor-proposals", () => ({
  getHonorInstructorProposals: (...args: unknown[]) => mockList(...args),
  approveHonorInstructorProposal: (...args: unknown[]) => mockApprove(...args),
  rejectHonorInstructorProposal: (...args: unknown[]) => mockReject(...args),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (message: string) => mockToastSuccess(message),
    error: (message: string) => mockToastError(message),
  },
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

import { HonorInstructorProposalsQueue } from "./honor-instructor-proposals-queue";

function proposal(overrides: Partial<HonorInstructorProposal> = {}): HonorInstructorProposal {
  return {
    proposal_id: "p-1",
    status: "PENDING",
    created_at: "2026-10-12T15:04:00Z",
    honor: { honor_id: 12, name: "Primeros Auxilios", category: { name: "Salud" } },
    member: { user_id: "u-1", display_name: "Luis Mora" },
    honor_approved_at: "2026-09-01T10:00:00Z",
    current_instructor: { kind: "USER", user_id: "u-9", display_name: "Ana Pérez" },
    proposed_instructor: { kind: "EXTERNAL", display_name: "Juan López" },
    ...overrides,
  };
}

function page(items: HonorInstructorProposal[], total = items.length) {
  return { items, total, page: 1, limit: 20 };
}

function renderQueue() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <HonorInstructorProposalsQueue />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

function apiError(status: number, code?: string) {
  return new ApiError("backend message", status, code ? { code } : {});
}

describe("HonorInstructorProposalsQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(page([proposal()]));
    mockApprove.mockResolvedValue(proposal({ status: "APPROVED" }));
    mockReject.mockResolvedValue(proposal({ status: "REJECTED" }));
  });

  afterEach(() => cleanup());

  it("loads PENDING by default and renders the row with both instructors and badges", async () => {
    renderQueue();

    expect(await screen.findByText("Luis Mora")).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING", page: 1 }));
    expect(screen.getByText("Primeros Auxilios")).toBeInTheDocument();
    expect(screen.getByText("Salud")).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("Usuario del sistema")).toBeInTheDocument();
    expect(screen.getByText("Juan López")).toBeInTheDocument();
    expect(screen.getByText("Externo, no verificado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pendientes" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows 'Sin instructor declarado' when there is no current instructor", async () => {
    mockList.mockResolvedValue(page([proposal({ current_instructor: null })]));
    renderQueue();

    expect(await screen.findByText("Sin instructor declarado")).toBeInTheDocument();
  });

  it("renders the empty state", async () => {
    mockList.mockResolvedValue(page([]));
    renderQueue();

    expect(await screen.findByText("Sin propuestas pendientes")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the error state and retries", async () => {
    mockList.mockRejectedValueOnce(apiError(500));
    renderQueue();

    expect(await screen.findByText("No se pudo cargar la cola")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Luis Mora")).toBeInTheDocument();
  });

  it("changes the status filter and resets to page 1", async () => {
    renderQueue();
    await screen.findByText("Luis Mora");

    mockList.mockResolvedValue(
      page([proposal({ status: "REJECTED", rejection_reason: "No es instructor del campo" })]),
    );
    await userEvent.click(screen.getByRole("button", { name: "Rechazadas" }));

    expect(await screen.findByText("No es instructor del campo")).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ status: "REJECTED", page: 1 }));
    expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
  });

  it("paginates when the total exceeds the page size", async () => {
    mockList.mockResolvedValue(page([proposal()], 45));
    renderQueue();

    expect(await screen.findByText("Página 1 de 3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    );
  });

  it("approves after confirming the change and refreshes the queue", async () => {
    renderQueue();
    await screen.findByText("Luis Mora");

    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Reemplazar a Ana Pérez por Juan López/)).toBeInTheDocument();

    const callsBefore = mockList.mock.calls.length;
    await userEvent.click(within(dialog).getByRole("button", { name: "Aprobar" }));

    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith("p-1"));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalled());
    await waitFor(() => expect(mockList.mock.calls.length).toBeGreaterThan(callsBefore));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("does not call reject without a reason", async () => {
    renderQueue();
    await screen.findByText("Luis Mora");

    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.type(within(dialog).getByLabelText(/Motivo del rechazo/), "  ab ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Rechazar propuesta" }));

    expect(await within(dialog).findByText(/entre 3 y 500 caracteres/)).toBeInTheDocument();
    expect(mockReject).not.toHaveBeenCalled();
  });

  it("rejects with the trimmed reason", async () => {
    renderQueue();
    await screen.findByText("Luis Mora");

    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.type(within(dialog).getByLabelText(/Motivo del rechazo/), "  No pertenece al campo  ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Rechazar propuesta" }));

    await waitFor(() =>
      expect(mockReject).toHaveBeenCalledWith("p-1", { reason: "No pertenece al campo" }),
    );
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalled());
  });

  it("explains a 409, refreshes the queue and closes the dialog", async () => {
    mockApprove.mockRejectedValue(apiError(409, "HONOR_INSTRUCTOR_PROPOSAL_NOT_PENDING"));
    renderQueue();
    await screen.findByText("Luis Mora");

    const callsBefore = mockList.mock.calls.length;
    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Aprobar" }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining("ya no está pendiente")),
    );
    await waitFor(() => expect(mockList.mock.calls.length).toBeGreaterThan(callsBefore));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("explains a 404 with a readable message", async () => {
    mockReject.mockRejectedValue(apiError(404));
    renderQueue();
    await screen.findByText("Luis Mora");

    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.type(within(dialog).getByLabelText(/Motivo del rechazo/), "Motivo válido");
    await userEvent.click(within(dialog).getByRole("button", { name: "Rechazar propuesta" }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining("ya no existe")),
    );
  });

  it("leaves only 'Rechazar' when approve answers HONOR_INSTRUCTOR_INVALID", async () => {
    mockApprove.mockRejectedValue(apiError(400, "HONOR_INSTRUCTOR_INVALID"));
    renderQueue();
    await screen.findByText("Luis Mora");

    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Aprobar" }));

    expect(await within(dialog).findByText(/ya no es elegible/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Rechazar propuesta" }));
    expect(await within(dialog).findByLabelText(/Motivo del rechazo/)).toBeInTheDocument();
  });
});
