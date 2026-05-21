"use client";

import { useState, useCallback, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { getCamporeePendingApprovals } from "@/lib/api/camporees";
import type { CamporeeMembersTabProps } from "@/components/camporees/camporee-members-tab";
import type { CamporeeClubsTabProps } from "@/components/camporees/camporee-clubs-tab";
import type { CamporeePaymentsTabProps } from "@/components/camporees/camporee-payments-tab";
import { CamporeeEventsTab } from "@/components/camporee-events/camporee-events-tab";
import type { CamporeeEvent, CamporeeEventTemplate } from "@/lib/api/camporee-events";

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
  initialEvents?: CamporeeEvent[];
  availableTemplates?: CamporeeEventTemplate[];
  canCreateEvents?: boolean;
  canEditEvents?: boolean;
  canDeleteEvents?: boolean;
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
  canCreateEvents = false,
  canEditEvents = false,
  canDeleteEvents = false,
}: CamporeeDetailTabsProps) {
  const [pending, setPending] = useState<PendingApprovals>(initialPending);

  const refreshPending = useCallback(async () => {
    try {
      const payload = await getCamporeePendingApprovals(camporeeId);
      if (payload && typeof payload === "object") {
        setPending(payload as PendingApprovals);
      }
    } catch {
      // Informational — silently ignore
    }
  }, [camporeeId]);

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
                members={initialMembers}
                isUnionCamporee={isUnionCamporee}
                onAfterChange={refreshPending}
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Eventos ── */}
      <TabsContent value="events" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eventos del camporee</CardTitle>
          </CardHeader>
          <CardContent>
            <CamporeeEventsTab
              camporeeId={camporeeId}
              initialEvents={initialEvents}
              availableTemplates={availableTemplates}
              isUnionCamporee={isUnionCamporee}
              canCreate={canCreateEvents}
              canEdit={canEditEvents}
              canDelete={canDeleteEvents}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
