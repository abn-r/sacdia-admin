import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import enMessages from "../../../messages/en.json";
import type { AwardCategory } from "@/lib/api/annual-folders";
import type { ClubType } from "@/lib/api/catalogs";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/api/annual-folders", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/annual-folders")>();
  return {
    ...original,
    getAwardCategoriesFromClient: vi.fn().mockResolvedValue([]),
    deleteAwardCategory: vi.fn(),
  };
});
vi.mock("@/components/annual-folders/award-category-form-dialog", () => ({
  AwardCategoryFormDialog: () => null,
}));

import { AwardCategoriesClientPage } from "@/components/annual-folders/award-categories-client-page";

const CLUB_TYPES: ClubType[] = [{ club_type_id: 2, name: "Conquistadores" }];

const CATEGORY: AwardCategory = {
  award_category_id: "c1",
  name: "Oro",
  description: null,
  club_type_id: null,
  min_points: 100,
  max_points: null,
  icon: null,
  order: 1,
  active: true,
  scope: "club",
  min_composite_pct: 80,
  max_composite_pct: null,
  is_legacy: false,
  tier: "GOLD",
};

function renderPage(locale: "es" | "en", categories: AwardCategory[] = [CATEGORY]) {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? messages : enMessages}>
      <AwardCategoriesClientPage initialCategories={categories} clubTypes={CLUB_TYPES} />
    </NextIntlClientProvider>,
  );
}

describe("AwardCategoriesClientPage", () => {
  afterEach(cleanup);

  it("renders the column headers from the Spanish messages", () => {
    renderPage("es");

    for (const name of ["Orden", "Nombre", "Tipo club", "Pts Min", "Pts Max", "% Min", "% Max", "Nivel", "Estado"]) {
      expect(screen.getByRole("columnheader", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.getAllByText("Todos los tipos").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Oro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sin límite").length).toBeGreaterThan(0);
  });

  it("renders the column headers, scope tabs and tier in the active locale", () => {
    renderPage("en");

    for (const name of ["Order", "Name", "Club type", "Min pts", "Max pts", "Min %", "Max %", "Tier", "Status"]) {
      expect(screen.getByRole("columnheader", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.queryByRole("columnheader", { name: /Nombre/ })).toBeNull();
    expect(screen.getByRole("tab", { name: "Section" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Active" })).toBeInTheDocument();
    expect(screen.getAllByText("Gold").length).toBeGreaterThan(0);
    expect(screen.getAllByText("All types").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /New category/ })).toBeInTheDocument();
  });

  it("builds the empty state sentence from the locale", () => {
    renderPage("en", []);

    expect(screen.getByText("No active club categories")).toBeInTheDocument();
  });
});
