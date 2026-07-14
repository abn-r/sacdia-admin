import Image from "next/image";
import { Award } from "lucide-react";
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
import { getUserHonors, type UserHonorRecord } from "@/lib/api/user-formative-progress";
import { honorStatusIntent } from "@/lib/users/formative-status";
import { ApiError } from "@/lib/api/client";

interface UserDetailHonorsTabProps {
  userId: string;
  locale: string;
}

function honorStatusLabelKey(status: string): string {
  return `statusHonor.${status}`;
}

function HonorImageCell({ honor }: { honor: UserHonorRecord["honors"] }) {
  const imageUrl = honor?.honor_image?.trim();
  const name = honor?.name ?? "";

  if (!imageUrl) {
    return (
      <div className="flex size-10 items-center justify-center rounded-md bg-muted">
        <Award className="size-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative size-10 overflow-hidden rounded-md bg-muted">
      <Image
        src={imageUrl}
        alt={name}
        fill
        className="object-cover"
        sizes="40px"
        unoptimized
      />
    </div>
  );
}

export async function UserDetailHonorsTab({
  userId,
  locale,
}: UserDetailHonorsTabProps) {
  const t = await getTranslations("users.pages.detail.honorsTab");

  let honors: UserHonorRecord[] = [];
  let errorMessage: string | null = null;

  try {
    honors = await getUserHonors(userId);
  } catch (error) {
    errorMessage =
      error instanceof ApiError ? error.message : t("loadError");
  }

  if (errorMessage) {
    return <EndpointErrorBanner state="missing" detail={errorMessage} />;
  }

  if (honors.length === 0) {
    return (
      <EmptyState
        icon={Award}
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
              <TableHead className="w-[56px]">{t("colImage")}</TableHead>
              <TableHead>{t("colHonor")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead>{t("colStarted")}</TableHead>
              <TableHead>{t("colCompleted")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {honors.map((row) => {
              const status = row.validation_status;
              const statusKey = honorStatusLabelKey(status);
              const completedAt =
                status === "APPROVED"
                  ? row.validated_at ?? row.date
                  : null;

              return (
                <TableRow key={row.user_honor_id}>
                  <TableCell>
                    <HonorImageCell honor={row.honors} />
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0 max-w-[240px]">
                      <p className="truncate font-medium text-sm">
                        {row.honors?.name ?? t("unknownHonor")}
                      </p>
                      {row.honors?.honors_categories?.name ? (
                        <p className="truncate text-muted-foreground text-xs">
                          {row.honors.honors_categories.name}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      intent={honorStatusIntent(status)}
                      label={t.has(statusKey as Parameters<typeof t>[0])
                        ? t(statusKey as Parameters<typeof t>[0])
                        : status}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateLong(row.date ?? row.created_at, locale)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {completedAt
                      ? formatDateLong(completedAt, locale)
                      : t("notCompleted")}
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
