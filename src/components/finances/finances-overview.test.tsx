import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/es.json";
import type { FinanceOverview } from "@/lib/api/finances";
import { FinancesOverview, calendarYearOf } from "./finances-overview";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/dashboard/finances/overview",
  useSearchParams: () => new URLSearchParams(),
}));

const mockOverview = vi.fn();
vi.mock("@/lib/api/finances", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/finances")>();
  return { ...actual, getFinanceOverview: (...args: unknown[]) => mockOverview(...args) };
});

const DATA: FinanceOverview = {
  period: "2026",
  data: [
    {
      club_id: 5,
      club_name: "Club Aguilas",
      local_field: { local_field_id: 2, name: "Campo Norte" },
      income: 1000,
      expenses: 400,
      net: 600,
      balance: 2600,
      movements: 9,
      months_without_movements: 2,
      missed_months: [2, 5, 7],
      last_movement_at: "2026-04-10T00:00:00.000Z",
    },
    {
      club_id: 6,
      club_name: "Club Halcones",
      local_field: null,
      income: 0,
      expenses: 0,
      net: 0,
      balance: 0,
      movements: 0,
      months_without_movements: 0,
      missed_months: [],
      last_movement_at: null,
    },
  ],
  totals: { income: 1000, expenses: 400, net: 600, balance: 2600, movements: 9 },
  meta: { page: 1, limit: 100, total: 250, totalPages: 3 },
};

const YEARS = [
  { ecclesiastical_year_id: 3, name: "2024", start_date: "2024-01-01" },
  { ecclesiastical_year_id: 1, name: "2026", start_date: "2026-01-01" },
  { ecclesiastical_year_id: 2, name: "2025", start_date: "2025-01-01" },
  { ecclesiastical_year_id: 4, name: "2023", start_date: "2023-01-01" },
  { ecclesiastical_year_id: 5, name: "2022", start_date: "2022-01-01" },
  { ecclesiastical_year_id: 6, name: "2021", start_date: "2021-01-01" },
  { ecclesiastical_year_id: 7, name: "2020", start_date: "2020-01-01" },
  { ecclesiastical_year_id: 8, name: "2027", start_date: "2027-01-01" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockOverview.mockResolvedValue(DATA);
});
afterEach(cleanup);

function renderOverview(
  props: Partial<React.ComponentProps<typeof FinancesOverview>> = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <FinancesOverview
          localFields={[
            { local_field_id: 2, name: "Campo Norte" },
            { local_field_id: 3, name: "Campo Sur" },
          ] as never}
          showLocalFieldFilter
          years={YEARS}
          activeYearId={1}
          {...props}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("calendarYearOf", () => {
  it("reads the year from the name, then from the start date", () => {
    expect(calendarYearOf({ ecclesiastical_year_id: 1, name: "Año 2026" })).toBe(2026);
    expect(calendarYearOf({ ecclesiastical_year_id: 1, name: "Actual", start_date: "2025-07-01" })).toBe(2025);
  });
});

describe("FinancesOverview", () => {
  it("requests the active year with limit 100 and renders totals and rows", async () => {
    renderOverview();

    await screen.findByText("Club Aguilas");
    expect(mockOverview).toHaveBeenCalledWith({
      localFieldId: undefined,
      year: 2026,
      month: undefined,
      page: 1,
      limit: 100,
    });

    const totals = screen.getByRole("list", { name: "Totales del consolidado" });
    expect(within(totals).getByText("+$1,000.00")).toBeInTheDocument();
    expect(within(totals).getByText("$2,600.00")).toBeInTheDocument();
    expect(within(totals).getByText("9")).toBeInTheDocument();

    expect(screen.getByText("Campo Norte", { selector: "td" })).toBeInTheDocument();
    expect(screen.getByText("2 meses")).toBeInTheDocument();
    expect(screen.getByText("Al día")).toBeInTheDocument();
    expect(screen.getByText("Sin movimientos", { selector: "td" })).toBeInTheDocument();
  });

  it("hides the local field column at narrow widths like the club-enrollments queue", async () => {
    renderOverview();

    await screen.findByText("Club Aguilas");
    const header = screen.getByRole("columnheader", { name: "Campo local" });
    expect(header.className).toContain("md:max-xl:hidden");
  });

  it("limits the year list to next, active and 4 previous, ordered by date", async () => {
    renderOverview();
    await screen.findByText("Club Aguilas");

    const select = screen.getByLabelText("Año") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.text)).toEqual([
      "2027",
      "2026",
      "2025",
      "2024",
      "2023",
      "2022",
    ]);
    expect(select.value).toBe("1");
  });

  it("sends local field, year and month filters and resets to page 1", async () => {
    renderOverview();
    await screen.findByText("Club Aguilas");

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    await waitFor(() => expect(mockOverview).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));

    fireEvent.change(screen.getByLabelText("Campo local"), { target: { value: "3" } });
    await waitFor(() =>
      expect(mockOverview).toHaveBeenLastCalledWith({
        localFieldId: 3,
        year: 2026,
        month: undefined,
        page: 1,
        limit: 100,
      }),
    );

    fireEvent.change(screen.getByLabelText("Mes"), { target: { value: "4" } });
    await waitFor(() => expect(mockOverview).toHaveBeenLastCalledWith(expect.objectContaining({ month: 4, localFieldId: 3 })));

    fireEvent.change(screen.getByLabelText("Año"), { target: { value: "2" } });
    await waitFor(() => expect(mockOverview).toHaveBeenLastCalledWith(expect.objectContaining({ year: 2025 })));
  });

  it("does not offer the local field filter to a single-field actor", async () => {
    renderOverview({ showLocalFieldFilter: false });

    await screen.findByText("Club Aguilas");
    expect(screen.queryByLabelText("Campo local")).not.toBeInTheDocument();
  });

  it("paginates with the server meta", async () => {
    renderOverview();
    await screen.findByText("Club Aguilas");

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));

    await waitFor(() =>
      expect(mockOverview).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, limit: 100 }),
      ),
    );
  });

  it("opens the club finances when a row is clicked", async () => {
    renderOverview();

    const row = await screen.findByTestId("finances-overview-row-5");
    fireEvent.click(row);

    expect(push).toHaveBeenCalledWith("/dashboard/finances?club=5");
  });

  it("shows an error with retry instead of an empty table", async () => {
    mockOverview.mockRejectedValueOnce(new Error("boom"));
    renderOverview();

    expect(await screen.findByText("No se pudo cargar el consolidado de finanzas.")).toBeInTheDocument();
    expect(screen.queryByText("Sin clubes para mostrar")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    await screen.findByText("Club Aguilas");
  });

  it("shows the empty state when no club matches", async () => {
    mockOverview.mockResolvedValue({ ...DATA, data: [], meta: { ...DATA.meta, total: 0, totalPages: 1 } });
    renderOverview();

    expect(await screen.findByText("Sin clubes para mostrar")).toBeInTheDocument();
  });
});
