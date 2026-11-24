import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/es.json";
import { InsuranceProductsPanel } from "./insurance-products-panel";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const mockList = vi.fn();
const mockUpdate = vi.fn();
vi.mock("@/lib/api/insurance-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/insurance-config")>();
  return {
    ...actual,
    listInsuranceProducts: (...args: unknown[]) => mockList(...args),
    updateInsuranceProduct: (...args: unknown[]) => mockUpdate(...args),
  };
});

const PRODUCTS = [
  {
    insurance_product_id: 1,
    name: "Seguro anual",
    coverage_scope: "GENERAL",
    validity_mode: "FIXED_MONTHS",
    default_duration_months: 12,
    active: true,
  },
  {
    insurance_product_id: 2,
    name: "Seguro de camporee",
    coverage_scope: "EVENT",
    validity_mode: "EVENT_DATES",
    default_duration_months: null,
    active: false,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue(PRODUCTS);
  mockUpdate.mockResolvedValue({});
});
afterEach(cleanup);

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <InsuranceProductsPanel />
    </NextIntlClientProvider>,
  );
}

describe("InsuranceProductsPanel (settings pattern)", () => {
  it("lists products as label + panel rows and marks only the inactive one", async () => {
    renderPanel();

    expect(await screen.findByText("Seguro anual")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: messages.insurance_config.tabs.products })).toBeInTheDocument();
    // «Activo» is the normal state: only «Inactivo» is marked.
    expect(screen.queryByText(messages.insurance_config.products.active)).not.toBeInTheDocument();
    expect(screen.getAllByText(messages.insurance_config.products.inactive)).toHaveLength(1);
  });

  it("asks for confirmation before deactivating a product", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Seguro anual");

    await user.click(screen.getByRole("button", { name: messages.insurance_config.products.deactivate }));
    expect(mockUpdate).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("heading", { name: /Seguro anual/ })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: messages.insurance_config.products.deactivate }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(1, { active: false }, undefined));
  });

  it("activates without asking, since nothing is lost", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Seguro de camporee");

    await user.click(screen.getByRole("button", { name: messages.insurance_config.products.activate }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(2, { active: true }, undefined));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
