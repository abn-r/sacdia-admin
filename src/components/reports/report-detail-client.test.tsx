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
  refreshMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  generateReportMock: vi.fn(),
  regenerateReportMock: vi.fn(),
  submitReportMock: vi.fn(),
  triggerDownloadMock: vi.fn(),
  refreshMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("@/lib/format-locale", () => ({
  useFormatDateTime: () => (value: string) => value,
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ReportDetailClient PDF actions", () => {
  it("uses generate for drafts", async () => {
    const generated = { ...baseReport, status: "generated" as const };
    generateReportMock.mockResolvedValueOnce(generated);

    render(<ReportDetailClient report={baseReport} />);
    fireEvent.click(screen.getByRole("button", { name: "detail.actionGenerate" }));

    await waitFor(() => expect(generateReportMock).toHaveBeenCalledWith(baseReport.report_id));
    expect(regenerateReportMock).not.toHaveBeenCalled();
  });

  it("uses regenerate for generated reports and keeps the download action", async () => {
    const generated = { ...baseReport, status: "generated" as const };
    regenerateReportMock.mockResolvedValueOnce(generated);

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
