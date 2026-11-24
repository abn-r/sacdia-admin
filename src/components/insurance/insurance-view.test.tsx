import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/es.json";
import type { InsuranceOverviewPerson, SectionInsuranceOverview } from "@/lib/api/insurance";
import { InsuranceView } from "./insurance-view";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/dashboard/insurance",
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("@/lib/auth/screen-catalog/use-screen-access", () => ({
  useScreenAccess: () => ({ canViewScreen: () => true, canCapability: () => true }),
}));

const person = (
  user_id: string,
  name: string,
  status: InsuranceOverviewPerson["status"],
  extra: Partial<InsuranceOverviewPerson> = {},
): InsuranceOverviewPerson => ({
  user_id,
  name,
  picture: null,
  role_label: null,
  is_staff: false,
  status,
  coverage: null,
  active_order: null,
  ...extra,
});

const OVERVIEW: SectionInsuranceOverview = {
  year: { ecclesiastical_year_id: 1, label: "2026", start_date: "2026-01-01", end_date: "2026-12-31" },
  cycle: { insurance_cycle_config_id: 1, unit_cost: "120", purchase_deadline: "2026-11-30", currency: "MXN" },
  counts: { total: 5, covered: 1, in_process: 1, uninsured: 3 },
  free_coverages_count: 2,
  people: [
    person("1", "Zoe Prado", "uninsured"),
    person("2", "Ana Soto", "uninsured"),
    person("3", "Mateo Herrera", "uninsured"),
    person("4", "Lia Cruz", "in_review", {
      active_order: { order_id: 9, folio: "F-0009", status: "in_review", expires_at: null },
    }),
    person("5", "Beto Rey", "covered", {
      coverage: {
        source: "paid_here",
        paid_in_section_name: null,
        paid_in_club_name: null,
        order_folio: "F-0001",
        approved_at: null,
        valid_until: "2026-12-31",
        reassigned_from_name: null,
        reassigned_by_name: null,
        reassigned_at: null,
      },
    }),
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  search = "";
});
afterEach(cleanup);

function renderView(overview = OVERVIEW) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <InsuranceView overview={overview} />
    </NextIntlClientProvider>,
  );
}

describe("InsuranceView", () => {
  it("shows a KpiStrip of 4 instead of 7 cards", () => {
    renderView();

    const strip = screen.getByRole("list", { name: "Resumen de seguros de la sección" });
    expect(within(strip).getAllByRole("listitem")).toHaveLength(4);
    expect(within(strip).getByText("1 de 5")).toBeInTheDocument();
  });

  it("puts year, cost and deadline on one line", () => {
    renderView();

    expect(screen.getByText(/2026 · \$120\.00 por persona · compra hasta el 30\/11\/2026/)).toBeInTheDocument();
  });

  it("defaults to «Sin seguro» and lists only those people, sorted, with no status repeated per row", () => {
    renderView();

    expect(screen.getByRole("tab", { name: /Sin seguro/ })).toHaveAttribute("aria-selected", "true");
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0]!.textContent)).toEqual([
      "Ana Soto",
      "Mateo Herrera",
      "Zoe Prado",
    ]);
    for (const row of rows) expect(within(row).queryByText(messages.insurance.table.status_uninsured)).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Estado" })).not.toBeInTheDocument();
  });

  it("counts every tab", () => {
    renderView();

    expect(screen.getByRole("tab", { name: /Sin seguro/ })).toHaveTextContent("3");
    expect(screen.getByRole("tab", { name: /En proceso/ })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: /Con seguro/ })).toHaveTextContent("1");
  });

  it("«En proceso» marks each person's step and links the folio", async () => {
    search = "tab=in_process";
    renderView();

    expect(screen.getAllByText("En revisión").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "F-0009" })[0]).toHaveAttribute(
      "href",
      "/dashboard/payment-orders?orderId=9",
    );
  });

  it("«Con seguro» shows until when", () => {
    search = "tab=covered";
    renderView();

    expect(screen.getAllByText(/Hasta 31\/12\/2026/).length).toBeGreaterThan(0);
  });

  it("switches tabs through the URL", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("tab", { name: /En proceso/ }));
    expect(replace).toHaveBeenCalledWith("/dashboard/insurance?tab=in_process", { scroll: false });
  });

  it("keeps the two-line mobile list", () => {
    search = "tab=covered";
    renderView();

    const list = screen.getByRole("list", { name: messages.insurance.table.list_label });
    expect(within(list).getByText("Beto Rey")).toBeInTheDocument();
    expect(within(list).getByText(/Pagado en esta sección/)).toBeInTheDocument();
  });

  it("says what is missing instead of rendering an empty tab", () => {
    search = "tab=in_process";
    renderView({ ...OVERVIEW, people: OVERVIEW.people.filter((p) => p.status !== "in_review") });

    expect(screen.getByText("Nada en proceso")).toBeInTheDocument();
  });

  it("explains a section without a cycle", () => {
    renderView({ ...OVERVIEW, cycle: null });

    expect(screen.getByText(messages.insurance.view.no_cycle_title)).toBeInTheDocument();
  });
});
