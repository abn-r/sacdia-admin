import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import {
  getCamporeeById,
  getCamporeePayments,
  getCamporeePendingApprovals,
  getEnrolledClubs,
  getUnionCamporeeById,
  getUnionCamporeePayments,
  getUnionCamporeePendingApprovals,
  getUnionEnrolledClubs,
  listCamporeeMembers,
  listUnionCamporeeMembers,
  type CamporeeClub,
  type CamporeeMember,
  type CamporeePayment,
  type PaginationMeta,
  type PendingApprovals,
} from "@/lib/api/camporees";
import { listPaymentOrders, type PaymentOrder } from "@/lib/api/field-payment-orders";
import {
  listCamporeeEventTemplates,
  listLocalCamporeeEvents,
  listUnionCamporeeEvents,
  type BackendCamporeeEvent,
  type CamporeeEventDisplayCategory,
  type CamporeeEventSection,
  type CamporeeEventStatus,
  type CamporeeEventTemplate,
  type ListCamporeeEventsParams,
} from "@/lib/api/camporee-events";
import {
  listLocalCamporeeVenues,
  listUnionCamporeeVenues,
  type CamporeeVenue,
} from "@/lib/api/camporee-venues";
import {
  getCamporeeEventRubrics,
  getLocalCamporeeLeaderboard,
  getLocalCamporeeScoreBreakdown,
  getUnionCamporeeLeaderboard,
  getUnionCamporeeScoreBreakdown,
  listCamporeeEventJudgeAssignments,
  listCamporeeEventScoringTargets,
  listLocalCamporeeJudges,
  listUnionCamporeeJudges,
  type CamporeeEventJudgeAssignment,
  type CamporeeEventRubric,
  type CamporeeJudge,
  type CamporeeLeaderboard,
  type CamporeeScoreBreakdown,
  type CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";
import { listUnions } from "@/lib/api/geography";
import {
  extractCamporeeRecord,
  extractList,
  normalizeCamporee,
  toPositiveNumber,
  type CamporeeKind,
  type NormalizedCamporee,
} from "@/lib/camporees/normalize";
import { resolveCamporeeLocation, type CamporeeLocation } from "@/lib/camporees/groups";
import { resolveUnionCamporeeUnionName } from "@/lib/camporees/union-name";

export type LoadFailure = ErrorStateFromError;

export type CamporeeDetailData = {
  kind: CamporeeKind;
  id: number;
  camporee: NormalizedCamporee;
  unionName: string | null;
  location: CamporeeLocation;
  members: CamporeeMember[];
  membersMeta: PaginationMeta | undefined;
  membersFailure: LoadFailure | null;
  clubs: CamporeeClub[];
  clubsFailure: LoadFailure | null;
  payments: CamporeePayment[];
  paymentsFailure: LoadFailure | null;
  paymentOrders: PaymentOrder[];
  pending: PendingApprovals;
  pendingFailure: LoadFailure | null;
  events: BackendCamporeeEvent[];
  eventsFailure: LoadFailure | null;
  availableTemplates: CamporeeEventTemplate[];
  venues: CamporeeVenue[];
  judges: CamporeeJudge[];
  assignmentsByEvent: Record<number, CamporeeEventJudgeAssignment[]>;
  scoringTargetsByEvent: Record<number, CamporeeScoringTarget[]>;
  rubricsByEvent: Record<number, CamporeeEventRubric[]>;
  leaderboard: CamporeeLeaderboard | null;
  scoreBreakdown: CamporeeScoreBreakdown | null;
  scoresFailure: LoadFailure | null;
};

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function str(sp: SearchParamsRecord, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v ? v : undefined;
}

function extractScoreBreakdown(payload: unknown): CamporeeScoreBreakdown | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const candidate =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;
  if (Array.isArray(candidate.events) && Array.isArray(candidate.sections)) {
    return candidate as unknown as CamporeeScoreBreakdown;
  }
  return null;
}

function extractLeaderboard(payload: unknown): CamporeeLeaderboard | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const candidate =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;
  return Array.isArray(candidate.rows)
    ? (candidate as unknown as CamporeeLeaderboard)
    : null;
}

