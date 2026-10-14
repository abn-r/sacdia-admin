import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { InsuranceView } from "./insurance-view";

vi.mock("@/lib/auth/screen-catalog/use-screen-access", () => ({
  useScreenAccess: () => ({ canCapability: () => false }),
}));

vi.mock("@/lib/api/client", () => ({
  apiRequestFromClient: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

afterEach(() => {
  cleanup();
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
