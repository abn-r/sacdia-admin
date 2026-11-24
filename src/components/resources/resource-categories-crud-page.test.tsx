import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams("tab=categories"),
  usePathname: () => "/dashboard/resources",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ResourceCategoriesCrudPage } from "@/components/resources/resource-categories-crud-page";

type Props = React.ComponentProps<typeof ResourceCategoriesCrudPage>;

function ui(props: Partial<Props> = {}) {
  return (
    <NextIntlClientProvider locale="es" messages={messages}>
      <ResourceCategoriesCrudPage
        items={[
          { resource_category_id: 1, name: "Materiales de clase", active: true },
          { resource_category_id: 2, name: "Música", description: "Cantos", active: false },
        ]}
        meta={{ page: 1, limit: 20, total: 2, totalPages: 1 }}
        canCreate
        canEdit
        canDelete
        {...props}
      />
    </NextIntlClientProvider>
  );
}

afterEach(() => cleanup());

describe("ResourceCategoriesCrudPage", () => {
  it("marks only the inactive category", () => {
    render(ui());
    expect(screen.getAllByText("Inactiva")).toHaveLength(1);
    // "Activa" only appears as the filter option, never as a row mark.
    expect(screen.getByText("Música").closest("tr")).toHaveTextContent("Inactiva");
    expect(screen.getByText("Materiales de clase").closest("tr")).not.toHaveTextContent("Activa");
  });

  it("shows an error inside the table instead of an empty list", () => {
    render(ui({ items: [], loadError: { kind: "rateLimited" } }));
    expect(screen.getByText("Hay muchas solicitudes en este momento")).toBeInTheDocument();
    expect(screen.queryByText("No hay categorías de recursos")).not.toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Nombre");
  });

  it("keeps the create action next to the filters", () => {
    render(ui());
    expect(screen.getByRole("button", { name: /Crear categoría/ })).toBeInTheDocument();
  });
});
