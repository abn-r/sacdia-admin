import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { DetailHeader } from "@/components/shared/detail-header";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { CamporeeDetailActions } from "@/components/camporees/camporee-detail-actions";
import { CamporeeDetailTabs } from "@/components/camporees/camporee-detail-tabs";
import { camporeeScreenId, canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { loadCamporeeDetail } from "@/lib/camporees/detail-data";
import { legacyDetailRedirect } from "@/lib/camporees/groups";
import {
  countCompetitiveEnrolledClubs,
  hasCamporeeScoringArtifacts,
  isClubRegistrationClosed,
} from "@/lib/camporees/club-registration";
import type { CamporeeKind } from "@/lib/camporees/normalize";
import {
  formatCalendarDateRange,
  formatMxnAmount,
} from "@/lib/format-locale";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * One detail for local and union camporees: header, 5 groups, same actions.
 * `/campamentos/[id]` and `/campamentos/union/[id]` both render this.
 */
export async function CamporeeDetailView({
  kind,
  id,
  searchParams,
}: {
  kind: CamporeeKind;
  id: string;
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();

  const redirectTo = legacyDetailRedirect(kind, id, searchParams);
  if (redirectTo) redirect(redirectTo);

  const data = await loadCamporeeDetail(kind, id, searchParams);
  const { camporee, camporeeId } = { camporee: data.camporee, camporeeId: data.id };
  const union = kind === "union";

  const tl = await getTranslations("camporees.pages.list");
  const tc = await getTranslations("camporees");
  const td = await getTranslations("camporees.pages.detail");
  const tf = await getTranslations("camporees.form");
  const tr = await getTranslations("camporees.clubRegistration");
  const locale = await getLocale();

  const screen = camporeeScreenId(kind);
  // camporee_events:* only — the API does not accept camporees:* for events.
  const canCreateEvents = canCapability(user, screen, "events.create");
  const canEditEvents = canCapability(user, screen, "events.update");
  const canUpdate = canCapability(user, screen, "update");
  const canDelete = canCapability(user, screen, "delete");

  const { range, year } = formatCalendarDateRange(camporee.start_date, camporee.end_date, locale);
  const sectionKeys = [
    camporee.includes_adventurers ? "adventurers" : null,
    camporee.includes_pathfinders ? "pathfinders" : null,
    camporee.includes_master_guides ? "masterGuides" : null,
  ].filter((key): key is "adventurers" | "pathfinders" | "masterGuides" => key !== null);
  const sections = new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(
    sectionKeys.map((key) => tf(key)),
  );
  const subtitle = [
    year ? `${range} ${year}` : range,
    camporee.local_camporee_place,
    camporee.registration_cost != null
      ? `${formatMxnAmount(camporee.registration_cost)} ${td("costPerMember")}`
      : null,
    sections || null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  const closed = isClubRegistrationClosed(camporee.club_registration_closed_at);
  const mark = camporee.active === false ? "inactive" : closed ? "closed" : "open";

  return (
    <div className="space-y-6">
      <DetailHeader
        breadcrumbs={[
          {
            label: tl("title"),
            href: union ? "/dashboard/campamentos?tab=union" : "/dashboard/campamentos",
          },
          { label: camporee.name },
        ]}
        title={camporee.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{subtitle}</span>
            <ExceptionStatus
              value={mark}
              normal={["open"]}
              labels={{
                open: tr("statusOpen"),
                closed: tr("statusClosed"),
                inactive: tc("list.statusInactive"),
              }}
              intents={{ closed: "neutral", inactive: "neutral" }}
            />
          </span>
        }
        actions={
          <CamporeeDetailActions
            kind={kind}
            camporee={{ id: camporeeId, name: camporee.name }}
            canEdit={canUpdate}
            canDelete={canDelete}
            registration={{
              camporeeId,
              isUnion: union,
              closedAt: camporee.club_registration_closed_at,
              canManage: canEditEvents,
              enrolledClubCount: countCompetitiveEnrolledClubs(data.clubs),
              clubsLoadFailed: data.clubsFailure !== null,
              hasScoringArtifacts: hasCamporeeScoringArtifacts({
                assignmentCount: Object.values(data.assignmentsByEvent).reduce(
                  (total, assignments) => total + assignments.length,
                  0,
                ),
                leaderboardRowCount: data.leaderboard?.rows.length ?? 0,
              }),
              camporeeActive: camporee.active !== false,
            }}
          />
        }
      />

      <CamporeeDetailTabs
        data={data}
        canCreateEvents={canCreateEvents}
        canEditEvents={canEditEvents}
        canEditJudgeAssignments={canEditEvents}
      />
    </div>
  );
}
