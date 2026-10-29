import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import messages from "../../../../../../../messages/es.json";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    const lookup = (key: string, values?: Record<string, unknown>) => {
      const path = `${namespace}.${key}`.split(".");
      let node: unknown = messages;
      for (const part of path) node = (node as Record<string, unknown>)?.[part];
      if (typeof node !== "string") return path.join(".");
      return node.replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? ""));
    };
    return lookup;
  },
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

vi.mock("@/components/shared/page-header", () => ({
  PageHeader: (props: {
    title: string;
    description?: string;
    breadcrumbs?: Array<{ label: string }>;
  }) => (
    <header>
      <h1>{props.title}</h1>
      <p data-testid="description">{props.description}</p>
      <nav data-testid="crumbs">{props.breadcrumbs?.map((c) => c.label).join(" > ")}</nav>
    </header>
  ),
}));

vi.mock("./_components/section-members-table", () => ({
  SectionMembersTable: () => null,
}));

const getSectionMembersMock = vi.fn();
vi.mock("@/lib/api/section-rankings", () => ({
  getSectionMembers: (...args: unknown[]) => getSectionMembersMock(...args),
}));

const listYearsMock = vi.fn();
vi.mock("@/lib/api/catalogs", () => ({
  getActiveEcclesiasticalYearId: async () => 3,
  listEcclesiasticalYears: () => listYearsMock(),
}));

import SectionMembersPage from "./page";

beforeEach(() => {
  getSectionMembersMock.mockResolvedValue([]);
  listYearsMock.mockResolvedValue([
    { ecclesiastical_year_id: 3, name: "2026", start_date: "2026-01-01", end_date: "2026-12-31", active: true },
  ]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderPage(searchParams: Record<string, string>) {
  render(
    await SectionMembersPage({
      params: Promise.resolve({ sectionId: "1" }),
      searchParams: Promise.resolve(searchParams),
    }),
  );
}

describe("SectionMembersPage header", () => {
  it("shows the club, section and year label instead of ids", async () => {
    await renderPage({ year_id: "3", section_name: "Guías Mayores", club_name: "Club Orión" });

    expect(screen.getByTestId("description")).toHaveTextContent(
      "Club Orión · Guías Mayores · Año 2026 · 0 miembros",
    );
    expect(screen.getByTestId("crumbs")).toHaveTextContent(
      "Clasificación de secciones > Club Orión · Guías Mayores",
    );
    expect(screen.getByTestId("description")).not.toHaveTextContent("#1");
  });

  it("uses the section name from the members when the URL carries no names", async () => {
    getSectionMembersMock.mockResolvedValue([
      { section: { name: "Conquistadores" } },
      { section: { name: "Conquistadores" } },
    ]);

    await renderPage({ year_id: "3" });

    expect(screen.getByTestId("description")).toHaveTextContent(
      "Conquistadores · Año 2026 · 2 miembros",
    );
  });

  it("falls back to a generic label and omits an unknown year", async () => {
    listYearsMock.mockResolvedValue([]);

    await renderPage({ year_id: "3" });

    expect(screen.getByTestId("description")).toHaveTextContent("Sección · 0 miembros");
    expect(screen.getByTestId("description")).not.toHaveTextContent("Año 3");
  });
});
