import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/catalogs/roles/12",
  useRouter: () => ({ push: vi.fn() }),
}));

import { RailLayout } from "./rail-layout";

const groups = [
  { label: "Geografía", items: [{ href: "/dashboard/catalogs/countries", label: "Países", count: 12 }] },
  { label: "Referencia", items: [{ href: "/dashboard/catalogs/roles", label: "Roles" }] },
];

describe("RailLayout", () => {
  afterEach(cleanup);

  it("renders groups, counts, content and marks the pathname match", () => {
    render(
      <NextIntlClientProvider locale="es" messages={{ shared: { kit: { rail: { navLabel: "Secciones", select: "Ir a sección" } } } }}>
        <RailLayout groups={groups} ariaLabel="Catálogos">
          <p>Contenido</p>
        </RailLayout>
      </NextIntlClientProvider>,
    );
    const nav = screen.getByRole("navigation", { name: "Catálogos" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByText("Geografía")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Roles" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Países/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Contenido")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Ir a sección" })).toBeInTheDocument();
  });
});
