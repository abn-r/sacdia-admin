import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string, values?: Record<string, unknown>) => {
    const path = `${namespace}.${key}`.split(".");
    let node: unknown = messages;
    for (const part of path) node = (node as Record<string, unknown>)?.[part];
    if (typeof node !== "string") return path.join(".");
    return node.replace(/\{(\w+)\}/g, (_, name) => String(values?.[name] ?? `{${name}}`));
  },
  getFormatter: async () => ({
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat("es", options).format(value),
  }),
}));

const statsMock = vi.fn();
vi.mock("@/lib/api/notifications", () => ({
  getNotificationStats: (...args: unknown[]) => statsMock(...args),
}));

import { NotificationStatsCards } from "./notification-stats-cards";

async function renderStrip() {
  const ui = await NotificationStatsCards();
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  statsMock.mockReset();
});

describe("NotificationStatsCards", () => {
  it("shows the four figures of the last 30 days", async () => {
    statsMock.mockResolvedValue({
      activeTokens: 412,
      inactiveTokens30d: 38,
      dailyDeliveryRate: [{ date: "2026-11-20", tokens_sent: 90, tokens_failed: 10, success_rate: 0.9 }],
    });
    await renderStrip();

    expect(screen.getByRole("list", { name: "Resumen de los últimos 30 días" })).toBeInTheDocument();
    expect(screen.getByText("412")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText(/90\s?%/)).toBeInTheDocument();
  });

  it("is simply absent for people the stats endpoint does not admit", async () => {
    statsMock.mockRejectedValue(new ApiError("Forbidden", 403, {}));
    const { container } = await renderStrip();
    expect(container).toBeEmptyDOMElement();
  });

  it("says so when the figures fail, instead of showing zeros", async () => {
    statsMock.mockRejectedValue(new ApiError("boom", 500, {}));
    await renderStrip();
    expect(screen.getByRole("alert")).toHaveTextContent(
      messages.people.community.notifications.kpis.loadError,
    );
  });
});
