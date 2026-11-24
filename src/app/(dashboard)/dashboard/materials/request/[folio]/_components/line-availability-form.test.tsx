import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPatch = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string, values?: Record<string, unknown>) =>
    `${ns ? `${ns}.` : ""}${key}${values && Object.keys(values).length ? `|${JSON.stringify(values)}` : ""}`,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/materials", () => ({
  patchOrderLine: (...args: unknown[]) => mockPatch(...args),
}));

import { LineAvailabilityCell } from "./line-availability-form";

const props = {
  folio: "ord-1",
  lineId: "line-1",
  productTitle: "Pañoleta Conquistadores",
  currentQtyDisponible: null,
  qty: 12,
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("LineAvailabilityCell", () => {
  it("resolves the line in its own row: Disponible saves immediately with the full quantity", async () => {
    mockPatch.mockResolvedValueOnce({});
    render(<LineAvailabilityCell {...props} currentDisponibilidad="pendiente" editable />);

    await userEvent.click(screen.getByRole("button", { name: "ops.materials.availability.disponible" }));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("ord-1", "line-1", { disponibilidad: "disponible", qty_disponible: 12 });
  });

  it("Agotado saves with zero available", async () => {
    mockPatch.mockResolvedValueOnce({});
    render(<LineAvailabilityCell {...props} currentDisponibilidad="pendiente" editable />);
    await userEvent.click(screen.getByRole("button", { name: "ops.materials.availability.agotado" }));
    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("ord-1", "line-1", { disponibilidad: "agotado", qty_disponible: 0 });
  });

  it("Parcial asks for the quantity and validates it before saving", async () => {
    mockPatch.mockResolvedValueOnce({});
    render(<LineAvailabilityCell {...props} currentDisponibilidad="pendiente" editable />);

    await userEvent.click(screen.getByRole("button", { name: "ops.materials.availability.parcial" }));
    expect(mockPatch).not.toHaveBeenCalled();

    const input = screen.getByRole("spinbutton");
    await userEvent.clear(input);
    await userEvent.type(input, "99");
    await userEvent.click(screen.getByRole("button", { name: "ops.materials.availability.save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ops.materials.availability.qtyInvalid");
    expect(mockPatch).not.toHaveBeenCalled();

    await userEvent.clear(input);
    await userEvent.type(input, "5");
    await userEvent.click(screen.getByRole("button", { name: "ops.materials.availability.save" }));
    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("ord-1", "line-1", { disponibilidad: "parcial", qty_disponible: 5 });
  });

  it("marks the current choice as pressed", () => {
    render(<LineAvailabilityCell {...props} currentDisponibilidad="agotado" currentQtyDisponible={0} editable />);
    expect(screen.getByRole("button", { name: "ops.materials.availability.agotado" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "ops.materials.availability.disponible" })).toHaveAttribute("aria-pressed", "false");
  });

  it("read-only: Disponible is plain text, only the exception gets a badge, and no buttons", () => {
    const { rerender } = render(<LineAvailabilityCell {...props} currentDisponibilidad="disponible" editable={false} />);
    expect(screen.getByText("ops.materials.availability.disponible")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();

    rerender(
      <LineAvailabilityCell {...props} currentDisponibilidad="parcial" currentQtyDisponible={5} editable={false} />,
    );
    expect(screen.getByText(/availability\.partial\|/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
