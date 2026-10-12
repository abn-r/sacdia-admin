import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { HonorInstructorSummary } from "@/lib/api/honor-instructor-proposals";

/** Name plus the same kind badge used for certificate-import rows (doc §6.1). */
export function ProposalInstructorCell({
  instructor,
}: {
  instructor: HonorInstructorSummary | null;
}) {
  const t = useTranslations("honor_instructor_proposals.instructor");

  if (!instructor) {
    return <span className="text-sm text-muted-foreground">{t("none")}</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-sm font-medium">{instructor.display_name ?? t("unnamed")}</span>
      <Badge variant="outline">
        {instructor.kind === "USER" ? t("kindUser") : t("kindExternal")}
      </Badge>
    </div>
  );
}
