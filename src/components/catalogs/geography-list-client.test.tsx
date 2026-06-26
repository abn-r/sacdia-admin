import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { GeographyListClient } from "@/components/catalogs/geography-list-client";
import type { GenericCatalogActionState } from "@/lib/generic-catalogs-i18n/actions";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/dashboard/catalogs/geography/unions",
  useSearchParams: () => new URLSearchParams(),
}));

const noopDeleteAction = async (
  _prev: GenericCatalogActionState,
  _data: FormData,
): Promise<GenericCatalogActionState> => ({});

function renderClient(enableScoringConfiguration: boolean) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <GeographyListClient
        i18nNamespace="unions"
        basePath="/dashboard/catalogs/geography/unions"
        pkField="union_id"
        includeAbbreviation
        parentLabel="País"
        parentField="_parent_name"
        fallbackName="esta unión"
        items={[
          {
            union_id: 12,
            name: "Unión Norte",
            abbreviation: "UN",
            _parent_name: "Argentina",
            active: true,
          },
        ]}
        meta={{ page: 1, limit: 20, total: 1, totalPages: 1 }}
        canCreate={false}
        canEdit
        canDelete={false}
        deleteAction={noopDeleteAction}
        enableScoringConfiguration={enableScoringConfiguration}
      />
    </NextIntlClientProvider>,
  );
}

describe("GeographyListClient scoring navigation", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows 'Configurar puntuación' action linking to scoring-categories tab when enabled", () => {
    renderClient(true);

    const scoringLink = screen.getByRole("link", {
      name: /configurar puntuación/i,
    });
    expect(scoringLink).toBeInTheDocument();
    expect(scoringLink).toHaveAttribute(
      "href",
      "/dashboard/catalogs/geography/unions/12?tab=scoring-categories",
    );
  });

  it("hides scoring navigation action when disabled", () => {
    renderClient(false);

    expect(
      screen.queryByRole("link", { name: /configurar puntuación/i }),
    ).not.toBeInTheDocument();
  });
});
