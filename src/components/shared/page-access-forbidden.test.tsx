import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/es.json";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  return {
    getTranslations: async (ns: string) =>
      createTranslator({ locale: "es", messages, namespace: ns as never }),
  };
});

import { PageAccessForbidden } from "./page-access-forbidden";
import { TerritoryUnconfigured } from "./territory-unconfigured";

afterEach(cleanup);

async function show(node: Promise<React.ReactElement>) {
  render(<NextIntlClientProvider locale="es" messages={messages}>{await node}</NextIntlClientProvider>);
}

describe("PageAccessForbidden", () => {
  it("renders a single title, the description and a home action", async () => {
    await show(PageAccessForbidden());
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getByText(/Tu rol no incluye esta sección/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/dashboard");
  });

  it("adds a section header only when title is given", async () => {
    await show(PageAccessForbidden({ title: "Catálogos" }));
    expect(screen.getByText("Catálogos")).toBeInTheDocument();
  });
});

describe("TerritoryUnconfigured", () => {
  it("renders the territory copy and a logout action", async () => {
    await show(TerritoryUnconfigured());
    expect(screen.getAllByText("Tu cuenta no tiene un territorio asignado")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Cerrar sesión" })).toHaveAttribute(
      "href",
      "/api/auth/logout?next=/login",
    );
  });
});
