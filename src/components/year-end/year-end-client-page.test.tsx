import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import { YearEndClientPage } from "@/components/year-end/year-end-client-page";
import type { EcclesiasticalYear } from "@/lib/api/catalogs";
import messages from "../../../messages/es.json";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { getYearEndPreview, closeYear, apiRequestFromClient, permissions, capabilities } = vi.hoisted(() => ({
  getYearEndPreview: vi.fn(),
  closeYear: vi.fn(),
  apiRequestFromClient: vi.fn(),
  permissions: new Set<string>(),
  capabilities: new Set<string>(),
}));

vi.mock("@/lib/api/year-end", () => ({ getYearEndPreview, closeYear }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiRequestFromClient,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/year-end",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/auth/use-permissions", () => ({
  usePermissions: () => ({
    can: (p: string) => permissions.has(p),
    canAny: () => false,
    canAll: () => false,
    isSuperAdmin: false,
    hasCapability: () => false,
    permissions,
    capabilities,
    roles: new Set<string>(["admin"]),
  }),
}));

const tr = createTranslator({
  locale: "es",
  messages,
  namespace: "evaluation.certYear.yearEnd",
});

const years = [
  { ecclesiastical_year_id: 2, name: "2027", active: false },
  { ecclesiastical_year_id: 1, name: "2026", active: true },
] as EcclesiasticalYear[];

function renderPage(list: EcclesiasticalYear[] = years) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <YearEndClientPage ecclesiasticalYears={list} />
    </NextIntlClientProvider>,
  );
}

const detail = (id: string, clubName: string, clubType: string) => ({
  club_enrollment_id: id,
  clubName,
  clubType,
  currentStatus: "active",
});

beforeEach(() => {
  permissions.clear();
  capabilities.clear();
  permissions.add("ecclesiastical_years:update");
  capabilities.add("catalogs.edit");
  getYearEndPreview.mockResolvedValue({
    yearId: 1,
    yearActive: true,
    enrollmentsToClose: 3,
    foldersToClose: 2,
    reportsToGenerate: 1,
    enrollmentDetails: [
      detail("e1", "Club Orión", "Conquistadores"),
      detail("e2", "Club Orión", "Aventureros"),
      detail("e3", "Club Faro", "Guías Mayores"),
    ],
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("YearEndClientPage", () => {
  it("loads the impact on open, with no preview button", async () => {
    renderPage();
    expect(await screen.findByText("Club Faro")).toBeInTheDocument();
    expect(getYearEndPreview).toHaveBeenCalledWith(1);
    expect(screen.getByRole("heading", { name: tr("title", { year: "2026" }) })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vista previa" })).toBeNull();
  });

  it("shows the four figures and one row per club", async () => {
    renderPage();
    await screen.findByText("Club Faro");
    const strip = screen.getByRole("list", { name: tr("kpiLabel") });
    expect(within(strip).getByText(tr("kpiEnrollments"))).toBeInTheDocument();
    expect(within(strip).getByText(tr("kpiFolders"))).toBeInTheDocument();
    expect(within(strip).getByText(tr("kpiReports"))).toBeInTheDocument();
    expect(within(strip).getByText(tr("kpiInvestiture"))).toBeInTheDocument();
    const orion = screen.getByText("Club Orión").closest("tr");
    expect(orion).not.toBeNull();
    expect(within(orion as HTMLElement).getByText("Conquistadores, Aventureros")).toBeInTheDocument();
    expect(within(orion as HTMLElement).getByText("2")).toBeInTheDocument();
  });

  it("shows an error with retry instead of an empty table when the impact fails", async () => {
    getYearEndPreview.mockRejectedValueOnce(new Error("down"));
    renderPage();
    expect(await screen.findByText(tr("loadFailedTitle"))).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: messages.shared.kit.errorState.retry }));
    expect(await screen.findByText("Club Faro")).toBeInTheDocument();
    expect(getYearEndPreview).toHaveBeenCalledTimes(2);
  });

  it("requires typing the year before closing", async () => {
    renderPage();
    await screen.findByText("Club Faro");
    fireEvent.click(screen.getByRole("button", { name: tr("closeButton", { year: "2026" }) }));

    const confirm = await screen.findByRole("button", { name: tr("confirmButton", { year: "2026" }) });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(tr("confirmTyped", { year: "2026" })), {
      target: { value: "2026" },
    });
    expect(confirm).toBeEnabled();
    expect(closeYear).not.toHaveBeenCalled();
  });

  it("keeps the dialog open with the error when closing fails", async () => {
    closeYear.mockRejectedValue(new Error("Hay informes sin generar"));
    renderPage();
    await screen.findByText("Club Faro");
    fireEvent.click(screen.getByRole("button", { name: tr("closeButton", { year: "2026" }) }));
    fireEvent.change(await screen.findByLabelText(tr("confirmTyped", { year: "2026" })), {
      target: { value: "2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: tr("confirmButton", { year: "2026" }) }));

    expect(await screen.findByText("Hay informes sin generar")).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("shows the new active year when the closing finishes", async () => {
    closeYear.mockResolvedValue({
      yearId: 1,
      enrollmentsClosed: 3,
      foldersClosed: 2,
      reportsGenerated: 1,
      investiturePendingClosed: 4,
    });
    apiRequestFromClient.mockResolvedValue([
      { ecclesiastical_year_id: 2, name: "2027", active: true },
    ]);
    renderPage();
    await screen.findByText("Club Faro");
    fireEvent.click(screen.getByRole("button", { name: tr("closeButton", { year: "2026" }) }));
    fireEvent.change(await screen.findByLabelText(tr("confirmTyped", { year: "2026" })), {
      target: { value: "2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: tr("confirmButton", { year: "2026" }) }));

    expect(await screen.findByText(tr("doneNewActive", { year: "2027" }))).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: tr("doneTitle", { year: "2026" }) })).toBeInTheDocument();
    await waitFor(() => expect(closeYear).toHaveBeenCalledWith(1));
  });

  it("hides the close action without the year-end permission", async () => {
    permissions.clear();
    capabilities.clear();
    renderPage();
    await screen.findByText("Club Faro");
    expect(screen.queryByRole("button", { name: tr("closeButton", { year: "2026" }) })).toBeNull();
  });

  it("explains when there is no active year", () => {
    renderPage(years.map((year) => ({ ...year, active: false })));
    expect(screen.getByText(messages.year_end.page.noActiveYearTitle)).toBeInTheDocument();
    expect(getYearEndPreview).not.toHaveBeenCalled();
  });
});
