import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActivityAudienceValue } from "@/components/activities/activity-audience-label";
import { ActivityDetailActions } from "@/components/activities/activity-detail-actions";
import { ActivityImageCard } from "@/components/activities/activity-image-card";
import { ActivitySeriesPanel } from "@/components/activities/activity-series-panel";
import { AttendancePanel } from "@/components/activities/attendance-panel";
import { DetailHeader } from "@/components/shared/detail-header";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError, apiRequest } from "@/lib/api/client";
import { errorStateFromError } from "@/lib/api/error-state";
import { getActivity, getAttendance, listActivities } from "@/lib/api/activities";
import type { Activity, ActivitySeriesSummary, AttendanceRecord } from "@/lib/api/activities";
import { listClubTypes } from "@/lib/api/catalogs";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { loadClubContextClubs } from "@/lib/club-context/load-clubs";
import { getFinanceSectionLabel } from "@/lib/finances/club-sections";
import { formatCalendarDate } from "@/lib/format-locale";
import { PLATFORM_HYBRID, PLATFORM_IN_PERSON, PLATFORM_VIRTUAL, hasRealCoordinates } from "@/lib/activities/form";
import { ACTIVITIES_BASE_PATH, extractArray, normalizeActivities, normalizeActivity } from "@/lib/activities/helpers";
import { todayKey } from "@/lib/activities/view";

type Params = Promise<{ id: string }>;
type AnyRecord = Record<string, unknown>;

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function extractActivity(payload: unknown): AnyRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;
  if (root.data && typeof root.data === "object") {
    const nested = root.data as AnyRecord;
    if (nested.activity_id != null || nested.name != null) return nested;
    if (nested.data && typeof nested.data === "object") return nested.data as AnyRecord;
  }
  if (root.activity_id != null || root.name != null) return root;
  return null;
}

function extractAttendance(payload: unknown): AttendanceRecord[] {
  if (Array.isArray(payload)) return payload as AttendanceRecord[];
  return extractArray(payload) as unknown as AttendanceRecord[];
}

function unwrapSeries(payload: unknown): ActivitySeriesSummary | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;
  const data = root.data && typeof root.data === "object" && !Array.isArray(root.data) ? (root.data as AnyRecord) : root;
  return data.activity_series_id != null ? (data as unknown as ActivitySeriesSummary) : null;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-snug">{children}</dd>
    </div>
  );
}

const linkClass = "text-primary underline-offset-4 hover:underline";

