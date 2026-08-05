import { MonthlyReport } from "@/components/reports/monthly-report/monthly-report";
import { createExampleMonthlyReportData } from "@/components/reports/monthly-report/monthly-report.types";
import { requireAdminUser } from "@/lib/auth/session";

interface MonthlyReportPreviewPageProps {
  searchParams: Promise<{ example?: string | string[] }>;
}

export function shouldUseMonthlyReportExample(
  value: string | string[] | undefined,
) {
  return value === "1";
}

/**
 * Standalone route so browser printing contains only the two-page document,
 * never the dashboard navigation or its controls.
 */
export default async function MonthlyReportPreviewPage({
  searchParams,
}: MonthlyReportPreviewPageProps) {
  await requireAdminUser();
  const { example } = await searchParams;

  return (
    <MonthlyReport
      initialData={
        shouldUseMonthlyReportExample(example)
          ? createExampleMonthlyReportData()
          : undefined
      }
    />
  );
}
