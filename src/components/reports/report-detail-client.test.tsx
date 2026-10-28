import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReportDetailClient } from "./report-detail-client";
import type { MonthlyReport } from "@/lib/api/monthly-reports";

const {
  generateReportMock,
  regenerateReportMock,
  submitReportMock,
  triggerDownloadMock,
  waitForReportMock,
  refreshMock,
  toastSuccessMock,
  toastErrorMock,
  toastLoadingMock,
  toastDismissMock,
} = vi.hoisted(() => ({
  generateReportMock: vi.fn(),
  regenerateReportMock: vi.fn(),
  submitReportMock: vi.fn(),
  triggerDownloadMock: vi.fn(),
  waitForReportMock: vi.fn(),
  refreshMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastLoadingMock: vi.fn(),
  toastDismissMock: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
    loading: toastLoadingMock,
    dismiss: toastDismissMock,
  },
}));

vi.mock("@/lib/format-locale", () => ({
  useFormatDateTime: () => (value: string) => value,
  useFormatNumber: () => (value: number) => String(value),
}));

vi.mock("@/lib/api/monthly-reports", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/monthly-reports")>(
    "@/lib/api/monthly-reports",
  );
  return {
    ...actual,
    generateReport: generateReportMock,
    regenerateReport: regenerateReportMock,
    submitReport: submitReportMock,
    triggerMonthlyReportPdfDownload: triggerDownloadMock,
    waitForMonthlyReport: waitForReportMock,
  };
});

