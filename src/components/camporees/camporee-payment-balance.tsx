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

/** Inscription money from field_payment_orders (centavos already converted to pesos). */
export type InscriptionOrderCredit = {
  userId?: string | null;
  camporeeMemberId?: number | null;
  amount: number;
  kind: "approved" | "pending";
};

function pesosFromCentavos(centavos: number | null | undefined): number {
  if (typeof centavos !== "number" || !Number.isFinite(centavos)) return 0;
  return Math.round(centavos) / 100;
}

function creditMatchesMember(
  credit: InscriptionOrderCredit,
  member: CamporeeMember,
): boolean {
  if (
    credit.camporeeMemberId != null &&
    member.camporee_member_id === credit.camporeeMemberId
  ) {
    return true;
  }
  return Boolean(credit.userId && credit.userId === member.user_id);
}

/** Map listed CAMPOREE orders into per-beneficiary inscription credits. */
export function inscriptionCreditsFromOrders(
  orders: Array<{
    purpose?: string;
    status?: string;
    unit_cost_centavos?: number;
    lines?: Array<{
      beneficiary_user_id?: string;
      camporee_member_id?: number | null;
      unit_cost_centavos?: number;
    }>;
  }>,
): InscriptionOrderCredit[] {
  const credits: InscriptionOrderCredit[] = [];
  for (const order of orders) {
    if (order.purpose && order.purpose !== "CAMPOREE") continue;
    const kind =
      order.status === "APPROVED"
        ? "approved"
        : order.status === "PROOF_SUBMITTED"
          ? "pending"
          : null;
    if (!kind) continue;
    const fallback = pesosFromCentavos(order.unit_cost_centavos);
    for (const line of order.lines ?? []) {
      credits.push({
        userId: line.beneficiary_user_id,
        camporeeMemberId: line.camporee_member_id,
        amount: line.unit_cost_centavos != null
          ? pesosFromCentavos(line.unit_cost_centavos)
          : fallback,
        kind,
      });
    }
  }
  return credits;
}

export type CamporeeLedgerSource = "camporee_payment" | "payment_order";

export type CamporeeLedgerPayment = CamporeePayment & {
  ledgerSource: CamporeeLedgerSource;
};

type PaymentOrderLedgerLine = {
  field_payment_order_line_id?: string;
  beneficiary_user_id?: string;
  camporee_member_id?: number | null;
  unit_cost_centavos?: number;
  full_name?: string | null;
  beneficiary_full_name?: string | null;
  beneficiary?: { full_name?: string | null } | null;
};

export type PaymentOrderLedgerInput = {
  purpose?: string;
  status?: string;
  folio_reference?: string | null;
  field_payment_order_id?: string;
  unit_cost_centavos?: number;
  created_at?: string;
  lines?: PaymentOrderLedgerLine[];
};

function nestedLineName(line: PaymentOrderLedgerLine): string | null {
  const nested = line.beneficiary?.full_name?.trim();
  return line.full_name?.trim() || line.beneficiary_full_name?.trim() || nested || null;
}

function findMemberForOrderLine(
  line: PaymentOrderLedgerLine,
  members: CamporeeMember[],
): CamporeeMember | undefined {
  return members.find((member) => {
    if (
      line.camporee_member_id != null &&
      member.camporee_member_id === line.camporee_member_id
    ) {
      return true;
    }
    return Boolean(line.beneficiary_user_id && member.user_id === line.beneficiary_user_id);
  });
}

function lineMatchesPayment(
  line: PaymentOrderLedgerLine,
  payment: CamporeePayment,
): boolean {
  if (line.camporee_member_id != null) {
    if (payment.camporee_member_id === line.camporee_member_id) return true;
    if (payment.camporee_member?.camporee_member_id === line.camporee_member_id) {
      return true;
    }
    if (payment.member_id === String(line.camporee_member_id)) return true;
  }
  if (line.beneficiary_user_id) {
    if (payment.camporee_member?.user_id === line.beneficiary_user_id) return true;
    if (payment.member_id === line.beneficiary_user_id) return true;
  }
  return false;
}

