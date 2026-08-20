import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { CamporeeInfoCard } from "@/components/camporees/camporee-info-card";
import { CamporeeDetailInfoTab } from "@/components/camporees/camporee-detail-info-tab";
import { CamporeeDetailTabs } from "@/components/camporees/camporee-detail-tabs";
import { ClubRegistrationActions } from "@/components/camporees/club-registration-actions";
import { ApiError } from "@/lib/api/client";
import {
  getUnionCamporeeById,
  listUnionCamporeeMembers,
  getUnionEnrolledClubs,
  getUnionCamporeePayments,
  getUnionCamporeePendingApprovals,
} from "@/lib/api/camporees";
import { listPaymentOrders, type PaymentOrder } from "@/lib/api/field-payment-orders";
import {
  listUnionCamporeeEvents,
  listCamporeeEventTemplates,
  type BackendCamporeeEvent,
  type CamporeeEventTemplate,
} from "@/lib/api/camporee-events";
import {
  listUnionCamporeeVenues,
  type CamporeeVenue,
} from "@/lib/api/camporee-venues";
import {
  getCamporeeEventRubrics,
  getUnionCamporeeLeaderboard,
  listCamporeeEventJudgeAssignments,
  listCamporeeEventScoringTargets,
  listUnionCamporeeJudges,
  type CamporeeEventJudgeAssignment,
  type CamporeeEventRubric,
  type CamporeeJudge,
  type CamporeeLeaderboard,
  type CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { canManageCamporeeJudgeAssignments } from "@/lib/camporee-scoring/permissions";
import {
  CAMPOREE_EVENTS_CREATE,
  CAMPOREE_EVENTS_UPDATE,
  CAMPOREE_EVENTS_DELETE,
  CAMPOREES_CREATE,
  CAMPOREES_UPDATE,
  CAMPOREES_DELETE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import {
  countCompetitiveEnrolledClubs,
  hasCamporeeScoringArtifacts,
} from "@/lib/camporees/club-registration";
import type {
  Camporee,
  CamporeeMember,
  CamporeeClub,
  CamporeePayment,
  PendingApprovals,
  PaginationMeta,
} from "@/lib/api/camporees";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type AnyRecord = Record<string, unknown>;

// ─── Normalizers ───────────────────────────────────────────────────────────────

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value === "string") return toText(value);
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  return null;
}

function extractCamporee(payload: unknown): AnyRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;
  if (root.data && typeof root.data === "object") {
    const nested = root.data as AnyRecord;
    if (nested.union_camporee_id != null || nested.camporee_id != null || nested.name != null) return nested;
    if (nested.data && typeof nested.data === "object") return nested.data as AnyRecord;
  }
  if (root.union_camporee_id != null || root.camporee_id != null || root.name != null) return root;
  return null;
}

function normalizeCamporee(raw: AnyRecord): Camporee {
  return {
    camporee_id: toPositiveNumber(raw.union_camporee_id ?? raw.camporee_id ?? raw.id) ?? undefined,
    id: toPositiveNumber(raw.id) ?? undefined,
    name: String(raw.name ?? ""),
    description: toText(raw.description),
    start_date: String(raw.start_date ?? ""),
    end_date: String(raw.end_date ?? ""),
    includes_adventurers: raw.includes_adventurers === true,
    includes_pathfinders: raw.includes_pathfinders !== false,
    includes_master_guides: raw.includes_master_guides === true,
    local_camporee_place: toText(raw.union_camporee_place) ?? toText(raw.place) ?? undefined,
    lat: (() => {
      const value = raw.lat;
      if (value == null || value === "") return undefined;
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    })(),
    long: (() => {
      const value = raw.long;
      if (value == null || value === "") return undefined;
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    })(),
    registration_cost: (() => {
      const v = raw.registration_cost;
      if (v == null || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    })(),
    active: raw.active !== false,
    club_registration_closed_at: toIsoTimestamp(raw.club_registration_closed_at),
    club_registration_closed_by: toText(raw.club_registration_closed_by),
    local_field: undefined,
  };
}

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as T[];
  }
  return [];
}

