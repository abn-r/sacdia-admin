import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import enMessages from "../../../messages/en.json";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { AnnualRankingLeaderboardRow } from "@/lib/api/annual-rankings";
import type { LocalField } from "@/lib/api/geography";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const mockRecalculate = vi.fn();
const mockList = vi.fn<(...args: unknown[]) => Promise<unknown>>();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/annual-folders/rankings",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/hooks/use-remembered-scope", () => ({
  useRememberedScope: () => [null, vi.fn()] as const,
}));
vi.mock("@/lib/api/annual-folders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/annual-folders")>()),
  recalculateRankings: (...args: unknown[]) => mockRecalculate(...args),
}));
vi.mock("@/lib/api/annual-rankings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/annual-rankings")>()),
  listAnnualRankingsFromClient: (...args: unknown[]) => mockList(...args),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

import { toast } from "sonner";
import { AnnualProgressClientPage } from "./annual-progress-client-page";

const CLUB_TYPES: ClubType[] = [
  { club_type_id: 1, name: "Aventureros" },
  { club_type_id: 2, name: "Conquistadores" },
];
const YEARS: EcclesiasticalYear[] = [
  { ecclesiastical_year_id: 1, name: "2026", start_date: "2026-01-01", end_date: "2026-12-31", active: true },
];
const FIELDS: LocalField[] = [{ local_field_id: 10, name: "Centro Veracruz", union_id: 1, active: true }];

const tier = (name: string, points: number | null) => ({
  name,
  slug: name.toLowerCase(),
  from_points: 0,
  to_points: 0,
  points_to_reach: points,
});

const row = (over: Partial<AnnualRankingLeaderboardRow>): AnnualRankingLeaderboardRow => ({
  rank_position: 1,
  club_enrollment_id: "e1",
  club_section_id: 7,
  club_id: 1,
  club_name: "Club Orión",
  club_type_id: 2,
  ecclesiastical_year_id: 1,
  local_field_id: 10,
  current_points: 2640,
  max_points: 3000,
  progress_percentage: 88,
  current_tier: tier("Excelencia", null),
  next_tier: null,
  axes: [],
  components: [],
  ...over,
});

const ROWS = [
  row({ club_enrollment_id: "e2", club_name: "Club Horizonte", club_section_id: 9, current_points: 840, progress_percentage: 28, current_tier: null, next_tier: tier("Mérito", 960) }),
  row({}),
];

function renderPage(over: Partial<React.ComponentProps<typeof AnnualProgressClientPage>> = {}, locale: "es" | "en" = "es") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? messages : enMessages}>
      <AnnualProgressClientPage
        initialRows={ROWS}
        clubTypes={CLUB_TYPES}
        ecclesiasticalYears={YEARS}
        localFields={FIELDS}
        initialClubTypeId={2}
        initialYearId={1}
        initialLocalFieldId={10}
        {...over}
      />
    </NextIntlClientProvider>,
  );
}

describe("AnnualProgressClientPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(ROWS);
  });
  afterEach(cleanup);

  it("is called «Progreso anual» and never shows positions", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Progreso anual" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /posición|#/i })).toBeNull();
    expect(screen.queryByText(/ranking|clasificaci|posici/i)).toBeNull();
    expect(mockList).not.toHaveBeenCalled();
  });

  it("sorts by progress and says the recognition reached or what is missing", () => {
    renderPage();

    const table = screen.getAllByRole("table")[0]!;
    const names = within(table)
      .getAllByRole("link")
      .map((a) => a.textContent)
      .filter((text) => text?.startsWith("Club"));
    expect(names).toEqual(["Club Orión", "Club Horizonte"]);
    expect(within(table).getByText("Excelencia")).toBeInTheDocument();
    expect(within(table).getByText("Faltan 960 pts para Mérito")).toBeInTheDocument();
  });

  it("links each club to the breakdown of its section", () => {
    renderPage();

    expect(screen.getAllByRole("link", { name: "Club Orión" })[0]).toHaveAttribute(
      "href",
      "/dashboard/annual-folders/rankings/7/breakdown?year_id=1",
    );
  });

  it("chooses the club type with a segmented control and reloads", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("radio", { name: "Aventureros" }));

    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith({ clubTypeId: 1, ecclesiasticalYearId: 1, localFieldId: 10 }),
    );
  });

  it("warns that recalculating affects the whole year before doing it", async () => {
    mockRecalculate.mockResolvedValue({ data: { queued: true } });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Recalcular…" }));
    expect(await screen.findByText(/no solo para lo que ves filtrado/)).toBeInTheDocument();
    expect(mockRecalculate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Recalcular 2026" }));
    await waitFor(() => expect(mockRecalculate).toHaveBeenCalledWith(1));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("shows the error inside the table frame, never an empty list", () => {
    renderPage({ initialRows: [], initialError: { kind: "forbidden" } });

    expect(screen.getByText("Acceso restringido")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Club" })).toBeInTheDocument();
    expect(screen.queryByText("Sin progreso calculado")).toBeNull();
  });

  it("keeps the rows and warns when a reload fails", async () => {
    renderPage();
    mockList.mockRejectedValueOnce(new TypeError("offline"));

    fireEvent.click(screen.getByRole("radio", { name: "Aventureros" }));
    fireEvent.click(screen.getByRole("radio", { name: "Conquistadores" }));

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText("Club Orión").length).toBeGreaterThan(0);
  });

  it("uses the panel language", () => {
    renderPage({}, "en");

    expect(screen.getByRole("heading", { level: 1, name: "Annual progress" })).toBeInTheDocument();
    expect(screen.getAllByText("960 pts to reach Mérito").length).toBeGreaterThan(0);
  });
});