function eventsFilterFrom(sp: SearchParamsRecord): ListCamporeeEventsParams {
  // Guard venue against garbage: the backend @IsInt() would answer 400.
  const rawVenue = str(sp, "venue");
  const venue = rawVenue !== undefined ? Number(rawVenue) : undefined;
  const q = str(sp, "q");
  const category = str(sp, "category");
  const section = str(sp, "section");
  const status = str(sp, "status");
  return {
    limit: 100,
    ...(q && { q }),
    ...(category && { display_category: category as CamporeeEventDisplayCategory }),
    ...(section && { section: section as CamporeeEventSection }),
    ...(venue !== undefined && Number.isFinite(venue) && { venue_id: venue }),
    ...(status && { status: status as CamporeeEventStatus }),
  };
}

const fail = (reason: unknown): LoadFailure => errorStateFromError(reason);

/**
 * Loads what the detail needs for the group in the URL. The counts and the
 * pending list feed the header and the summary on every group; the heavy
 * blocks (scoring, templates, payments) load only where they are shown.
 * A block that fails reports WHY (`*Failure`) so the screen never shows an
 * empty list for an error.
 */
export async function loadCamporeeDetail(
  kind: CamporeeKind,
  rawId: string,
  sp: SearchParamsRecord,
): Promise<CamporeeDetailData> {
  const id = toPositiveNumber(rawId);
  if (!id) notFound();
  const union = kind === "union";
  const location = resolveCamporeeLocation(str(sp, "tab"), str(sp, "view"));
  const { group } = location;

  let camporee: NormalizedCamporee;
  let unionName: string | null = null;
  try {
    const payload = union ? await getUnionCamporeeById(id) : await getCamporeeById(id);
    const raw = extractCamporeeRecord(payload, kind);
    if (!raw) notFound();
    if (union) unionName = await resolveUnionCamporeeUnionName(raw, listUnions);
    camporee = normalizeCamporee(raw, kind);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const needsMoney = group === "summary" || group === "money";
  const needsProgram = group === "program";
  const needsScores = group === "scores";

  const eventsPromise = (
    union
      ? listUnionCamporeeEvents(id, needsProgram ? eventsFilterFrom(sp) : { limit: 100 })
      : listLocalCamporeeEvents(id, needsProgram ? eventsFilterFrom(sp) : { limit: 100 })
  ).then((payload) =>
    extractList<BackendCamporeeEvent>(payload).sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
    ),
  );

  const [
    membersR,
    clubsR,
    pendingR,
    eventsR,
    paymentsR,
    ordersR,
    templatesR,
    venuesR,
    judgesR,
    leaderboardR,
    breakdownR,
  ] = await Promise.allSettled([
    union
      ? listUnionCamporeeMembers(id, { page: 1, limit: 100 })
      : listCamporeeMembers(id, { page: 1, limit: 50 }),
    union ? getUnionEnrolledClubs(id) : getEnrolledClubs(id),
    union ? getUnionCamporeePendingApprovals(id) : getCamporeePendingApprovals(id),
    eventsPromise,
    needsMoney
      ? union
        ? getUnionCamporeePayments(id)
        : getCamporeePayments(id)
      : Promise.resolve([]),
    needsMoney
      ? listPaymentOrders({
          purpose: "CAMPOREE",
          ...(union ? { union_camporee_id: id } : { camporee_id: id }),
        })
      : Promise.resolve([] as PaymentOrder[]),
    needsProgram
      ? listCamporeeEventTemplates({ limit: 200, active: true })
      : Promise.resolve([]),
    needsProgram
      ? union
        ? listUnionCamporeeVenues(id)
        : listLocalCamporeeVenues(id)
      : Promise.resolve([]),
    needsScores
      ? union
        ? listUnionCamporeeJudges(id)
        : listLocalCamporeeJudges(id)
      : Promise.resolve([]),
    union ? getUnionCamporeeLeaderboard(id) : getLocalCamporeeLeaderboard(id),
    needsScores
      ? union
        ? getUnionCamporeeScoreBreakdown(id)
        : getLocalCamporeeScoreBreakdown(id)
      : Promise.resolve(null),
  ]);

  const events = eventsR.status === "fulfilled" ? eventsR.value : [];

  // Per-event reads: assignments always (the header's reopen guard and the
  // summary need them); targets and rubrics only where scores are shown.
  const settled = async <T,>(
    pick: (event: BackendCamporeeEvent) => Promise<T[]> | null,
  ): Promise<Record<number, T[]>> => {
    const results = await Promise.allSettled(
      events.map(async (event) => {
        const pending = pick(event);
        return [event.camporee_event_id, pending ? await pending : []] as const;
      }),
    );
    return Object.fromEntries(
      results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
    ) as Record<number, T[]>;
  };

  const [assignmentsByEvent, scoringTargetsByEvent, rubricsByEvent] = await Promise.all([
    settled<CamporeeEventJudgeAssignment>((event) =>
      listCamporeeEventJudgeAssignments(event.camporee_event_id).then((p) =>
        extractList<CamporeeEventJudgeAssignment>(p),
      ),
    ),
    needsScores
      ? settled<CamporeeScoringTarget>((event) =>
          listCamporeeEventScoringTargets(event.camporee_event_id).then((p) =>
            extractList<CamporeeScoringTarget>(p),
          ),
        )
      : Promise.resolve({} as Record<number, CamporeeScoringTarget[]>),
    needsScores
      ? settled<CamporeeEventRubric>((event) =>
          event.scoring_enabled
            ? getCamporeeEventRubrics(event.camporee_event_id).then((p) =>
                extractList<CamporeeEventRubric>(p),
              )
            : null,
        )
      : Promise.resolve({} as Record<number, CamporeeEventRubric[]>),
  ]);

  const pending: PendingApprovals =
    pendingR.status === "fulfilled" && pendingR.value && typeof pendingR.value === "object"
      ? {
          clubs: pendingR.value.clubs ?? [],
          members: pendingR.value.members ?? [],
          payments: pendingR.value.payments ?? [],
        }
      : { clubs: [], members: [], payments: [] };

  const scoresFailure =
    needsScores && (leaderboardR.status === "rejected" || breakdownR.status === "rejected" || judgesR.status === "rejected")
      ? fail(
          leaderboardR.status === "rejected"
            ? leaderboardR.reason
            : breakdownR.status === "rejected"
              ? breakdownR.reason
              : (judgesR as PromiseRejectedResult).reason,
        )
      : null;

  return {
    kind,
    id,
    camporee,
    unionName,
    location,
    members: membersR.status === "fulfilled" ? membersR.value.data : [],
    membersMeta: membersR.status === "fulfilled" ? membersR.value.meta : undefined,
    membersFailure: membersR.status === "rejected" ? fail(membersR.reason) : null,
    clubs: clubsR.status === "fulfilled" ? extractList<CamporeeClub>(clubsR.value) : [],
    clubsFailure: clubsR.status === "rejected" ? fail(clubsR.reason) : null,
    payments:
      paymentsR.status === "fulfilled" ? extractList<CamporeePayment>(paymentsR.value) : [],
    paymentsFailure:
      needsMoney && paymentsR.status === "rejected" ? fail(paymentsR.reason) : null,
    // Orders are an extra credit source: without them the balance still works.
    paymentOrders: ordersR.status === "fulfilled" ? (ordersR.value as PaymentOrder[]) : [],
    pending,
    pendingFailure: pendingR.status === "rejected" ? fail(pendingR.reason) : null,
    events,
    eventsFailure: eventsR.status === "rejected" ? fail(eventsR.reason) : null,
    availableTemplates:
      templatesR.status === "fulfilled"
        ? extractList<CamporeeEventTemplate>(templatesR.value)
        : [],
    venues: venuesR.status === "fulfilled" ? extractList<CamporeeVenue>(venuesR.value) : [],
    judges: judgesR.status === "fulfilled" ? extractList<CamporeeJudge>(judgesR.value) : [],
    assignmentsByEvent,
    scoringTargetsByEvent,
    rubricsByEvent,
    leaderboard:
      leaderboardR.status === "fulfilled" ? extractLeaderboard(leaderboardR.value) : null,
    scoreBreakdown:
      breakdownR.status === "fulfilled" ? extractScoreBreakdown(breakdownR.value) : null,
    scoresFailure,
  };
}
