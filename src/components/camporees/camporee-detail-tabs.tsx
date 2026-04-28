"use client";

import { useState, useCallback, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { CamporeeMembersTab } from "@/components/camporees/camporee-members-tab";
import { CamporeeClubsTab } from "@/components/camporees/camporee-clubs-tab";
import { CamporeePaymentsTab } from "@/components/camporees/camporee-payments-tab";
import { getCamporeePendingApprovals } from "@/lib/api/camporees";
import type {
  CamporeeMember,
  CamporeeClub,
  CamporeePayment,
  PendingApprovals,
  PaginationMeta,
} from "@/lib/api/camporees";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CamporeeDetailTabsProps {
  camporeeId: number;
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
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CamporeeDetailTabs({
  camporeeId,
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
        <TabsTrigger value="info">Informacion</TabsTrigger>

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
    </Tabs>
  );
}
