import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockApproveOrder = vi.fn();
const mockDeliverOrder = vi.fn();
const mockCancelOrder = vi.fn();
const mockRefresh = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string, values?: Record<string, unknown>) =>
    `${ns ? `${ns}.` : ""}${key}${values && Object.keys(values).length ? `|${JSON.stringify(values)}` : ""}`,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));
vi.mock("@/lib/api/materials", () => ({
  approveOrder: (...args: unknown[]) => mockApproveOrder(...args),
  deliverOrder: (...args: unknown[]) => mockDeliverOrder(...args),
  cancelOrder: (...args: unknown[]) => mockCancelOrder(...args),
}));

import { ApiError } from "@/lib/api/client";
import { OrderActions } from "./order-actions";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const base = {
  orderId: "ord-1",
  folio: "SOL20260014",
  estado: "en_revision" as const,
  totalCentavos: 294000,
  directorName: "Mateo Herrera",
  pieces: 36,
  canApprove: true,
  canDeliver: true,
  allResolved: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => cleanup());

describe("OrderActions · approve", () => {
  it("stays disabled until every line has availability", () => {
    render(<OrderActions {...base} allResolved={false} />);
    expect(screen.getByRole("button", { name: "ops.materials.actions.approve" })).toBeDisabled();
  });

  it("disables the button during the request, so a double click posts once", async () => {
    const request = deferred();
    mockApproveOrder.mockReturnValueOnce(request.promise);

    render(<OrderActions {...base} />);
    fireEvent.click(screen.getByRole("button", { name: "ops.materials.actions.approve" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "ops.materials.actions.approve" })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "ops.materials.actions.approve" }));

    await act(async () => {
      request.resolve();
      await request.promise;
    });

    expect(mockApproveOrder).toHaveBeenCalledTimes(1);
    expect(mockApproveOrder).toHaveBeenCalledWith("ord-1");
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows the backend message on failure and re-enables the button", async () => {
    mockApproveOrder.mockRejectedValueOnce(new ApiError("One or more products have insufficient stock", 409, null));

    render(<OrderActions {...base} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ops.materials.actions.approve" }));
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "ops.materials.actions.approveError",
      expect.objectContaining({ description: "One or more products have insufficient stock" }),
    );
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "ops.materials.actions.approve" })).toBeEnabled();
  });

  it("hides approve without the permission", () => {
    render(<OrderActions {...base} canApprove={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("OrderActions · deliver", () => {
  const paid = { ...base, estado: "pagada" as const };

  it("asks for confirmation before closing the order", async () => {
    render(<OrderActions {...paid} />);
    await userEvent.click(screen.getByRole("button", { name: "ops.materials.actions.deliver" }));

    expect(mockDeliverOrder).not.toHaveBeenCalled();
    expect(await screen.findByText(/ops\.materials\.deliver\.description/)).toBeInTheDocument();
  });

  it("delivers once after the confirmation and refreshes", async () => {
    mockDeliverOrder.mockResolvedValueOnce({});
    render(<OrderActions {...paid} />);
    await userEvent.click(screen.getByRole("button", { name: "ops.materials.actions.deliver" }));
    await userEvent.click(await screen.findByRole("button", { name: "ops.materials.deliver.confirm" }));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(mockDeliverOrder).toHaveBeenCalledTimes(1);
    expect(mockDeliverOrder).toHaveBeenCalledWith("ord-1");
  });

  it("keeps the dialog open with the backend message when delivery fails", async () => {
    mockDeliverOrder.mockRejectedValueOnce(new ApiError("Order already delivered", 409, null));
    render(<OrderActions {...paid} />);
    await userEvent.click(screen.getByRole("button", { name: "ops.materials.actions.deliver" }));
    await userEvent.click(await screen.findByRole("button", { name: "ops.materials.deliver.confirm" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Order already delivered");
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

describe("OrderActions · cancel", () => {
  it.each([
    ["en_revision", "ops.materials.cancel.consequence.close"],
    ["aprobada", "ops.materials.cancel.consequence.restoreStock"],
    ["pagada", "ops.materials.cancel.consequence.refund"],
  ] as const)("explains the consequence in %s before asking the reason", async (estado, consequenceKey) => {
    render(<OrderActions {...base} estado={estado} />);
    await userEvent.click(screen.getByRole("button", { name: "ops.materials.actions.cancel" }));

    expect(await screen.findByText(consequenceKey)).toBeInTheDocument();
    expect(mockCancelOrder).not.toHaveBeenCalled();
  });

  it("requires at least 10 characters and sends the trimmed reason", async () => {
    mockCancelOrder.mockResolvedValueOnce({});
    render(<OrderActions {...base} estado="pagada" />);
    await userEvent.click(screen.getByRole("button", { name: "ops.materials.actions.cancel" }));

    const confirm = await screen.findByRole("button", { name: "ops.materials.cancel.confirm" });
    const reason = screen.getByRole("textbox");
    await userEvent.type(reason, "corto");
    expect(confirm).toBeDisabled();

    await userEvent.clear(reason);
    await userEvent.type(reason, "  El club suspendió el evento.  ");
    await userEvent.click(confirm);

    await waitFor(() => expect(mockCancelOrder).toHaveBeenCalledTimes(1));
    expect(mockCancelOrder).toHaveBeenCalledWith("ord-1", "El club suspendió el evento.");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("offers no cancel on closed orders or without the permission", () => {
    const { rerender } = render(<OrderActions {...base} estado="entregada" />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<OrderActions {...base} estado="pagada" canApprove={false} canDeliver={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