vi.mock("@/components/reports/manual-data-form", () => ({
  ManualDataForm: () => null,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/status-badge", () => ({
  StatusBadge: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

vi.mock("lucide-react", () => ({
  Download: () => <span aria-hidden="true" />,
  ExternalLink: () => <span aria-hidden="true" />,
  Loader2: () => <span aria-hidden="true" />,
  Send: () => <span aria-hidden="true" />,
  Zap: () => <span aria-hidden="true" />,
}));

const baseReport: MonthlyReport = {
  report_id: "28f20ec9-4f10-4827-b4cd-29ccbc423c34",
  enrollment_id: "f7568929-20b6-427a-9b75-08d4a200cdd9",
  month: 7,
  year: 2026,
  status: "draft",
  auto_data: null,
  manual_data: null,
  snapshot_data: null,
};

// Real shape returned by GET /monthly-reports/:id (nested snapshot_data).
const nestedSnapshot = {
  member_count: 14,
  meeting_days: "Sábado",
  directiva: [
    { user_id: "u-1", name: "Ana Pérez", role: "director" },
    { user_id: "u-2", name: "Luis Gómez", role: "subdirector" },
  ],
  honors: {
    started: 3,
    completed: 1,
    details: [
      {
        honor_name: "Nudos",
        user_name: "Marta Ruiz",
        validated: true,
        date: "2026-07-10",
      },
    ],
  },
  activities: {
    total: 2,
    list: [
      { activity_id: 7, name: "Caminata", type: "Campamento", date: "2026-07-05" },
      { activity_id: 8, name: "Servicio comunitario", type: "Servicio", date: "2026-07-19" },
    ],
  },
  finances: {
    income: 500,
    expenses: 120,
    balance: 380,
    transactions: 6,
    total_balance: 2079,
  },
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ReportDetailClient PDF actions", () => {
  it("uses generate for drafts", async () => {
    const generated = { ...baseReport, status: "generated" as const };
    generateReportMock.mockResolvedValueOnce({ queued: false, report: generated });

    render(<ReportDetailClient report={baseReport} />);
    fireEvent.click(screen.getByRole("button", { name: "detail.actionGenerate" }));

    await waitFor(() => expect(generateReportMock).toHaveBeenCalledWith(baseReport.report_id));
    expect(regenerateReportMock).not.toHaveBeenCalled();
  });

  it("uses regenerate for generated reports and keeps the download action", async () => {
    const generated = { ...baseReport, status: "generated" as const };
    regenerateReportMock.mockResolvedValueOnce({ queued: false, report: generated });

    render(<ReportDetailClient report={generated} />);
    fireEvent.click(screen.getByRole("button", { name: "detail.actionRegenerate" }));

    await waitFor(() =>
      expect(regenerateReportMock).toHaveBeenCalledWith(generated.report_id),
    );
    expect(generateReportMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "detail.actionDownloadPdf" })).toBeInTheDocument();
  });

  it("does not expose generate or regenerate for submitted reports", () => {
    const submitted = { ...baseReport, status: "submitted" as const };

    render(<ReportDetailClient report={submitted} />);

    expect(screen.queryByRole("button", { name: "detail.actionGenerate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "detail.actionRegenerate" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "detail.actionDownloadPdf" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "detail.actionViewPdf" })).toBeInTheDocument();
  });
});

describe("ReportDetailClient nested snapshot rendering", () => {
  const generatedReport: MonthlyReport = {
    ...baseReport,
    status: "generated",
    generated_at: "2026-07-31T12:00:00.000Z",
    snapshot_data: nestedSnapshot,
  };

  function valueOf(label: string): string {
    const dts = screen.getAllByText(label);
    // Auto tab and snapshot tab render the same rows (tabs are mocked inline).
    return dts[0].nextElementSibling?.textContent ?? "";
  }

  it("maps the nested snapshot into the snapshot panel and the auto-data tab", () => {
    render(<ReportDetailClient report={generatedReport} />);

    // Without auto_data the auto tab shows the frozen snapshot, not the empty state.
    expect(screen.queryByText("detail.noAutoData")).not.toBeInTheDocument();
    // Both panels render the same values.
    expect(screen.getAllByText("detail.fieldTotalMembers")).toHaveLength(2);

    expect(valueOf("detail.fieldTotalMembers")).toBe("14");
    expect(valueOf("detail.fieldActivities")).toBe("2");
    expect(valueOf("detail.fieldHonorsStarted")).toBe("3");
    expect(valueOf("detail.fieldHonorsCompleted")).toBe("1");
    expect(valueOf("detail.fieldIncome")).toBe("500");
    expect(valueOf("detail.fieldExpenses")).toBe("120");
    expect(valueOf("detail.fieldBalance")).toBe("380");
    expect(valueOf("detail.fieldTotalBalance")).toBe("2079");
    expect(valueOf("detail.fieldTransactions")).toBe("6");
    expect(valueOf("detail.fieldMeetingDays")).toBe("Sábado");
  });

  it("lists directiva, activities and honors details", () => {
    render(<ReportDetailClient report={generatedReport} />);

    expect(screen.getAllByText("Ana Pérez").length).toBeGreaterThan(0);
    expect(screen.getAllByText("director").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Caminata").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Campamento · 2026-07-05").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nudos — Marta Ruiz").length).toBeGreaterThan(0);
    expect(screen.getAllByText("detail.honorValidated · 2026-07-10").length).toBeGreaterThan(0);
  });

  it("falls back to dashes for missing keys instead of crashing", () => {
    render(
      <ReportDetailClient
        report={{ ...generatedReport, snapshot_data: { member_count: 5, honors: null } }}
      />,
    );

    expect(valueOf("detail.fieldTotalMembers")).toBe("5");
    expect(valueOf("detail.fieldHonorsStarted")).toBe("—");
    expect(valueOf("detail.fieldIncome")).toBe("—");
    expect(valueOf("detail.fieldMeetingDays")).toBe("—");
  });

  it("shows the empty state when there is neither auto_data nor snapshot", () => {
    render(<ReportDetailClient report={baseReport} />);

    expect(screen.getByText("detail.noAutoData")).toBeInTheDocument();
  });
});

describe("ReportDetailClient queued (202) jobs", () => {
  const generatedReport: MonthlyReport = {
    ...baseReport,
    status: "generated",
    pdf_generated_at: "2026-07-31T12:00:00.000Z",
    snapshot_data: nestedSnapshot,
  };
  const queued = {
    queued: true as const,
    reportId: generatedReport.report_id,
    status: "generated",
  };

  it("shows a pending toast, polls until pdf_generated_at changes and toasts success", async () => {
    const updated = { ...generatedReport, pdf_generated_at: "2026-08-01T09:00:00.000Z" };
    regenerateReportMock.mockResolvedValueOnce(queued);
    waitForReportMock.mockResolvedValueOnce(updated);

    render(<ReportDetailClient report={generatedReport} />);
    fireEvent.click(screen.getByRole("button", { name: "detail.actionRegenerate" }));

    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());

    expect(toastLoadingMock).toHaveBeenCalledWith(
      "toasts.report_regenerating",
      expect.objectContaining({ id: expect.any(String) }),
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "toasts.report_regenerated",
      expect.objectContaining({ id: expect.any(String) }),
    );
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalled();

    // The poll predicate only resolves once pdf_generated_at differs.
    const isDone = waitForReportMock.mock.calls[0][1] as (r: MonthlyReport) => boolean;
    expect(isDone(generatedReport)).toBe(false);
    expect(isDone(updated)).toBe(true);
  });

  it("toasts an informative message when polling times out", async () => {
    regenerateReportMock.mockResolvedValueOnce(queued);
    waitForReportMock.mockResolvedValueOnce(null);

    render(<ReportDetailClient report={generatedReport} />);
    fireEvent.click(screen.getByRole("button", { name: "detail.actionRegenerate" }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());

    expect(toastErrorMock).toHaveBeenCalledWith(
      "errors.job_timeout",
      expect.objectContaining({ id: expect.any(String) }),
    );
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("polls generate until the status leaves draft", async () => {
    const generated = { ...baseReport, status: "generated" as const };
    generateReportMock.mockResolvedValueOnce({ ...queued, status: "draft" });
    waitForReportMock.mockResolvedValueOnce(generated);

    render(<ReportDetailClient report={baseReport} />);
    fireEvent.click(screen.getByRole("button", { name: "detail.actionGenerate" }));

    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());

    expect(toastLoadingMock).toHaveBeenCalledWith(
      "toasts.report_generating",
      expect.anything(),
    );
    const isDone = waitForReportMock.mock.calls[0][1] as (r: MonthlyReport) => boolean;
    expect(isDone(baseReport)).toBe(false);
    expect(isDone(generated)).toBe(true);
  });
});