/** True when a camporee_payments row already represents this order line. */
export function paymentCoversOrderLine(
  payment: CamporeePayment,
  order: PaymentOrderLedgerInput,
  line: PaymentOrderLedgerLine,
): boolean {
  if (payment.payment_type && payment.payment_type !== "inscription") return false;
  if (payment.status?.toLowerCase() === "rejected") return false;

  const memberMatch = lineMatchesPayment(line, payment);
  const orderId = order.field_payment_order_id;
  const notesHit = Boolean(
    orderId && (payment.notes ?? "").includes(`field_payment_order:${orderId}`),
  );
  const folioHit = Boolean(
    order.folio_reference && payment.reference === order.folio_reference,
  );

  if (notesHit || folioHit) {
    if (memberMatch) return true;
    return (order.lines?.length ?? 0) === 1;
  }

  return memberMatch;
}

function synthesizeOrderLinePayment(
  order: PaymentOrderLedgerInput,
  line: PaymentOrderLedgerLine,
  members: CamporeeMember[],
  index: number,
): CamporeeLedgerPayment {
  const member = findMemberForOrderLine(line, members);
  const amount =
    line.unit_cost_centavos != null
      ? pesosFromCentavos(line.unit_cost_centavos)
      : pesosFromCentavos(order.unit_cost_centavos);
  const status = order.status === "APPROVED" ? "approved" : "pending_approval";
  const lineKey =
    line.field_payment_order_line_id ??
    `${order.field_payment_order_id ?? order.folio_reference ?? "order"}:${line.beneficiary_user_id ?? index}`;

  return {
    camporee_payment_id: `order-line:${lineKey}`,
    camporee_member_id: line.camporee_member_id ?? member?.camporee_member_id ?? null,
    member_id: line.beneficiary_user_id ?? member?.user_id,
    member_name:
      (member ? getCamporeeMemberDisplayName(member) : nestedLineName(line)) ??
      line.beneficiary_user_id ??
      null,
    amount,
    payment_type: "inscription",
    reference: order.folio_reference ?? null,
    notes: order.field_payment_order_id
      ? `field_payment_order:${order.field_payment_order_id}`
      : null,
    paid_at: status === "approved" ? order.created_at ?? null : null,
    created_at: order.created_at ?? null,
    status,
    ledgerSource: "payment_order",
  };
}

/**
 * Ledger rows for the Pagos tab: real camporee_payments plus CAMPOREE order
 * lines (APPROVED / PROOF_SUBMITTED) that do not already have a matching
 * payment row. Matching payments win so edit/approve stay on the UUID.
 */
export function mergeCamporeePaymentLedger(
  payments: CamporeePayment[],
  orders: PaymentOrderLedgerInput[],
  members: CamporeeMember[] = [],
): CamporeeLedgerPayment[] {
  const real: CamporeeLedgerPayment[] = payments.map((payment) => ({
    ...payment,
    member_name: resolveCamporeePaymentMemberName(payment, members),
    ledgerSource: "camporee_payment",
  }));
  const used = new Set<number>();
  const extra: CamporeeLedgerPayment[] = [];
  let syntheticIndex = 0;

  for (const order of orders) {
    if (order.purpose && order.purpose !== "CAMPOREE") continue;
    if (order.status !== "APPROVED" && order.status !== "PROOF_SUBMITTED") continue;

    for (const line of order.lines ?? []) {
      const covering = real.findIndex(
        (payment, index) =>
          !used.has(index) && paymentCoversOrderLine(payment, order, line),
      );
      if (covering >= 0) {
        used.add(covering);
        continue;
      }
      extra.push(synthesizeOrderLinePayment(order, line, members, syntheticIndex));
      syntheticIndex += 1;
    }
  }

  return [...real, ...extra];
}

export function isLedgerPaymentMutable(
  payment: CamporeePayment & { ledgerSource?: CamporeeLedgerSource },
): boolean {
  if (payment.ledgerSource === "payment_order") return false;
  return Boolean(payment.camporee_payment_id);
}

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

function nestedPaymentUserName(payment: CamporeePayment): string | null {
  const users = payment.camporee_member?.users;
  if (!users) return null;
  const name = [users.name, users.paternal_last_name, users.maternal_last_name]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();
  return name.length > 0 ? name : null;
}

