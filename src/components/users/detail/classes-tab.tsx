import Image from "next/image";
import { GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { formatDateLong } from "@/components/users/detail/helpers";
import {
  getUserClassEnrollments,
  type UserClassEnrollment,
} from "@/lib/api/user-formative-progress";
import {
  buildClubLabelByYear,
  formatEcclesiasticalYearLabel,
  investitureStatusIntent,
  isInvestedStatus,
} from "@/lib/users/formative-status";
import { ApiError } from "@/lib/api/client";
import { resolveClassLogoSrc } from "@/lib/classes/class-logo";

interface UserDetailClassesTabProps {
  userId: string;
  locale: string;
  clubAssignments?: unknown[];
}

function investitureStatusLabelKey(status: string): string {
  return `statusClass.${status}`;
}

function ClassImageCell({
  className,
  assetCode,
}: {
  className?: string | null;
  assetCode?: string | null;
}) {
  const logoSrc = resolveClassLogoSrc(assetCode, className);
  const label = className ?? "";

  if (!logoSrc) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
        <GraduationCap className="size-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center">
      <Image
        src={logoSrc}
        alt={label}
        width={40}
        height={40}
        className="max-h-10 max-w-10 object-contain"
        sizes="40px"
      />
    </div>
  );
}

export async function UserDetailClassesTab({
  userId,
  locale,
  clubAssignments = [],
}: UserDetailClassesTabProps) {
  const t = await getTranslations("users.pages.detail.classesTab");
  const clubByYear = buildClubLabelByYear(clubAssignments);

  let enrollments: UserClassEnrollment[] = [];
  let errorMessage: string | null = null;

  try {
    enrollments = await getUserClassEnrollments(userId);
  } catch (error) {
    errorMessage =
      error instanceof ApiError ? error.message : t("loadError");
  }

  if (errorMessage) {
    return <EndpointErrorBanner state="missing" detail={errorMessage} />;
  }

  if (enrollments.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colClass")}</TableHead>
              <TableHead>{t("colClub")}</TableHead>
              <TableHead>{t("colYear")}</TableHead>
              <TableHead>{t("colStarted")}</TableHead>
              <TableHead>{t("colCompleted")}</TableHead>
              <TableHead>{t("colInvested")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((row) => {
              const status = row.investiture_status;
              const statusKey = investitureStatusLabelKey(status);
              const clubLabel =
                clubByYear.get(row.ecclesiastical_year_id) ?? t("clubUnknown");
              const completedAt =
                row.investiture_date ?? row.validated_at ?? null;

              return (
                <TableRow key={row.enrollment_id}>
                  <TableCell>
                    <div className="flex min-w-0 max-w-[260px] items-center gap-3">
                      <ClassImageCell
                        className={row.classes?.name}
                        assetCode={row.classes?.asset_code}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.classes?.name ?? t("unknownClass")}
                        </p>
                        {row.classes?.club_types?.name ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {row.classes.club_types.name}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm">
                    {clubLabel}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatEcclesiasticalYearLabel(row.ecclesiastical_year, locale)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateLong(row.enrollment_date, locale)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {completedAt
                      ? formatDateLong(completedAt, locale)
                      : t("notCompleted")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {isInvestedStatus(status) ? t("investedYes") : t("investedNo")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      intent={investitureStatusIntent(status)}
                      label={
                        t.has(statusKey as Parameters<typeof t>[0])
                          ? t(statusKey as Parameters<typeof t>[0])
                          : status
                      }
                      size="sm"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
