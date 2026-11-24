import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import { DetailHeader } from "./detail-header";

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="es" messages={{ shared: { pageHeader: { breadcrumbNav: "Ruta" } } }}>
      {ui}
    </NextIntlClientProvider>,
  );

describe("DetailHeader", () => {
  afterEach(cleanup);

  it("renders title, subtitle, facts, media, actions and breadcrumbs", () => {
    wrap(
      <DetailHeader
        breadcrumbs={[{ label: "Clubes", href: "/c" }, { label: "Orión" }]}
        media={<span data-testid="logo" />}
        title="Orión"
        subtitle="Conquistadores"
        facts={[
          { label: "Miembros", value: "64" },
          { label: "Secciones", value: "3 de 3" },
        ]}
        actions={<button type="button">Editar</button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Orión" })).toBeInTheDocument();
    expect(screen.getByText("Conquistadores")).toBeInTheDocument();
    expect(screen.getByText("Miembros")).toBeInTheDocument();
    expect(screen.getByText("3 de 3")).toHaveClass("font-semibold");
    expect(screen.getByTestId("logo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Ruta" })).toBeInTheDocument();
  });

  it("omits optional regions", () => {
    wrap(<DetailHeader title="Solo" />);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("term")).toBeNull();
  });
});
