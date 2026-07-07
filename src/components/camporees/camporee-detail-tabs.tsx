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
import { CamporeeStaffPanel } from "@/components/camporee-staff/camporee-staff-panel";
import type { BackendCamporeeEvent, CamporeeEventTemplate } from "@/lib/api/camporee-events";
import type { CamporeeVenue } from "@/lib/api/camporee-venues";
import type {
  CamporeeStaffCandidate,
  CamporeeStaffMember,
} from "@/lib/api/camporee-staff";
import type {
  CamporeeEventJudgeAssignment,
  CamporeeEventRubric,
  CamporeeJudge,
  CamporeeJudgeCandidate,
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
  initialStaff?: CamporeeStaffMember[];
  staffCandidates?: CamporeeStaffCandidate[];
  staffError?: string | null;
  isUnionCamporee?: boolean;
  /** Server-rendered info tab content passed as a slot */
  infoContent: ReactNode;
  // ── Events tab ───────────────────────────────────────────────────────────────
  initialEvents?: BackendCamporeeEvent[];
  availableTemplates?: CamporeeEventTemplate[];
  /** Venues accessible to this camporee for timeline display */
  initialVenues?: CamporeeVenue[];
  initialJudges?: CamporeeJudge[];
  judgeCandidates?: CamporeeJudgeCandidate[];
  judgeCandidatesError?: string | null;
  initialAssignmentsByEvent?: Record<number, CamporeeEventJudgeAssignment[]>;
  initialScoringTargetsByEvent?: Record<number, CamporeeScoringTarget[]>;
  initialRubricsByEvent?: Record<number, CamporeeEventRubric[]>;
  initialLeaderboard?: CamporeeLeaderboard | null;
  canCreateEvents?: boolean;
  canEditEvents?: boolean;
  canDeleteEvents?: boolean;
  canManageClubRegistration?: boolean;
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
  initialStaff = [],
  staffCandidates = [],
  staffError = null,
  isUnionCamporee = false,
  infoContent,
  initialEvents = [],
  availableTemplates = [],
  initialVenues = [],
  initialJudges = [],
  judgeCandidates = [],
  judgeCandidatesError = null,
  initialAssignmentsByEvent = {},
  initialScoringTargetsByEvent = {},
  initialRubricsByEvent = {},
  initialLeaderboard = null,
  canCreateEvents = false,
  canEditEvents = false,
  canDeleteEvents = false,
  canManageClubRegistration = false,
}: CamporeeDetailTabsProps) {
  const [pending, setPending] = useState<PendingApprovals>(initialPending);

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

  return (
    <Tabs defaultValue="info">
      <TabsList>
        <TabsTrigger value="info">Información</TabsTrigger>

        <TabsTrigger value="members">
          Miembros
          {(initialMembersMeta?.total ?? initialMembers.length) > 0 && (
            <Badge variant="secondary" className="ml-2">
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
            <Badge variant="secondary" className="ml-2">
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
            <Badge variant="secondary" className="ml-2">
              {initialPayments.length}
            </Badge>
          )}
          {pending.payments.length > 0 && (
            <Badge variant="warning" className="ml-1">
              {pending.payments.length}
            </Badge>
          )}
        </TabsTrigger>

        <TabsTrigger value="staff">
          Personal
          {initialStaff.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {initialStaff.length}
            </Badge>
          )}
        </TabsTrigger>

        <TabsTrigger value="events">
          Eventos
          {initialEvents.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {initialEvents.length}
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
                clubRegistrationClosedAt={camporee?.club_registration_closed_at ?? null}
                canManageClubRegistration={canManageClubRegistration}
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
                isUnionCamporee={isUnionCamporee}
                onAfterChange={refreshPending}
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Personal ── */}
      <TabsContent value="staff" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal del camporee</CardTitle>
          </CardHeader>
          <CardContent>
            {staffError ? (
              <EndpointErrorBanner state="missing" detail={staffError} />
            ) : (
              <CamporeeStaffPanel
                camporeeId={camporeeId}
                isUnionCamporee={isUnionCamporee}
                staff={initialStaff}
                candidates={staffCandidates}
                canEdit={canEditEvents}
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
          canEdit={canEditEvents}
          canDelete={canDeleteEvents}
          initialJudges={initialJudges}
          judgeCandidates={judgeCandidates}
          judgeCandidatesError={judgeCandidatesError}
          assignmentsByEvent={initialAssignmentsByEvent}
          scoringTargetsByEvent={initialScoringTargetsByEvent}
          rubricsByEvent={initialRubricsByEvent}
          leaderboard={initialLeaderboard}
        />
      </TabsContent>
    </Tabs>
  );
}
