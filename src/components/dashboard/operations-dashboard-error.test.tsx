import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import es from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import { OperationsDashboardError } from "@/components/dashboard/operations-dashboard-error";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => cleanup());

function renderError(error: ApiError) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <OperationsDashboardError error={error} />
    </NextIntlClientProvider>,
  );
}

describe("OperationsDashboardError", () => {
  it("maps 403 to forbidden banner", () => {
    renderError(new ApiError("Sin alcance", 403, { code: "GUARD_PERMISSION_DENIED" }));
    expect(screen.getByText(es.shared.errorBanner.forbidden)).toBeInTheDocument();
    expect(screen.getByText("Sin alcance")).toBeInTheDocument();
  });

  it("maps 404 to missing banner", () => {
    renderError(new ApiError("Año no encontrado", 404, { code: "ADMIN_ECCLESIASTICAL_YEAR_NOT_FOUND" }));
    expect(screen.getByText(es.shared.errorBanner.missing)).toBeInTheDocument();
  });

  it("maps 429 to rate limited banner", () => {
    renderError(new ApiError("Demasiadas solicitudes", 429, null));
    expect(screen.getByText(es.shared.errorBanner.rateLimited)).toBeInTheDocument();
  });

  it("maps 401 to auth state with login link", () => {
    renderError(new ApiError("No autorizado", 401, null));
    expect(screen.getByText(es.dashboardHub.operations.errors.authTitle)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: es.dashboardHub.operations.errors.goToLogin })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("maps 400 and 500 to explicit error panels", () => {
    renderError(new ApiError("Periodo inválido", 400, null));
    expect(screen.getByText(es.dashboardHub.operations.errors.badRequestTitle)).toBeInTheDocument();

    cleanup();

    renderError(new ApiError("Fallo interno", 500, null));
    expect(screen.getByText(es.dashboardHub.operations.errors.serverTitle)).toBeInTheDocument();
  });
});
