import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { PageHeader } from "./page-header";

describe("PageHeader breadcrumb landmark", () => {
  afterEach(cleanup);

  it("localizes the breadcrumb nav aria-label", () => {
    render(
      <NextIntlClientProvider
        locale="es"
        messages={{ shared: { pageHeader: { breadcrumbNav: "Navegación de rutas" } } }}
      >
        <PageHeader
          title="Roles"
          breadcrumbs={[{ label: "Configuración", href: "/dashboard/configuration" }, { label: "Roles" }]}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("navigation", { name: "Navegación de rutas" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).toBeNull();
  });
});
