import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/insurance/expiring",
  useSearchParams: () => new URLSearchParams(),
}));

import { ExpiringDashboard } from "./expiring-dashboard";

Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

afterEach(cleanup);

describe("ExpiringDashboard - days filter", () => {
  it("exposes the window select with its visible label as accessible name", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <ExpiringDashboard items={[]} daysAhead={30} />
      </NextIntlClientProvider>,
    );

    const select = screen.getByRole("combobox", { name: "Vencen en" });
    expect(select).toHaveTextContent("30 días");
  });

  it("uses sentence case for the page title", () => {
    expect(messages.insurance.pageExpiring.title).toBe("Seguros por vencer");
  });
});
