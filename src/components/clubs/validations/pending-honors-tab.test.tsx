import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PendingValidation } from "@/lib/api/validation";

vi.mock("next-intl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-intl")>()),
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
  useFormatter: () => ({ dateTime: () => "10:00" }),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const mockReview = vi.fn();
const mockHistory = vi.fn();
vi.mock("@/lib/api/validation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/validation")>()),
  reviewValidation: (...a: unknown[]) => mockReview(...a),
  getValidationHistory: (...a: unknown[]) => mockHistory(...a),
}));

const mockDetail = vi.fn();
vi.mock("@/lib/api/evidence-review", () => ({
  getEvidenceDetail: (...a: unknown[]) => mockDetail(...a),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { PendingHonorsTab } from "./pending-honors-tab";

function validation(id: number, member: string, honor: string): PendingValidation {
  return {
    validation_id: id,
    entity_type: "honor",
    entity_id: id,
    status: "PENDING_REVIEW",
    submitted_at: "2026-11-12T10:00:00Z",
    user: { user_id: `u-${id}`, first_name: member, last_name: "Prueba" },
    entity: { id, name: honor },
  };
}

const DETAIL = {
  id: 10,
  type: "honor",
  instructor: { kind: "USER", user_id: "u-9", display_name: "Andrés Ruiz" },
  completed_at: "2026-11-08",
  validated_at: null,
  files: [],
  honor_review_packet: {
    progress: { total_requirements: 2, completed_count: 1, progress_percentage: 50 },
    requirements: [
      { requirement_id: 1, requirement_text: "Conocer 10 nudos", completed: true },
      { requirement_id: 2, requirement_text: "Hacer una camilla", completed: false },
    ],
  },
};

function renderTab(data: PendingValidation[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PendingHonorsTab result={{ ok: true, data }} />
    </QueryClientProvider>,
  );
}

describe("PendingHonorsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetail.mockResolvedValue(DETAIL);
    mockHistory.mockResolvedValue([]);
    mockReview.mockResolvedValue({});
  });
  afterEach(() => cleanup());

  it("opens the sheet with requirements, instructor and end date before deciding", async () => {
    renderTab([validation(10, "Emiliano", "Nudos y amarras")]);
    await userEvent.click(screen.getAllByRole("button", { name: "review" })[0]!);

    const sheet = await screen.findByRole("dialog");
    expect(await within(sheet).findByText("Conocer 10 nudos")).toBeInTheDocument();
    expect(within(sheet).getByText("Hacer una camilla")).toBeInTheDocument();
    expect(within(sheet).getByTestId("honor-instructor")).toHaveTextContent("Andrés Ruiz");
    expect(within(sheet).getByTestId("honor-completed-at")).toHaveTextContent("2026");
  });

  it("approves from the sheet and refreshes the counters", async () => {
    renderTab([validation(10, "Emiliano", "Nudos y amarras")]);
    await userEvent.click(screen.getAllByRole("button", { name: "review" })[0]!);
    const sheet = await screen.findByRole("dialog");
    await userEvent.click(within(sheet).getByRole("button", { name: "approve" }));

    await waitFor(() => expect(mockReview).toHaveBeenCalledWith("honor", 10, { action: "APPROVED" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("requires a reason to reject, inside the sheet", async () => {
    renderTab([validation(10, "Emiliano", "Nudos y amarras")]);
    await userEvent.click(screen.getAllByRole("button", { name: "review" })[0]!);
    const sheet = await screen.findByRole("dialog");

    await userEvent.click(within(sheet).getByRole("button", { name: "reject" }));
    expect(await within(sheet).findByRole("alert")).toBeInTheDocument();
    expect(mockReview).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await userEvent.type(within(sheet).getByRole("textbox"), "Faltan requisitos");
    await userEvent.click(within(sheet).getByRole("button", { name: "reject" }));
    await waitFor(() =>
      expect(mockReview).toHaveBeenCalledWith("honor", 10, { action: "REJECTED", comment: "Faltan requisitos" }),
    );
  });

  it("opens the history in the same sheet", async () => {
    mockHistory.mockResolvedValue([
      { history_id: 1, action: "REJECTED", comment: "Falta foto", created_at: "2026-11-10T10:00:00Z" },
    ]);
    renderTab([validation(10, "Emiliano", "Nudos y amarras")]);
    await userEvent.click(screen.getAllByRole("button", { name: "review" })[0]!);
    const sheet = await screen.findByRole("dialog");
    await userEvent.click(within(sheet).getByRole("button", { name: "showHistory" }));
    expect(await within(sheet).findByText("Falta foto")).toBeInTheDocument();
  });

  it("filters by member or specialty", async () => {
    renderTab([validation(10, "Emiliano", "Nudos y amarras"), validation(11, "Camila", "Cocina")]);
    await userEvent.type(screen.getByLabelText("searchLabel"), "cocina");
    expect(screen.queryAllByText("Nudos y amarras")).toHaveLength(0);
    expect(screen.getAllByText("Cocina").length).toBeGreaterThan(0);
  });

  it("shows an error row with the headers, never an empty state", () => {
    render(<PendingHonorsTab result={{ ok: false, error: { kind: "error" } }} />);
    expect(screen.getByText("loadErrorTitle")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "columns.member" })).toBeInTheDocument();
    expect(screen.queryByText("emptyTitle")).not.toBeInTheDocument();
  });

  it("shows the empty state when nothing is pending", () => {
    renderTab([]);
    expect(screen.getByText("emptyTitle")).toBeInTheDocument();
  });
});
