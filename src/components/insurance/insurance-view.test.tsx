import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { InsuranceView } from "./insurance-view";

let mockCanCreate = false;
vi.mock("@/lib/auth/screen-catalog/use-screen-access", () => ({
  useScreenAccess: () => ({
    canCapability: (_screen: string, capability: string) =>
      mockCanCreate && (capability === "create" || capability === "update"),
    canViewScreen: () => true,
  }),
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("@/lib/api/client", () => ({
  apiRequestFromClient: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

afterEach(() => {
  cleanup();
  mockCanCreate = false;
});

describe("InsuranceView filters", () => {
  it("gives every filter an accessible name", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <InsuranceView
          clubs={[]}
          sectionsByClub={{}}
          localFields={[]}
          territoryScope={{ level: "all" }}
          initialMembers={[]}
          initialClubId={null}
          initialSectionId={null}
          initialLocalFieldId="all"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("combobox", { name: "Campo local" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Club" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sección" })).toBeInTheDocument();
  });
});

describe("InsuranceView payment orders block", () => {
  const MEMBER = {
    user_id: "u1",
    name: "Ana",
    paternal_last_name: "García",
    maternal_last_name: null,
    user_image: null,
    insurance: null,
  };

  function renderView(paymentOrdersLocalFieldIds: number[]) {
    mockCanCreate = true;
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <InsuranceView
          clubs={[{ club_id: 1, name: "Club A", local_field_id: 4 }]}
          sectionsByClub={{ 1: [{ club_section_id: 9, club_type_id: 2, name: "Conquistadores" }] }}
          localFields={[]}
          territoryScope={{ level: "all" }}
          initialMembers={[MEMBER]}
          initialClubId={1}
          initialSectionId={9}
          initialLocalFieldId={4}
          paymentOrdersLocalFieldIds={paymentOrdersLocalFieldIds}
        />
      </NextIntlClientProvider>,
    );
  }

  it("hides Registrar seguro and points to Órdenes de pago when the local field is on v1", async () => {
    renderView([4]);

    expect(screen.getByText(messages.insurance.view.legacy_disabled_title)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: messages.insurance.view.legacy_disabled_link })).toHaveAttribute(
      "href",
      "/dashboard/payment-orders",
    );
    expect(screen.queryByRole("menuitem", { name: /registrar seguro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /acciones de/i })).not.toBeInTheDocument();
  });

  it("keeps Registrar seguro when the local field is not on v1", async () => {
    renderView([7]);

    expect(screen.queryByText(messages.insurance.view.legacy_disabled_title)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /acciones de/i }));
    expect(await screen.findByRole("menuitem", { name: /registrar seguro/i })).toBeInTheDocument();
  });
});