export default async function ActivityDetailPage({ params }: { params: Params }) {
  const user = await requireAdminUser();
  if (!canViewScreen(user, "activities")) redirect("/dashboard");
  const t = await getTranslations("people.activities");
  const tOld = await getTranslations("activities");
  const locale = await getLocale();

  const { id } = await params;
  const activityId = toPositiveNumber(id);
  if (!activityId) notFound();

  let activity: Activity;
  try {
    const raw = extractActivity(await getActivity(activityId));
    if (!raw) notFound();
    activity = normalizeActivity(raw);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound();
    // notFound() above throws a control-flow error that must keep going.
    if (!(error instanceof ApiError) && !(error instanceof TypeError)) throw error;
    const { kind, detail } = errorStateFromError(error);
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[{ label: tOld("page.title"), href: ACTIVITIES_BASE_PATH }]}
          title={tOld("page.title")}
        />
        <ErrorState kind={kind} detail={detail} description={t("detail.errorLoad")} retry />
      </div>
    );
  }

  const today = todayKey();
  const canEdit = canCapability(user, "activities", "update");

  // The rest of the page is best effort: each block says on its own if it failed.
  const [attendanceResult, clubsResult, seriesResult] = await Promise.all([
    getAttendance(activityId).then(extractAttendance, (error: unknown) => error),
    listClubTypes()
      .catch(() => [])
      .then((clubTypes) => loadClubContextClubs(clubTypes)),
    activity.activity_series_id
      ? apiRequest<unknown>(`/activity-series/${activity.activity_series_id}`).then(unwrapSeries, () => null)
      : Promise.resolve(null),
  ]);
  const attendance = Array.isArray(attendanceResult) ? attendanceResult : null;
  const attendanceError = attendance === null ? errorStateFromError(attendanceResult) : null;

  const club = clubsResult.ok ? clubsResult.clubs.find((candidate) => candidate.club_id === activity.club_id) : undefined;
  const section = club?.sections.find((candidate) => candidate.club_section_id === activity.club_section_id);
  const clubName = club?.name ?? activity.club_name ?? null;
  const sectionName = section ? getFinanceSectionLabel(section) : null;

  let sessions: Activity[] = [];
  let sessionsFailed = false;
  if (seriesResult) {
    try {
      sessions = normalizeActivities(
        await listActivities(activity.club_id, { seriesId: seriesResult.activity_series_id, active: true, limit: 100 }),
      ).sort((a, b) => (a.activity_date ?? "").localeCompare(b.activity_date ?? ""));
    } catch {
      sessionsFailed = true;
    }
  }

  const typeLabel =
    activity.activity_type_id === 1
      ? tOld("view.types.regular")
      : activity.activity_type_id === 2
        ? tOld("view.types.especial")
        : activity.activity_type_id === 3
          ? tOld("view.types.camporee")
          : (activity.activity_type?.name ?? null);

  const platform = activity.platform ?? PLATFORM_IN_PERSON;
  const platformLabel =
    platform === PLATFORM_VIRTUAL
      ? t("modalities.virtual")
      : platform === PLATFORM_HYBRID
        ? t("modalities.hybrid")
        : t("modalities.inPerson");
  const isVirtual = platform === PLATFORM_VIRTUAL;

  const placeText = activity.activity_place.trim();
  const mapsUrl = hasRealCoordinates(activity.lat, activity.long)
    ? `https://maps.google.com/?q=${activity.lat},${activity.long}`
    : placeText
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeText)}`
      : null;

  const hasEnd =
    activity.activity_end_date &&
    activity.activity_end_date.slice(0, 10) !== (activity.activity_date ?? "").slice(0, 10);
  const listHref = `${ACTIVITIES_BASE_PATH}?club=${activity.club_id}`;
  const subtitle = [clubName, sectionName, typeLabel].filter(Boolean).join(" · ");

  return (
    <div className="space-y-8">
      <DetailHeader
        breadcrumbs={[
          { label: tOld("page.title"), href: listHref },
          { label: activity.name },
        ]}
        title={activity.name}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            {subtitle ? <span>{subtitle}</span> : null}
            {activity.active ? null : <StatusBadge intent="neutral" label={tOld("pageDetail.badge_inactive")} />}
          </span>
        }
        actions={<ActivityDetailActions activity={activity} canEdit={canEdit} listHref={listHref} />}
      />

      {activity.description ? <p className="max-w-prose text-sm text-muted-foreground">{activity.description}</p> : null}

      <section aria-labelledby="activity-data" className="space-y-3">
        <h2 id="activity-data" className="text-base font-semibold tracking-tight">
          {t("detail.data")}
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Fact label={tOld("pageDetail.info_date")}>
            {formatCalendarDate(activity.activity_date, locale, "long")}
            {hasEnd ? ` – ${formatCalendarDate(activity.activity_end_date, locale, "long")}` : null}
          </Fact>
          <Fact label={tOld("pageDetail.info_time")}>{activity.activity_time ?? "—"}</Fact>
          <Fact label={tOld("pageDetail.info_audience")}>
            <ActivityAudienceValue
              activity={activity}
              withLogos
              labels={{
                all: tOld("audience.all"),
                board: tOld("audience.board"),
                classes: tOld("audience.classes"),
              }}
            />
          </Fact>
          <Fact label={tOld("pageDetail.info_mode")}>{platformLabel}</Fact>
          {!isVirtual && placeText ? (
            <Fact label={tOld("pageDetail.info_place")}>
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {placeText}
                </a>
              ) : (
                placeText
              )}
            </Fact>
          ) : null}
          {activity.link_meet ? (
            <Fact label={tOld("pageDetail.info_meet_link")}>
              <a href={activity.link_meet} target="_blank" rel="noopener noreferrer" className={`${linkClass} break-all`}>
                {activity.link_meet}
              </a>
            </Fact>
          ) : null}
          {seriesResult ? (
            <Fact label={tOld("series.badge")}>
              <ActivitySeriesPanel
                series={seriesResult}
                sessions={sessions}
                sessionsFailed={sessionsFailed}
                currentActivityId={activity.activity_id}
                today={today}
                canEdit={canEdit}
              />
            </Fact>
          ) : null}
        </dl>
      </section>

      {activity.image ? (
        <ActivityImageCard title={tOld("pageDetail.card_image_title")} src={activity.image} alt={activity.name} />
      ) : null}

      <section aria-labelledby="activity-registered" className="space-y-3">
        <h2 id="activity-registered" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          {t("detail.registered")}
          {attendance && attendance.length > 0 ? (
            <span className="rounded-full bg-muted px-2 text-xs font-medium tabular-nums leading-5 text-muted-foreground">
              {attendance.length}
            </span>
          ) : null}
        </h2>
        {attendanceError ? (
          <ErrorState
            variant="inline"
            kind={attendanceError.kind}
            detail={attendanceError.detail}
            description={tOld("pageDetail.error_attendance_load")}
            retry
          />
        ) : (
          <AttendancePanel records={attendance ?? []} />
        )}
      </section>
    </div>
  );
}
