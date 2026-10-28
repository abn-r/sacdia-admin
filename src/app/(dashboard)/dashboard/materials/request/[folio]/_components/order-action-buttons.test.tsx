import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockApproveOrder = vi.fn();
const mockDeliverOrder = vi.fn();
const mockRefresh = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

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
}));

import { ApiError } from "@/lib/api/client";
import { ApproveButton } from "./approve-button";
import { DeliverButton } from "./deliver-button";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => cleanup());

describe("order action buttons", () => {
  it.each([
    ["approve", () => <ApproveButton folio="SOL1" />, mockApproveOrder, /Aprobar pedido/],
    ["deliver", () => <DeliverButton folio="SOL1" />, mockDeliverOrder, /Marcar como entregado/],
  ] as const)(
    "%s: disables the button during the request, so a double click posts once",
    async (_name, renderButton, apiCall, label) => {
      const request = deferred();
      apiCall.mockReturnValueOnce(request.promise);

      render(renderButton());
      const button = screen.getByRole("button", { name: label });

      fireEvent.click(button);
      expect(await screen.findByRole("button")).toBeDisabled();
      fireEvent.click(screen.getByRole("button"));

      await act(async () => {
        request.resolve();
        await request.promise;
      });

      expect(apiCall).toHaveBeenCalledTimes(1);
      expect(mockToastSuccess).toHaveBeenCalledTimes(1);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    },
  );

  it("approve: shows the backend message on failure and re-enables the button", async () => {
    mockApproveOrder.mockRejectedValueOnce(
      new ApiError("One or more products have insufficient stock", 409, null),
    );

    render(<ApproveButton folio="SOL1" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Aprobar pedido/ }));
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "One or more products have insufficient stock",
    );
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Aprobar pedido/ })).toBeEnabled();
  });
});
