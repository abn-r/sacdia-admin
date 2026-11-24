import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

let query = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/clubs/7",
  useSearchParams: () => new URLSearchParams(query),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode; prefetch?: boolean }) => (
    <a href={href}>
      {children}
    </a>
  ),
}));

import messages from "../../../../messages/es.json";
import { ClubDetailView } from "./club-detail-view";
import { buildClubDetail } from "./detail-test-data";

function renderView(props: Partial<React.ComponentProps<typeof ClubDetailView>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ClubDetailView
        data={buildClubDetail()}
        annualReports={[]}
        quarterlyReports={[]}
        yearLabels={{ current: "2026", next: "2027" }}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  query = "";
});

describe("ClubDetailView", () => {
  it("puts the key facts in one header line and drops the stat cards", () => {
    renderView({ canEdit: true });

    expect(screen.getByRole("heading", { level: 1, name: "Club Orión" })).toBeInTheDocument();
    const header = screen.getByRole("heading", { level: 1 }).parentElement as HTMLElement;
    const terms = within(header).getAllByRole("term");
    expect(terms.map((term) => term.textContent)).toEqual(["Miembros", "Secciones", "Blanco de almas"]);
    expect(terms[0]?.nextElementSibling).toHaveTextContent("6");
    expect(screen.getByText("2 de 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Editar/ })).toHaveAttribute("href", "/dashboard/clubs/7/edit");
  });

  it("offers general, sections, members, reports and history with counts", () => {
    renderView();

    const tabs = within(screen.getByRole("tablist")).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "General",
      "Secciones2",
      "Miembros6",
      "Informes",
      "Historial",
    ]);
  });

  it("hides the reports tab from people who cannot see periodic reports", () => {
    renderView({ canViewPeriodicReports: false });

    expect(screen.queryByRole("tab", { name: "Informes" })).not.toBeInTheDocument();
  });

  it("renders the members tab from ?tab=members", () => {
    query = "tab=members";
    renderView();

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Miembros/ })).toHaveAttribute("aria-selected", "true");
  });
});
