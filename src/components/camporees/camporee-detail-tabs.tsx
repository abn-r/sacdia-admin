"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Segmented, type SegmentedOption } from "@/components/shared/segmented";
import { UrlTabs } from "@/components/shared/url-tabs";
import {
  getCamporeePendingApprovals,
  getUnionCamporeePendingApprovals,
  type PendingApprovals,
} from "@/lib/api/camporees";
import type { CamporeeMembersTabProps } from "@/components/camporees/camporee-members-tab";
import type { CamporeeClubsTabProps } from "@/components/camporees/camporee-clubs-tab";
import type { CamporeePaymentsTabProps } from "@/components/camporees/camporee-payments-tab";
import type { CamporeePaymentOrdersTabProps } from "@/components/payment-orders/camporee-payment-orders-tab";
import { CamporeePendingQueue } from "@/components/camporees/camporee-pending-queue";
import { CamporeeSummary } from "@/components/camporees/camporee-summary";
import { CamporeeStaffTab } from "@/components/camporees/camporee-staff-tab";
import { CamporeeEventsTab } from "@/components/camporee-events/camporee-events-tab";
import { EventJudgeAssignmentsPanel } from "@/components/camporee-scoring/event-judge-assignments-panel";
import { EventScoreEntryPanel } from "@/components/camporee-scoring/event-score-entry-panel";
import { CamporeeLeaderboard } from "@/components/camporee-scoring/camporee-leaderboard";
import { CamporeeScoreBreakdown } from "@/components/camporee-scoring/camporee-score-breakdown";
import type { CamporeeDetailData, LoadFailure } from "@/lib/camporees/detail-data";
import {
  CAMPOREE_GROUP_VIEWS,
  camporeeGroupHref,
  type CamporeeGroup,
} from "@/lib/camporees/groups";
import { isClubRegistrationClosed } from "@/lib/camporees/club-registration";
import { buildPendingItems, countEventsWithoutJudge } from "@/lib/camporees/summary";

const loadingBlock = () => <Skeleton className="h-48 w-full" />;

const CamporeeMembersTab = dynamic<CamporeeMembersTabProps>(
  () => import("@/components/camporees/camporee-members-tab").then((m) => m.CamporeeMembersTab),
  { ssr: false, loading: loadingBlock },
);
const CamporeeClubsTab = dynamic<CamporeeClubsTabProps>(
  () => import("@/components/camporees/camporee-clubs-tab").then((m) => m.CamporeeClubsTab),
  { ssr: false, loading: loadingBlock },
);
const CamporeePaymentsTab = dynamic<CamporeePaymentsTabProps>(
  () => import("@/components/camporees/camporee-payments-tab").then((m) => m.CamporeePaymentsTab),
  { ssr: false, loading: loadingBlock },
);
const CamporeePaymentOrdersTab = dynamic<CamporeePaymentOrdersTabProps>(
  () =>
    import("@/components/payment-orders/camporee-payment-orders-tab").then(
      (m) => m.CamporeePaymentOrdersTab,
    ),
  { ssr: false, loading: loadingBlock },
);
const CamporeeOrdersTab = dynamic(
  () => import("@/components/camporee-orders/camporee-orders-tab").then((m) => m.CamporeeOrdersTab),
  { ssr: false, loading: loadingBlock },
);
const CamporeeSuppliesTab = dynamic(
  () =>
    import("@/components/camporee-supplies/camporee-supplies-tab").then(
      (m) => m.CamporeeSuppliesTab,
    ),
  { ssr: false, loading: loadingBlock },
);

export interface CamporeeDetailTabsProps {
  data: CamporeeDetailData;
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canEditJudgeAssignments: boolean;
}

function FailureBlock({ failure, title }: { failure: LoadFailure; title: string }) {
  return <ErrorState kind={failure.kind} detail={failure.detail} title={title} retry />;
}

