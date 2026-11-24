import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/resources",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ResourcesCrudPage } from "@/components/resources/resources-crud-page";

const unions = [{ union_id: 20, name: "Unión Mexicana Interoceánica", country_id: 1 }];

const item = {
  resource_id: 7,
  title: "Cuadernillo Amigo",
  resource_type: "document",
  file_url: "https://cdn.example.org/cuadernillo.pdf",
  file_size: 13.2 * 1024 * 1024,
  scope_level: "union",
  scope_id: 20,
  resource_categories: { name: "Materiales de clase" },
};

type Props = React.ComponentProps<typeof ResourcesCrudPage>;

function ui(props: Partial<Props> = {}) {
  return (
    <NextIntlClientProvider locale="es" messages={messages}>
      <ResourcesCrudPage
        items={[item]}
        meta={{ page: 1, limit: 20, total: 1, totalPages: 1 }}
        categories={[]}
        clubTypes={[]}
        unions={unions}
        localFields={[]}
        canCreate
        canEdit
        canDelete
        loadedAt="2026-11-24T10:42:00.000Z"
        {...props}
      />
    </NextIntlClientProvider>
  );
}

afterEach(() => cleanup());

describe("ResourcesCrudPage", () => {
  it("shows the type as plain text and the scope as territory plus level", () => {
    const { container } = render(ui());
    const table = screen.getAllByRole("table")[0] as HTMLElement;
    const row = within(table).getByText("Cuadernillo Amigo").closest("tr") as HTMLElement;

    expect(within(row).getByText("Documento")).toBeInTheDocument();
    expect(within(row).getByText("PDF · 13.2 MB")).toBeInTheDocument();
    // The type is not a status badge.
    expect(container.querySelector("[data-slot=status-badge]")).toBeNull();

    const territory = within(row).getByText("Unión Mexicana Interoceánica");
    expect(territory.className).not.toMatch(/truncate/);
    expect(territory.nextElementSibling).toHaveTextContent("Unión");
  });

  it("does not repeat the level under a system-wide resource", () => {
    render(ui({ items: [{ ...item, scope_level: "system", scope_id: null }] }));
    const table = screen.getAllByRole("table")[0] as HTMLElement;
    const row = within(table).getByText("Cuadernillo Amigo").closest("tr") as HTMLElement;
    expect(within(row).getByText("Sistema").nextElementSibling).toBeNull();
  });

  it("shows an error, never an empty state, when the list failed to load", () => {
    render(ui({ items: [], loadError: { kind: "error", detail: { code: 500 } } }));

    expect(screen.getAllByText("No pudimos cargar esta información").length).toBeGreaterThan(0);
    expect(screen.queryByText("Aún no hay recursos")).not.toBeInTheDocument();
    // The column headers stay: the error lives inside the table frame.
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Recurso");
  });

  it("keeps the last good rows and says so when a reload fails", () => {
    const { rerender } = render(ui());
    rerender(
      ui({
        items: [],
        loadError: { kind: "offline" },
        loadedAt: "2026-11-24T10:50:00.000Z",
      }),
    );

    expect(screen.getAllByText("Cuadernillo Amigo").length).toBeGreaterThan(0);
    expect(screen.getByText(/No pudimos actualizar/)).toBeInTheDocument();
    expect(screen.queryByText("Aún no hay recursos")).not.toBeInTheDocument();
  });

  it("offers the upload route from the empty state", () => {
    render(ui({ items: [] }));
    expect(screen.getByText("Aún no hay recursos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Subir recurso/ })).toHaveAttribute(
      "href",
      "/dashboard/resources/new",
    );
  });
});