function extractLeaderboard(payload: unknown): CamporeeLeaderboard | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;
  const candidate =
    root.data && typeof root.data === "object" ? (root.data as AnyRecord) : root;
  if (Array.isArray(candidate.rows)) {
    return candidate as unknown as CamporeeLeaderboard;
  }
  return null;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function UnionCamporeeDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const user = await requireAdminUser();

  const { id } = await params;
  const camporeeId = toPositiveNumber(id);
  if (!camporeeId) notFound();

  let camporee: Camporee;
  let members: CamporeeMember[] = [];
  let membersMeta: PaginationMeta | undefined;
  let membersError: string | null = null;
  let clubs: CamporeeClub[] = [];
  let clubsError: string | null = null;
  let payments: CamporeePayment[] = [];
  let paymentsError: string | null = null;
  let paymentOrders: PaymentOrder[] = [];
  let pending: PendingApprovals = { clubs: [], members: [], payments: [] };
  let events: BackendCamporeeEvent[] = [];
  let availableTemplates: CamporeeEventTemplate[] = [];
  let venues: CamporeeVenue[] = [];
  let judges: CamporeeJudge[] = [];
  let assignmentsByEvent: Record<number, CamporeeEventJudgeAssignment[]> = {};
  let scoringTargetsByEvent: Record<number, CamporeeScoringTarget[]> = {};
  let rubricsByEvent: Record<number, CamporeeEventRubric[]> = {};
  let leaderboard: CamporeeLeaderboard | null = null;
  let unionName: string | null = null;

  // Fetch camporee detail
  try {
    const payload = await getUnionCamporeeById(camporeeId);
    const raw = extractCamporee(payload);
    if (!raw) notFound();
    unionName = toText(raw.union_name) ?? toText((raw.union as AnyRecord | undefined)?.name);
    camporee = normalizeCamporee(raw);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const t = await getTranslations("camporees.pages.detail");
  const canCreateEvents = hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE]);
  const canEditEvents = hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE]);
  const canDeleteEvents = hasAnyPermission(user, [CAMPOREE_EVENTS_DELETE, CAMPOREES_DELETE]);
  const canEditJudgeAssignments = canManageCamporeeJudgeAssignments(user, {
    isUnion: true,
  });

  // Fetch members — best effort
  try {
    const membersPayload = await listUnionCamporeeMembers(camporeeId, { page: 1, limit: 100 });
    members = membersPayload.data;
    membersMeta = membersPayload.meta;
  } catch (err) {
    membersError =
      err instanceof ApiError
        ? err.message
        : t("loadFailed");
  }

  // Fetch enrolled clubs — best effort
  try {
    const clubsPayload = await getUnionEnrolledClubs(camporeeId);
    clubs = extractList<CamporeeClub>(clubsPayload);
  } catch (err) {
    clubsError =
      err instanceof ApiError
        ? err.message
        : t("loadClubsFailed");
  }

  // Fetch payments — best effort
  try {
    const paymentsPayload = await getUnionCamporeePayments(camporeeId);
    payments = extractList<CamporeePayment>(paymentsPayload);
  } catch (err) {
    paymentsError =
      err instanceof ApiError
        ? err.message
        : t("loadPaymentsFailed");
  }

  try {
    paymentOrders = await listPaymentOrders({
      purpose: "CAMPOREE",
      union_camporee_id: camporeeId,
    });
  } catch {
    paymentOrders = [];
  }

  // Fetch pending approvals — best effort (non-blocking)
  try {
    const pendingPayload = await getUnionCamporeePendingApprovals(camporeeId);
    if (pendingPayload && typeof pendingPayload === "object") {
      pending = pendingPayload as PendingApprovals;
    }
  } catch {
    // Silently ignore — pending count is informational only
  }

  // Resolve URL filter params for the events tab
  const sp = searchParams ? await searchParams : {};
  const spStr = (key: string): string | undefined => {
    const v = sp[key];
    return typeof v === "string" ? v : undefined;
  };
  // Guard venue param against malformed/NaN values — backend @IsInt() would
  // otherwise reject the request with 400 on garbage input.
  const rawVenue = spStr("venue");
  const parsedVenue = rawVenue !== undefined ? Number(rawVenue) : undefined;
  const venueIdFilter =
    parsedVenue !== undefined && Number.isFinite(parsedVenue)
      ? parsedVenue
      : undefined;

  const eventsFilter: import("@/lib/api/camporee-events").ListCamporeeEventsParams = {
    limit: 100,
    ...(spStr("q") && { q: spStr("q") }),
    ...(spStr("category") && { display_category: spStr("category") as import("@/lib/api/camporee-events").CamporeeEventDisplayCategory }),
    ...(spStr("section") && { section: spStr("section") as import("@/lib/api/camporee-events").CamporeeEventSection }),
    ...(venueIdFilter !== undefined && { venue_id: venueIdFilter }),
    ...(spStr("status") && { status: spStr("status") as import("@/lib/api/camporee-events").CamporeeEventStatus }),
  };

  // Fetch camporee events (instances) — best effort
  try {
    const eventsPayload = await listUnionCamporeeEvents(camporeeId, eventsFilter);
    const eventsData = extractList<BackendCamporeeEvent>(eventsPayload);
    events = eventsData.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  } catch {
    // Events are not blocking — tab shows empty state
  }

  // Fetch templates available for this union camporee — best effort
  try {
    const templatesPayload = await listCamporeeEventTemplates({ limit: 200, active: true });
    availableTemplates = extractList<CamporeeEventTemplate>(templatesPayload);
  } catch {
    // silently degrade
  }

  // Fetch venues accessible to this union camporee — best effort
  try {
    const venuesPayload = await listUnionCamporeeVenues(camporeeId);
    venues = extractList<CamporeeVenue>(venuesPayload);
  } catch {
    // silently degrade — timeline renders without venue names
  }

  // Fetch scoring roster for event judge assignments — best effort
  try {
    const judgesPayload = await listUnionCamporeeJudges(camporeeId);
    judges = extractList<CamporeeJudge>(judgesPayload);
  } catch {
    judges = [];
  }

  if (events.length > 0) {
    const assignmentResults = await Promise.allSettled(
      events.map(async (event) => {
        const payload = await listCamporeeEventJudgeAssignments(event.camporee_event_id);
        return [event.camporee_event_id, extractList<CamporeeEventJudgeAssignment>(payload)] as const;
      }),
    );
    assignmentsByEvent = Object.fromEntries(
      assignmentResults
        .filter((result): result is PromiseFulfilledResult<readonly [number, CamporeeEventJudgeAssignment[]]> => result.status === "fulfilled")
        .map((result) => result.value),
    );

    const targetResults = await Promise.allSettled(
      events.map(async (event) => {
        const payload = await listCamporeeEventScoringTargets(event.camporee_event_id);
        return [event.camporee_event_id, extractList<CamporeeScoringTarget>(payload)] as const;
      }),
    );
    scoringTargetsByEvent = Object.fromEntries(
      targetResults
        .filter((result): result is PromiseFulfilledResult<readonly [number, CamporeeScoringTarget[]]> => result.status === "fulfilled")
        .map((result) => result.value),
    );

    const rubricResults = await Promise.allSettled(
      events
        .filter((event) => event.scoring_enabled)
        .map(async (event) => {
          const payload = await getCamporeeEventRubrics(event.camporee_event_id);
          return [event.camporee_event_id, extractList<CamporeeEventRubric>(payload)] as const;
        }),
    );
    rubricsByEvent = Object.fromEntries(
      rubricResults
        .filter((result): result is PromiseFulfilledResult<readonly [number, CamporeeEventRubric[]]> => result.status === "fulfilled")
        .map((result) => result.value),
    );
  }

  // Fetch camporee leaderboard — best effort
  try {
    const leaderboardPayload = await getUnionCamporeeLeaderboard(camporeeId);
    leaderboard = extractLeaderboard(leaderboardPayload);
  } catch {
    leaderboard = null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={camporee.name}
        description={t("description")}
        breadcrumbs={[
          { label: "Camporees de unión", href: "/dashboard/campamentos/union" },
          { label: camporee.name },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/campamentos/union">
                <ArrowLeft className="size-4" />
                {t("back")}
              </Link>
            </Button>
            <ClubRegistrationActions
              camporeeId={camporeeId}
              isUnion
              closedAt={camporee.club_registration_closed_at}
              canManage={canEditEvents}
              enrolledClubCount={countCompetitiveEnrolledClubs(clubs)}
              clubsLoadFailed={Boolean(clubsError)}
              hasScoringArtifacts={hasCamporeeScoringArtifacts({
                assignmentCount: Object.values(assignmentsByEvent).reduce(
                  (total, assignments) => total + assignments.length,
                  0,
                ),
                leaderboardRowCount: leaderboard?.rows.length ?? 0,
              })}
              camporeeActive={camporee.active !== false}
            />
          </>
        }
      />

      {/* Summary card */}
      <CamporeeInfoCard camporee={camporee} />

      {/* Tabs */}
      <CamporeeDetailTabs
        camporeeId={camporeeId}
        camporee={camporee}
        isUnionCamporee
        initialMembers={members}
        initialMembersMeta={membersMeta}
        initialClubs={clubs}
        initialPayments={payments}
        initialPaymentOrders={paymentOrders}
        initialPending={pending}
        membersError={membersError}
        clubsError={clubsError}
        paymentsError={paymentsError}
        initialEvents={events}
        availableTemplates={availableTemplates}
        initialVenues={venues}
        initialJudges={judges}
        initialAssignmentsByEvent={assignmentsByEvent}
        initialScoringTargetsByEvent={scoringTargetsByEvent}
        initialRubricsByEvent={rubricsByEvent}
        initialLeaderboard={leaderboard}
        canCreateEvents={canCreateEvents}
        canEditEvents={canEditEvents}
        canDeleteEvents={canDeleteEvents}
        canEditJudgeAssignments={canEditJudgeAssignments}
        initialTab={spStr("tab")}
        infoContent={
          <CamporeeDetailInfoTab
            camporee={camporee}
            orgCard={{
              label: t("labelUnionKpi"),
              title: unionName ?? "—",
            }}
          />
        }
      />
    </div>
  );
}