export function CamporeeDetailTabs({
  data,
  canCreateEvents,
  canEditEvents,
  canEditJudgeAssignments,
}: CamporeeDetailTabsProps) {
  const t = useTranslations("evaluation.camporees.detail");
  const tv = useTranslations("evaluation.camporees.views");
  const te = useTranslations("evaluation.camporees.errors");
  const tClubRegistration = useTranslations("camporees.clubRegistration");
  const router = useRouter();
  const searchParams = useSearchParams();

  const { kind, id: camporeeId, camporee, location } = data;
  const isUnion = kind === "union";
  const group = location.group;

  const [pending, setPending] = useState<PendingApprovals>(data.pending);
  const [pendingStaleAt, setPendingStaleAt] = useState<Date | null>(null);
  // Bumped after an approval so the member and club lists reload their rows.
  const [listsVersion, setListsVersion] = useState(0);

  const refreshPending = useCallback(async () => {
    try {
      const payload = isUnion
        ? await getUnionCamporeePendingApprovals(camporeeId)
        : await getCamporeePendingApprovals(camporeeId);
      if (payload && typeof payload === "object") {
        setPending({
          clubs: payload.clubs ?? [],
          members: payload.members ?? [],
          payments: payload.payments ?? [],
        });
        setPendingStaleAt(null);
      }
    } catch {
      // Keep the numbers on screen but say they may be old.
      setPendingStaleAt((previous) => previous ?? new Date());
    }
  }, [camporeeId, isUnion]);

  const pendingRegistrations = pending.members.length + pending.clubs.length;

  // The view inside the group lives in the URL but changes without a server trip.
  const explicitView = searchParams?.get("view");
  const initialView =
    group === "registrations" && !explicitView && pendingRegistrations === 0
      ? "members"
      : location.view;
  const [viewState, setViewState] = useState<{ group: CamporeeGroup; view: string | null }>({
    group,
    view: initialView,
  });
  const view = viewState.group === group ? viewState.view : initialView;

  const selectView = useCallback(
    (next: string) => {
      setViewState({ group, view: next });
      const params = new URLSearchParams(window.location.search);
      params.set("tab", group);
      params.set("view", next);
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    },
    [group],
  );

  const membersTotal = data.membersMeta?.total ?? data.members.length;
  const clubRegistrationClosed = isClubRegistrationClosed(camporee.club_registration_closed_at);
  const eventsWithoutJudge = countEventsWithoutJudge(data.events, data.assignmentsByEvent);
  const pendingItems = useMemo(
    () => buildPendingItems({ pending, eventsWithoutJudge }),
    [pending, eventsWithoutJudge],
  );

  const groupLabels: Record<CamporeeGroup, string> = {
    summary: tv("groups.summary"),
    registrations: tv("groups.registrations"),
    money: tv("groups.money"),
    program: tv("groups.program"),
    scores: tv("groups.scores"),
  };
  const countOf = (value: number) => (value > 0 ? value : undefined);
  const tabs = (Object.keys(groupLabels) as CamporeeGroup[]).map((key) => ({
    value: key,
    label: groupLabels[key],
    href: camporeeGroupHref(kind, camporeeId, key),
    count:
      key === "registrations"
        ? countOf(pendingRegistrations)
        : key === "money"
          ? countOf(pending.payments.length)
          : key === "program"
            ? countOf(data.events.length)
            : undefined,
  }));

  const withCount = (label: string, count: number | undefined) =>
    count && count > 0 ? tv("withCount", { label, count }) : label;

  const viewLabels: Record<string, string> = {
    pending: tv("views.pending"),
    members: tv("views.members"),
    clubs: tv("views.clubs"),
    payments: tv("views.payments"),
    orders: tv("views.orders"),
    merchandise: tv("views.merchandise"),
    supplies: tv("views.supplies"),
    events: tv("views.events"),
    staff: tv("views.staff"),
    judges: tv("views.judges"),
    entry: tv("views.entry"),
    results: tv("views.results"),
  };
  const viewOptions: SegmentedOption<string>[] = CAMPOREE_GROUP_VIEWS[group].map((key) => {
    const counts: Record<string, number | undefined> = {
      pending: pendingRegistrations,
      members: membersTotal,
      clubs: data.clubs.length,
      events: data.events.length,
    };
    return { value: key, label: withCount(viewLabels[key] ?? key, counts[key]) };
  });

  const scoringGate = !clubRegistrationClosed && (
    <Alert>
      <Lock />
      <AlertTitle>{tClubRegistration("scoringGateTitle")}</AlertTitle>
      <AlertDescription>{tClubRegistration("scoringGateBody")}</AlertDescription>
    </Alert>
  );

  let content: ReactNode = null;
  switch (group) {
    case "summary": {
      content = (
        <CamporeeSummary
          camporee={camporee}
          camporeeId={camporeeId}
          ownerName={isUnion ? data.unionName : (camporee.local_field?.name ?? null)}
          clubs={data.clubs}
          clubsFailed={data.clubsFailure !== null}
          members={data.members}
          membersMeta={data.membersMeta}
          membersFailed={data.membersFailure !== null}
          payments={data.payments}
          paymentOrders={data.paymentOrders}
          paymentsFailed={data.paymentsFailure !== null}
          eventsCount={data.events.length}
          eventsFailed={data.eventsFailure !== null}
          scoringEventsCount={data.events.filter((event) => event.scoring_enabled).length}
          pendingMembers={pending.members.length}
          pendingItems={pendingItems}
          pendingFailure={data.pendingFailure}
          pendingStaleAt={pendingStaleAt}
          onRetryPending={() => {
            if (data.pendingFailure) router.refresh();
            else void refreshPending();
          }}
        />
      );
      break;
    }
    case "registrations": {
      if (view === "members") {
        content = data.membersFailure ? (
          <FailureBlock failure={data.membersFailure} title={te("members")} />
        ) : (
          <CamporeeMembersTab
            key={listsVersion}
            camporeeId={camporeeId}
            initialMembers={data.members}
            initialMeta={data.membersMeta}
            isUnionCamporee={isUnion}
            onAfterChange={refreshPending}
          />
        );
      } else if (view === "clubs") {
        content = data.clubsFailure ? (
          <FailureBlock failure={data.clubsFailure} title={te("clubs")} />
        ) : (
          <CamporeeClubsTab
            key={listsVersion}
            camporeeId={camporeeId}
            initialClubs={data.clubs}
            isUnionCamporee={isUnion}
            localFieldId={camporee.local_field?.local_field_id ?? camporee.local_field_id ?? null}
            includesAdventurers={camporee.includes_adventurers ?? false}
            includesPathfinders={camporee.includes_pathfinders ?? false}
            includesMasterGuides={camporee.includes_master_guides ?? false}
            onAfterChange={refreshPending}
          />
        );
      } else {
        content = data.pendingFailure ? (
          <FailureBlock failure={data.pendingFailure} title={te("pending")} />
        ) : (
          <CamporeePendingQueue
            camporeeId={camporeeId}
            isUnionCamporee={isUnion}
            pending={pending}
            onChanged={() => {
              void refreshPending();
              setListsVersion((v) => v + 1);
              router.refresh();
            }}
          />
        );
      }
      break;
    }
    case "money": {
      if (view === "orders") {
        content = (
          <CamporeePaymentOrdersTab
            camporeeId={camporeeId}
            camporeeType={isUnion ? "union" : "local"}
          />
        );
      } else if (view === "merchandise") {
        content = (
          <CamporeeOrdersTab camporeeId={camporeeId} camporeeType={isUnion ? "union" : "local"} />
        );
      } else if (view === "supplies") {
        content = (
          <CamporeeSuppliesTab
            camporeeId={camporeeId}
            camporeeType={isUnion ? "union" : "local"}
          />
        );
      } else {
        content = data.paymentsFailure ? (
          <FailureBlock failure={data.paymentsFailure} title={te("payments")} />
        ) : (
          <CamporeePaymentsTab
            camporeeId={camporeeId}
            initialPayments={data.payments}
            initialMembers={data.members}
            initialOrders={data.paymentOrders}
            membersTotal={membersTotal}
            registrationCost={camporee.registration_cost}
            isUnionCamporee={isUnion}
            onAfterChange={refreshPending}
          />
        );
      }
      break;
    }
    case "program": {
      if (view === "staff") {
        content = (
          <CamporeeStaffTab
            camporeeId={camporeeId}
            camporeeType={isUnion ? "union" : "local"}
            canManage={canEditEvents}
          />
        );
      } else {
        content = data.eventsFailure ? (
          <FailureBlock failure={data.eventsFailure} title={te("events")} />
        ) : (
          <CamporeeEventsTab
            camporeeId={camporeeId}
            initialEvents={data.events}
            availableTemplates={data.availableTemplates}
            venues={data.venues}
            camporee={camporee}
            isUnionCamporee={isUnion}
            canCreate={canCreateEvents}
          />
        );
      }
      break;
    }
    case "scores": {
      if (data.scoresFailure) {
        content = <FailureBlock failure={data.scoresFailure} title={te("scores")} />;
      } else if (view === "entry") {
        content = (
          <div className="space-y-4">
            {scoringGate}
            <EventScoreEntryPanel
              camporeeId={camporeeId}
              isUnionCamporee={isUnion}
              events={data.events}
              rubricsByEvent={data.rubricsByEvent}
              targetsByEvent={data.scoringTargetsByEvent}
              judges={data.judges}
              assignmentsByEvent={data.assignmentsByEvent}
              canEdit={canEditEvents}
            />
          </div>
        );
      } else if (view === "results") {
        content = (
          <div className="space-y-8">
            <CamporeeLeaderboard
              leaderboard={data.leaderboard}
              events={data.events}
              targetsByEvent={data.scoringTargetsByEvent}
            />
            <CamporeeScoreBreakdown breakdown={data.scoreBreakdown} />
          </div>
        );
      } else {
        content = (
          <div className="space-y-4">
            {scoringGate}
            <EventJudgeAssignmentsPanel
              camporeeId={camporeeId}
              isUnionCamporee={isUnion}
              events={data.events}
              judges={data.judges}
              assignmentsByEvent={data.assignmentsByEvent}
              targetsByEvent={data.scoringTargetsByEvent}
              canEdit={canEditJudgeAssignments}
            />
          </div>
        );
      }
      break;
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <UrlTabs tabs={tabs} defaultValue="summary" ariaLabel={t("groupsLabel")} />
      {viewOptions.length > 0 && (
        <Segmented
          options={viewOptions}
          value={view ?? viewOptions[0]?.value ?? ""}
          onChange={selectView}
          label={t("viewsLabel", { group: groupLabels[group] })}
        />
      )}
      <div role="tabpanel" className="min-w-0">
        {content}
      </div>
    </div>
  );
}
