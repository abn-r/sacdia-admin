import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EvidenceItem } from "@/lib/api/evidence-review";

vi.mock("next-intl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-intl")>()),
  // Echo the key: the assertions do not depend on copy.
  useTranslations: () => (key: string) => key,
  useLocale: () => "es",
  useFormatter: () => ({ dateTime: () => "10:00" }),
}));

const refresh = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace }),
  usePathname: () => "/dashboard/clubs/validations",
  useSearchParams: () => new URLSearchParams("tab=evidence"),
}));

const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockBulkApprove = vi.fn();
const mockBulkReject = vi.fn();
const mockPending = vi.fn();
vi.mock("@/lib/api/evidence-review", () => ({
  approveEvidence: (...a: unknown[]) => mockApprove(...a),
  rejectEvidence: (...a: unknown[]) => mockReject(...a),
  bulkApproveEvidence: (...a: unknown[]) => mockBulkApprove(...a),
  bulkRejectEvidence: (...a: unknown[]) => mockBulkReject(...a),
  getEvidencePending: (...a: unknown[]) => mockPending(...a),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("./evidence-preview", () => ({
  EvidencePreview: ({ item }: { item: EvidenceItem }) => (
    <div data-testid="preview">{`${item.type}:${item.id}`}</div>
  ),
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { EvidenceInboxTab } from "./evidence-inbox-tab";

function item(id: number, type: "honor" | "class", name: string): EvidenceItem {
  return {
    id,
    type,
    status: "SUBMITTED",
    member_name: name,
    member_id: `u-${id}`,
    entity_name: type === "honor" ? "Nudos y amarras" : "Amigo",
    section_name: "Sección",
    file_count: 2,
    submitted_at: "2026-11-20T10:00:00Z",
    validated_at: null,
    rejection_reason: null,
  };
}

const ITEMS = [
  item(1, "honor", "Emiliano Torres"),
  item(2, "honor", "Camila Rojas"),
  item(3, "class", "Mía Herrera"),
];

function renderTab(data: EvidenceItem[] = ITEMS, total = data.length) {
  render(<EvidenceInboxTab typeFilter="all" result={{ ok: true, data: { data, total, page: 1, limit: 50 } }} />);
}

describe("EvidenceInboxTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApprove.mockResolvedValue({});
    mockBulkApprove.mockResolvedValue({ succeeded: [1, 2], failed: [] });
  });
  afterEach(() => cleanup());

  it("selects the first item and approves and moves to the next", async () => {
    renderTab();
    expect(screen.getByTestId("preview")).toHaveTextContent("honor:1");

    await userEvent.click(screen.getByRole("button", { name: "approveNext" }));

    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith("honor", 1));
    await waitFor(() => expect(screen.getByTestId("preview")).toHaveTextContent("honor:2"));
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(refresh).toHaveBeenCalled();
  });

  it("offers batch approve only when all selected items share a type", async () => {
    renderTab();
    const boxes = screen.getAllByRole("checkbox");
    await userEvent.click(boxes[0]!);
    await userEvent.click(boxes[1]!);
    const bar = screen.getByRole("region", { name: "bulk.label" });
    expect(within(bar).getByRole("button", { name: "bulk.approve" })).toBeEnabled();

    await userEvent.click(boxes[2]!);
    expect(within(bar).getByRole("button", { name: "bulk.approve" })).toBeDisabled();
    expect(within(bar).getByText("bulk.mixed")).toBeInTheDocument();
  });

  it("approves a same-type selection in one batch after confirming", async () => {
    renderTab();
    const boxes = screen.getAllByRole("checkbox");
    await userEvent.click(boxes[0]!);
    await userEvent.click(boxes[1]!);
    await userEvent.click(screen.getByRole("button", { name: "bulk.approve" }));

    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "bulk.approveDialog.confirm" }));

    await waitFor(() => expect(mockBulkApprove).toHaveBeenCalledWith({ ids: [1, 2], type: "honor" }));
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
  });

  it("rejects a selection with one reason for all", async () => {
    mockBulkReject.mockResolvedValue({ succeeded: [1, 2], failed: [] });
    renderTab();
    const boxes = screen.getAllByRole("checkbox");
    await userEvent.click(boxes[0]!);
    await userEvent.click(boxes[1]!);
    await userEvent.click(screen.getByRole("button", { name: "bulk.reject" }));

    const dialog = await screen.findByRole("alertdialog");
    await userEvent.type(within(dialog).getByRole("textbox"), "Fotos ilegibles");
    await userEvent.click(within(dialog).getByRole("button", { name: "bulk.rejectDialog.confirm" }));

    await waitFor(() =>
      expect(mockBulkReject).toHaveBeenCalledWith({ ids: [1, 2], type: "honor", reason: "Fotos ilegibles" }),
    );
  });

  it("rejects the open item with a required reason", async () => {
    mockReject.mockResolvedValue({});
    renderTab();
    await userEvent.click(screen.getByRole("button", { name: "reject" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "rejectDialog.confirm" })).toBeDisabled();
    await userEvent.type(within(dialog).getByRole("textbox"), "No se ve el nudo");
    await userEvent.click(within(dialog).getByRole("button", { name: "rejectDialog.confirm" }));
    await waitFor(() => expect(mockReject).toHaveBeenCalledWith("honor", 1, "No se ve el nudo"));
  });

  it("shows an error state, not an empty one, when the list failed", () => {
    render(
      <EvidenceInboxTab typeFilter="all" result={{ ok: false, error: { kind: "error" } }} />,
    );
    expect(screen.getByText("loadErrorTitle")).toBeInTheDocument();
    expect(screen.queryByText("emptyTitle")).not.toBeInTheDocument();
  });

  it("shows the empty state when there is nothing to review", () => {
    renderTab([], 0);
    expect(screen.getByText("emptyTitle")).toBeInTheDocument();
  });
});
