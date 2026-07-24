"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
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
import { UserAvatar } from "@/components/users/user-avatar";
import { Users } from "lucide-react";
import { useFormatCurrency } from "@/lib/format-locale";
import { cn } from "@/lib/utils";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";
import type { CamporeeMember, CamporeePayment } from "@/lib/api/camporees";
import { getCamporeeMemberDisplayName } from "@/lib/camporees/member-display";

export type MemberPaymentStatus = "paid" | "partial" | "pending" | "unpaid";

export type MemberPaymentRow = {
  member: CamporeeMember;
  status: MemberPaymentStatus;
  inscriptionPaid: number;
  paymentsCount: number;
};

function isActiveMember(member: CamporeeMember) {
  const status = member.status?.toLowerCase();
  return status !== "rejected" && status !== "cancelled";
}

/** Prisma Decimal often serializes as `"450.00"` — coerce before summing. */
export function parsePaymentAmount(amount: unknown): number {
  const n = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Money that counts toward COBRADO (approved-only product rule).
 * Missing status is treated as collected for legacy rows without status.
 * On-time createPayment uses `registered` — that does NOT count as cobrado.
 */
export function isCollectedPaymentStatus(status?: string | null): boolean {
  const normalized = status?.toLowerCase();
  return !normalized || normalized === "approved";
}

export function isPendingPaymentStatus(status?: string | null): boolean {
  return status?.toLowerCase() === "pending_approval";
}

function isCountableInscriptionPayment(payment: CamporeePayment) {
  if (payment.payment_type !== "inscription") return false;
  const status = payment.status?.toLowerCase();
  return status !== "rejected";
}

/** Match API nested `camporee_member` / `camporee_member_id` or flat `member_id`. */
export function paymentBelongsToMember(
  payment: CamporeePayment,
  member: CamporeeMember,
): boolean {
  const nested = payment.camporee_member;
  if (nested?.user_id && nested.user_id === member.user_id) return true;

  if (member.camporee_member_id != null) {
    if (payment.camporee_member_id === member.camporee_member_id) return true;
    if (nested?.camporee_member_id === member.camporee_member_id) return true;
    if (payment.member_id === String(member.camporee_member_id)) return true;
  }

  // Legacy / flattened shape: member_id is the user UUID
  if (payment.member_id && payment.member_id === member.user_id) return true;

  return false;
}

export function buildMemberPaymentRows(
  members: CamporeeMember[],
  payments: CamporeePayment[],
  registrationCost?: number | null,
): MemberPaymentRow[] {
  const cost = typeof registrationCost === "number" && registrationCost > 0
    ? registrationCost
    : null;

  return members.filter(isActiveMember).map((member) => {
    const memberPayments = payments.filter(
      (payment) =>
        paymentBelongsToMember(payment, member) &&
        isCountableInscriptionPayment(payment),
    );
    const collected = memberPayments.filter((payment) =>
      isCollectedPaymentStatus(payment.status),
    );
    const pending = memberPayments.filter((payment) =>
      isPendingPaymentStatus(payment.status),
    );
    const inscriptionPaid = collected.reduce(
      (sum, payment) => sum + parsePaymentAmount(payment.amount),
      0,
    );

    let status: MemberPaymentStatus = "unpaid";
    if (pending.length > 0 && inscriptionPaid === 0) {
      status = "pending";
    } else if (cost != null) {
      if (inscriptionPaid >= cost) status = "paid";
      else if (inscriptionPaid > 0) status = "partial";
      else if (pending.length > 0) status = "pending";
    } else if (inscriptionPaid > 0) {
      status = "paid";
    } else if (pending.length > 0) {
      status = "pending";
    }

    return {
      member,
      status,
      inscriptionPaid,
      paymentsCount: memberPayments.length,
    };
  });
}

export function computePaymentBalance(
  members: CamporeeMember[],
  payments: CamporeePayment[],
  registrationCost?: number | null,
  membersTotal?: number,
) {
  const activeMembers = members.filter(isActiveMember);
  const enrolledCount =
    typeof membersTotal === "number" && membersTotal > 0
      ? membersTotal
      : activeMembers.length;
  const unitCost =
    typeof registrationCost === "number" && Number.isFinite(registrationCost)
      ? registrationCost
      : null;
  const expectedTotal = unitCost != null ? enrolledCount * unitCost : null;

  const inscriptionPayments = payments.filter(isCountableInscriptionPayment);
  const collectedApproved = inscriptionPayments
    .filter((payment) => isCollectedPaymentStatus(payment.status))
    .reduce((sum, payment) => sum + parsePaymentAmount(payment.amount), 0);
  const collectedPending = inscriptionPayments
    .filter((payment) => isPendingPaymentStatus(payment.status))
    .reduce((sum, payment) => sum + parsePaymentAmount(payment.amount), 0);

  const rows = buildMemberPaymentRows(members, payments, registrationCost);
  const unpaidCount = rows.filter((row) => row.status === "unpaid").length;
  const paidCount = rows.filter((row) => row.status === "paid").length;
  const pendingCount = rows.filter(
    (row) => row.status === "pending" || row.status === "partial",
  ).length;

  return {
    enrolledCount,
    unitCost,
    expectedTotal,
    collectedApproved,
    collectedPending,
    outstanding:
      expectedTotal != null
        ? Math.max(expectedTotal - collectedApproved, 0)
        : null,
    unpaidCount,
    paidCount,
    pendingCount,
    rows,
  };
}

interface CamporeePaymentBalanceProps {
  members: CamporeeMember[];
  payments: CamporeePayment[];
  registrationCost?: number | null;
  membersTotal?: number;
}

export function CamporeePaymentBalance({
  members,
  payments,
  registrationCost,
  membersTotal,
}: CamporeePaymentBalanceProps) {
  const t = useTranslations("camporees.paymentsBalance");
  const formatCurrency = useFormatCurrency();

  const balance = useMemo(
    () => computePaymentBalance(members, payments, registrationCost, membersTotal),
    [members, membersTotal, payments, registrationCost],
  );

  const statusLabel: Record<MemberPaymentStatus, string> = {
    paid: t("statusPaid"),
    partial: t("statusPartial"),
    pending: t("statusPending"),
    unpaid: t("statusUnpaid"),
  };

  const statusIntent: Record<
    MemberPaymentStatus,
    "success" | "warning" | "info" | "neutral"
  > = {
    paid: "success",
    partial: "warning",
    pending: "info",
    unpaid: "neutral",
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-muted/30 p-4 ring-1 ring-foreground/10">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("statEnrolled")}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {balance.enrolledCount}
          </p>
          {balance.unitCost != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("statUnitCost", { amount: formatCurrency(balance.unitCost) })}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-muted/30 p-4 ring-1 ring-foreground/10">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("statExpected")}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {balance.expectedTotal != null
              ? formatCurrency(balance.expectedTotal)
              : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("statExpectedHint")}</p>
        </div>

        <div className="rounded-2xl bg-muted/30 p-4 ring-1 ring-foreground/10">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("statCollected")}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400">
            {formatCurrency(balance.collectedApproved)}
          </p>
          {balance.collectedPending > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("statPendingReview", {
                amount: formatCurrency(balance.collectedPending),
              })}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-muted/30 p-4 ring-1 ring-foreground/10">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("statOutstanding")}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {balance.outstanding != null ? formatCurrency(balance.outstanding) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("statCoverage", {
              paid: balance.paidCount,
              unpaid: balance.unpaidCount,
              pending: balance.pendingCount,
            })}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
          <p className="text-sm font-medium">{t("membersTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("membersDescription")}</p>
        </div>

        {balance.rows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title={t("emptyMembersTitle")}
              description={t("emptyMembersDescription")}
              variant="no-results"
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead>{t("colMember")}</TableHead>
                <TableHead>{t("colClub")}</TableHead>
                <TableHead className="text-right">{t("colPaid")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balance.rows.map((row, index) => {
                const displayName = getCamporeeMemberDisplayName(
                  row.member,
                  t("unknownMember"),
                );
                const secondary =
                  row.member.class_name?.trim() ||
                  (row.member.email && row.member.email !== displayName
                    ? row.member.email
                    : null);

                return (
                  <TableRow
                    key={row.member.user_id}
                    className={cn(STAGGER_CLASSES)}
                    style={getStaggerStyle(index, 35)}
                  >
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar
                          src={row.member.picture_url}
                          name={displayName}
                          email={row.member.email}
                          size={36}
                          className="size-9"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <p className="truncate text-sm font-medium text-foreground">
                            {displayName}
                          </p>
                          {secondary && (
                            <p className="truncate text-xs text-muted-foreground">
                              {secondary}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.member.club_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(row.inscriptionPaid)}
                      {balance.unitCost != null && (
                        <span className="text-muted-foreground">
                          {" "}
                          / {formatCurrency(balance.unitCost)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        intent={statusIntent[row.status]}
                        size="xs"
                        label={statusLabel[row.status]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
