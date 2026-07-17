import Image from "next/image";
import { Award } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type HonorsTabTranslator = Awaited<
  ReturnType<typeof getTranslations<"users.pages.detail.honorsTab">>
>;

const HONOR_CLUB_TYPE_SECTIONS = [
  { clubTypeId: 1, titleKey: "sectionAdventurers" },
  { clubTypeId: 2, titleKey: "sectionPathfinders" },
  { clubTypeId: 3, titleKey: "sectionMasterGuides" },
] as const;

function honorStatusLabelKey(status: string): string {
  return `statusHonor.${status}`;
}

function resolveHonorClubTypeId(honor: UserHonorRecord): number {
  return honor.honors?.club_type_id ?? 0;
}

function groupHonorsByClubType(honors: UserHonorRecord[]) {
  const groups = new Map<number, UserHonorRecord[]>();

  for (const honor of honors) {
    const clubTypeId = resolveHonorClubTypeId(honor);
    const bucket = groups.get(clubTypeId) ?? [];
    bucket.push(honor);
    groups.set(clubTypeId, bucket);
  }

  return groups;
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
    <div className="flex size-10 shrink-0 items-center justify-center">
      <Image
        src={imageUrl}
        alt={name}
        width={40}
        height={40}
        className="max-h-10 max-w-10 object-contain"
        sizes="40px"
        unoptimized
      />
    </div>
  );
}

function HonorsTable({
  honors,
  locale,
  t,
}: {
  honors: UserHonorRecord[];
  locale: string;
  t: HonorsTabTranslator;
}) {
  return (
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
            status === "APPROVED" ? row.validated_at ?? row.date : null;

          return (
            <TableRow key={row.user_honor_id}>
              <TableCell>
                <HonorImageCell honor={row.honors} />
              </TableCell>
              <TableCell>
                <div className="min-w-0 max-w-[240px]">
                  <p className="truncate text-sm font-medium">
                    {row.honors?.name ?? t("unknownHonor")}
                  </p>
                  {row.honors?.honors_categories?.name ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {row.honors.honors_categories.name}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge
                  intent={honorStatusIntent(status)}
                  label={
                    t.has(statusKey as Parameters<typeof t>[0])
                      ? t(statusKey as Parameters<typeof t>[0])
                      : status
                  }
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

  const groupedHonors = groupHonorsByClubType(honors);
  const knownClubTypeIds = new Set<number>(
    HONOR_CLUB_TYPE_SECTIONS.map((section) => section.clubTypeId),
  );
  const otherHonors = [...groupedHonors.entries()]
    .filter(([clubTypeId]) => !knownClubTypeIds.has(clubTypeId))
    .flatMap(([, rows]) => rows);

  return (
    <div className="space-y-6">
      {HONOR_CLUB_TYPE_SECTIONS.map(({ clubTypeId, titleKey }) => {
        const sectionHonors = groupedHonors.get(clubTypeId) ?? [];
        if (sectionHonors.length === 0) return null;

        return (
          <Card key={clubTypeId}>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">
                {t(titleKey as Parameters<typeof t>[0])}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <HonorsTable honors={sectionHonors} locale={locale} t={t} />
            </CardContent>
          </Card>
        );
      })}

      {otherHonors.length > 0 ? (
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base">{t("sectionOther")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <HonorsTable honors={otherHonors} locale={locale} t={t} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