/**
 * Ledger/member label for a camporee_payments row.
 * GET /payments often omits `member_name`; fall back to the roster, then nested users.
 */
export function resolveCamporeePaymentMemberName(
  payment: CamporeePayment,
  members: CamporeeMember[] = [],
): string | null {
  const member = members.find((row) => paymentBelongsToMember(payment, row));
  if (member) {
    const label = getCamporeeMemberDisplayName(member);
    if (label) return label;
  }

  const nested = nestedPaymentUserName(payment);
  if (nested) return nested;

  const flat = payment.member_name?.trim();
  if (flat && flat !== payment.member_id && flat !== payment.camporee_member?.user_id) {
    return flat;
  }

  return null;
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
  orderCredits: InscriptionOrderCredit[] = [],
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
    const legacyPaid = collected.reduce(
      (sum, payment) => sum + parsePaymentAmount(payment.amount),
      0,
    );
    const memberCredits = orderCredits.filter((credit) =>
      creditMatchesMember(credit, member),
    );
    const orderPaid = memberCredits
      .filter((credit) => credit.kind === "approved")
      .reduce((sum, credit) => sum + credit.amount, 0);
    const orderPending = memberCredits
      .filter((credit) => credit.kind === "pending")
      .reduce((sum, credit) => sum + credit.amount, 0);
    // Fulfillment may also write camporee_payments; never double-count the same member.
    const inscriptionPaid = Math.max(legacyPaid, orderPaid);
    const hasPending = pending.length > 0 || orderPending > 0;

    let status: MemberPaymentStatus = "unpaid";
    if (hasPending && inscriptionPaid === 0) {
      status = "pending";
    } else if (cost != null) {
      if (inscriptionPaid >= cost) status = "paid";
      else if (inscriptionPaid > 0) status = "partial";
      else if (hasPending) status = "pending";
    } else if (inscriptionPaid > 0) {
      status = "paid";
    } else if (hasPending) {
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
  orderCredits: InscriptionOrderCredit[] = [],
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
  const legacyCollected = inscriptionPayments
    .filter((payment) => isCollectedPaymentStatus(payment.status))
    .reduce((sum, payment) => sum + parsePaymentAmount(payment.amount), 0);
  const legacyPending = inscriptionPayments
    .filter((payment) => isPendingPaymentStatus(payment.status))
    .reduce((sum, payment) => sum + parsePaymentAmount(payment.amount), 0);

  const rows = buildMemberPaymentRows(
    members,
    payments,
    registrationCost,
    orderCredits,
  );
  const collectedFromRows = rows.reduce(
    (sum, row) => sum + row.inscriptionPaid,
    0,
  );
  const unmatchedApproved = orderCredits
    .filter(
      (credit) =>
        credit.kind === "approved" &&
        !activeMembers.some((member) => creditMatchesMember(credit, member)),
    )
    .reduce((sum, credit) => sum + credit.amount, 0);
  // Prefer per-member max(legacy, order) so approved orders and a later
  // camporee_payments row for the same person do not inflate COBRADO.
  const collectedApproved =
    orderCredits.length > 0
      ? collectedFromRows + unmatchedApproved
      : legacyCollected;
  const orderPendingTotal = orderCredits
    .filter((credit) => credit.kind === "pending")
    .reduce((sum, credit) => sum + credit.amount, 0);
  const collectedPending =
    orderCredits.length > 0
      ? Math.max(legacyPending, orderPendingTotal)
      : legacyPending;
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
  orderCredits?: InscriptionOrderCredit[];
  orderCount?: number;
}

export function CamporeePaymentBalance({
  members,
  payments,
  registrationCost,
  membersTotal,
  orderCredits = [],
  orderCount = 0,
}: CamporeePaymentBalanceProps) {
  const t = useTranslations("camporees.paymentsBalance");
  const formatCurrency = useFormatCurrency();

  const balance = useMemo(
    () =>
      computePaymentBalance(
        members,
        payments,
        registrationCost,
        membersTotal,
        orderCredits,
      ),
    [members, membersTotal, orderCredits, payments, registrationCost],
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
          {orderCount > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("statOrdersHint", { count: orderCount })}
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
