"use client";

import { useState, useCallback, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import {
  getCamporeePendingApprovals,
  getUnionCamporeePendingApprovals,
} from "@/lib/api/camporees";
import type { CamporeeMembersTabProps } from "@/components/camporees/camporee-members-tab";
import type { CamporeeClubsTabProps } from "@/components/camporees/camporee-clubs-tab";
import type { CamporeePaymentsTabProps } from "@/components/camporees/camporee-payments-tab";
import { CamporeeEventsTab } from "@/components/camporee-events/camporee-events-tab";
import { EventJudgeAssignmentsPanel } from "@/components/camporee-scoring/event-judge-assignments-panel";
import { EventScoreEntryPanel } from "@/components/camporee-scoring/event-score-entry-panel";
import { CamporeeLeaderboard } from "@/components/camporee-scoring/camporee-leaderboard";
import type { BackendCamporeeEvent, CamporeeEventTemplate } from "@/lib/api/camporee-events";
import type { CamporeeVenue } from "@/lib/api/camporee-venues";
import type {
  CamporeeEventJudgeAssignment,
  CamporeeEventRubric,
  CamporeeJudge,
  CamporeeLeaderboard,
  CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";

const CamporeeMembersTab = dynamic<CamporeeMembersTabProps>(
  () =>
    import("@/components/camporees/camporee-members-tab").then(
      (m) => m.CamporeeMembersTab,
    ),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);

const CamporeeClubsTab = dynamic<CamporeeClubsTabProps>(
  () =>
    import("@/components/camporees/camporee-clubs-tab").then(
      (m) => m.CamporeeClubsTab,
    ),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);

const CamporeePaymentsTab = dynamic<CamporeePaymentsTabProps>(
  () =>
    import("@/components/camporees/camporee-payments-tab").then(
      (m) => m.CamporeePaymentsTab,
    ),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);
import type {
  Camporee,
  CamporeeMember,
  CamporeeClub,
  CamporeePayment,
  PendingApprovals,
  PaginationMeta,
} from "@/lib/api/camporees";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CamporeeDetailTabsProps {
  camporeeId: number;
  /**
   * Full camporee record — needed to forward local field + section flags to
   * the enroll-club dialog (club + section selects must scope by these).
   */
  camporee?: Camporee;
  initialMembers: CamporeeMember[];
  initialMembersMeta?: PaginationMeta;
  initialClubs: CamporeeClub[];
  initialPayments: CamporeePayment[];
  initialPending: PendingApprovals;
  membersError: string | null;
  clubsError: string | null;
  paymentsError: string | null;
  isUnionCamporee?: boolean;
  /** Server-rendered info tab content passed as a slot */
  infoContent: ReactNode;
  // ── Events tab ───────────────────────────────────────────────────────────────
  initialEvents?: BackendCamporeeEvent[];
  availableTemplates?: CamporeeEventTemplate[];
  /** Venues accessible to this camporee for timeline display */
  initialVenues?: CamporeeVenue[];
  initialJudges?: CamporeeJudge[];
  initialAssignmentsByEvent?: Record<number, CamporeeEventJudgeAssignment[]>;
  initialScoringTargetsByEvent?: Record<number, CamporeeScoringTarget[]>;
  initialRubricsByEvent?: Record<number, CamporeeEventRubric[]>;
  initialLeaderboard?: CamporeeLeaderboard | null;
  canCreateEvents?: boolean;
  canEditEvents?: boolean;
  canDeleteEvents?: boolean;
  /** Assign / replace / remove event judge assignments. */
  canEditJudgeAssignments?: boolean;
  /** Active tab from ?tab= URL (e.g. after create/update event redirect). */
  initialTab?: string;
}

const CAMPOREE_DETAIL_TABS = new Set([
  "info",
  "members",
  "clubs",
  "payments",
  "events",
  "judges",
  "scores",
  "ranking",
]);

function resolveInitialTab(tab: string | undefined): string {
  if (tab && CAMPOREE_DETAIL_TABS.has(tab)) return tab;
  return "info";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CamporeeDetailTabs({
  camporeeId,
  camporee,
  initialMembers,
  initialMembersMeta,
  initialClubs,
  initialPayments,
  initialPending,
  membersError,
  clubsError,
  paymentsError,
  isUnionCamporee = false,
  infoContent,
  initialEvents = [],
  availableTemplates = [],
  initialVenues = [],
  initialJudges = [],
  initialAssignmentsByEvent = {},
  initialScoringTargetsByEvent = {},
  initialRubricsByEvent = {},
  initialLeaderboard = null,
  canCreateEvents = false,
  canEditEvents = false,
  canDeleteEvents = false,
  canEditJudgeAssignments = false,
  initialTab,
}: CamporeeDetailTabsProps) {
  const [pending, setPending] = useState<PendingApprovals>(initialPending);
  const totalJudgeAssignments = Object.values(initialAssignmentsByEvent)
    .flat()
    .filter((assignment) => assignment.active).length;

  const refreshPending = useCallback(async () => {
    try {
      const payload = isUnionCamporee
        ? await getUnionCamporeePendingApprovals(camporeeId)
        : await getCamporeePendingApprovals(camporeeId);
      if (payload && typeof payload === "object") {
        setPending(payload as PendingApprovals);
      }
    } catch {
      // Informational — silently ignore
    }
  }, [camporeeId, isUnionCamporee]);

  const activeTab = resolveInitialTab(initialTab);

  return (
    <Tabs key={activeTab} defaultValue={activeTab} className="w-full min-w-0">
      <TabsList className="h-auto min-h-8 w-full flex-wrap">
        <TabsTrigger value="info">Información</TabsTrigger>

        <TabsTrigger value="members">
          Miembros
          {(initialMembersMeta?.total ?? initialMembers.length) > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {initialMembersMeta?.total ?? initialMembers.length}
            </Badge>
          )}
          {pending.members.length > 0 && (
            <Badge variant="warning" className="ml-1">
              {pending.members.length}
            </Badge>
          )}
        </TabsTrigger>

        <TabsTrigger value="clubs">
          Clubes
          {initialClubs.length > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {initialClubs.length}
            </Badge>
          )}
          {pending.clubs.length > 0 && (
            <Badge variant="warning" className="ml-1">
              {pending.clubs.length}
            </Badge>
          )}
        </TabsTrigger>

        <TabsTrigger value="payments">
          Pagos
          {initialPayments.length > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {initialPayments.length}
            </Badge>
          )}
          {pending.payments.length > 0 && (
            <Badge variant="warning" className="ml-1">
              {pending.payments.length}
            </Badge>
          )}
        </TabsTrigger>

        <TabsTrigger value="events">
          Eventos
          {initialEvents.length > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {initialEvents.length}
            </Badge>
          )}
        </TabsTrigger>

        <TabsTrigger value="judges">
          Jueces
          {totalJudgeAssignments > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {totalJudgeAssignments}
            </Badge>
          )}
        </TabsTrigger>

        <TabsTrigger value="scores">Puntajes</TabsTrigger>

        <TabsTrigger value="ranking">
          Clasificación
          {(initialLeaderboard?.rows.length ?? 0) > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {initialLeaderboard?.rows.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── Informacion ── */}
      <TabsContent value="info" className="mt-4">
        {infoContent}
      </TabsContent>

      {/* ── Miembros ── */}
      <TabsContent value="members" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Miembros inscritos</CardTitle>
          </CardHeader>
          <CardContent>
            {membersError ? (
              <EndpointErrorBanner state="missing" detail={membersError} />
            ) : (
              <CamporeeMembersTab
                camporeeId={camporeeId}
                initialMembers={initialMembers}
                initialMeta={initialMembersMeta}
                isUnionCamporee={isUnionCamporee}
                onAfterChange={refreshPending}
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Clubes ── */}
      <TabsContent value="clubs" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clubes inscritos</CardTitle>
          </CardHeader>
          <CardContent>
            {clubsError ? (
              <EndpointErrorBanner state="missing" detail={clubsError} />
            ) : (
              <CamporeeClubsTab
                camporeeId={camporeeId}
                initialClubs={initialClubs}
                isUnionCamporee={isUnionCamporee}
                localFieldId={
                  camporee?.local_field?.local_field_id ??
                  camporee?.local_field_id ??
                  null
                }
                includesAdventurers={camporee?.includes_adventurers ?? false}
                includesPathfinders={camporee?.includes_pathfinders ?? false}
                includesMasterGuides={camporee?.includes_master_guides ?? false}
                onAfterChange={refreshPending}
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Pagos ── */}
      <TabsContent value="payments" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsError ? (
              <EndpointErrorBanner state="missing" detail={paymentsError} />
            ) : (
              <CamporeePaymentsTab
                camporeeId={camporeeId}
                initialPayments={initialPayments}
                initialMembers={initialMembers}
                membersTotal={initialMembersMeta?.total ?? initialMembers.length}
                registrationCost={camporee?.registration_cost}
                isUnionCamporee={isUnionCamporee}
                onAfterChange={refreshPending}
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Eventos ── */}
      {/*
        Timeline (Variant K) is intentionally rendered without a wrapping
        <Card>. The timeline owns its own per-day Card surfaces — wrapping it
        in another Card+CardContent (px-6) shrinks the inner width and
        squishes the 8-column event-row grid
        (md:grid-cols-[88px_1fr_220px_180px_180px_140px_110px_auto]).
        See docs/superpowers/specs/2026-05-20-camporee-timeline-admin-design.md.
      */}
      <TabsContent value="events" className="mt-4">
        <CamporeeEventsTab
          camporeeId={camporeeId}
          initialEvents={initialEvents}
          availableTemplates={availableTemplates}
          venues={initialVenues}
          camporee={camporee}
          isUnionCamporee={isUnionCamporee}
          canCreate={canCreateEvents}
        />
      </TabsContent>

      <TabsContent value="judges" className="mt-4">
        <EventJudgeAssignmentsPanel
          camporeeId={camporeeId}
          isUnionCamporee={isUnionCamporee}
          events={initialEvents}
          judges={initialJudges}
          assignmentsByEvent={initialAssignmentsByEvent}
          targetsByEvent={initialScoringTargetsByEvent}
          canEdit={canEditJudgeAssignments}
        />
      </TabsContent>

      <TabsContent value="scores" className="mt-4">
        <EventScoreEntryPanel
          camporeeId={camporeeId}
          isUnionCamporee={isUnionCamporee}
          events={initialEvents}
          rubricsByEvent={initialRubricsByEvent}
          targetsByEvent={initialScoringTargetsByEvent}
          judges={initialJudges}
          assignmentsByEvent={initialAssignmentsByEvent}
          canEdit={canEditEvents}
        />
      </TabsContent>

      <TabsContent value="ranking" className="mt-4">
        <CamporeeLeaderboard leaderboard={initialLeaderboard} />
      </TabsContent>
    </Tabs>
  );
}
