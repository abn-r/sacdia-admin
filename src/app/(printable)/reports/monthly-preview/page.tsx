import { MonthlyReport } from "@/components/reports/monthly-report/monthly-report";
import { requireAdminUser } from "@/lib/auth/session";

/**
 * Standalone route so browser printing contains only the two-page document,
 * never the dashboard navigation or its controls.
 */
export default async function MonthlyReportPreviewPage() {
  await requireAdminUser();

  return <MonthlyReport />;
}
