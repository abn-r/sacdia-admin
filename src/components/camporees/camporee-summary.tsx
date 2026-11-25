"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { KpiStrip, KpiStripItem } from "@/components/shared/kpi-strip";
import { ErrorState } from "@/components/shared/error-state";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import {
  computePaymentBalance,
  inscriptionCreditsFromOrders,
} from "@/components/camporees/camporee-payment-balance";
import type {
  CamporeeClub,
  CamporeeMember,
  CamporeePayment,
  PaginationMeta,
} from "@/lib/api/camporees";
import type { PaymentOrder } from "@/lib/api/field-payment-orders";
import type { LoadFailure } from "@/lib/camporees/detail-data";
import { camporeeGroupHref } from "@/lib/camporees/groups";
import type { NormalizedCamporee } from "@/lib/camporees/normalize";
import {
  setDeadlines,
  type DeadlineKey,
  type PendingItem,
} from "@/lib/camporees/summary";
import { formatCalendarDate, formatMxnAmount, formatTimestamp } from "@/lib/format-locale";

export interface CamporeeSummaryProps {
  camporee: NormalizedCamporee;
  camporeeId: number;
  /** Local field name or union name. */
  ownerName: string | null;
  clubs: CamporeeClub[];
  clubsFailed: boolean;
  members: CamporeeMember[];
  membersMeta?: PaginationMeta;
  membersFailed: boolean;
  payments: CamporeePayment[];
  paymentOrders: PaymentOrder[];
  paymentsFailed: boolean;
  eventsCount: number;
  eventsFailed: boolean;
  scoringEventsCount: number;
  pendingMembers: number;
  pendingItems: PendingItem[];
  pendingFailure: LoadFailure | null;
  /** Set when a refresh of the pending list failed and old data is on screen. */
  pendingStaleAt: Date | null;
  onRetryPending: () => void;
}

const UNKNOWN = "—";

export function CamporeeSummary({
  camporee,
  camporeeId,
  ownerName,
  clubs,
  clubsFailed,
  members,
  membersMeta,
  membersFailed,
  payments,
  paymentOrders,
  paymentsFailed,
  eventsCount,
  eventsFailed,
  scoringEventsCount,
  pendingMembers,
  pendingItems,
  pendingFailure,
  pendingStaleAt,
  onRetryPending,
}: CamporeeSummaryProps) {
  const t = useTranslations("evaluation.camporees.summary");
  const tp = useTranslations("camporees.pages.detail");
  const locale = useLocale();
  const format = useFormatter();
  const kind = camporee.kind;
  const href = (group: Parameters<typeof camporeeGroupHref>[2], view?: string) =>
    camporeeGroupHref(kind, camporeeId, group, view);

  const membersTotal = membersMeta?.total ?? members.length;
  const balance = useMemo(
    () =>
      computePaymentBalance(
        members,
        payments,
        camporee.registration_cost,
        membersTotal,
        inscriptionCreditsFromOrders(paymentOrders),
      ),
    [members, payments, paymentOrders, camporee.registration_cost, membersTotal],
  );

  const deadlines = setDeadlines(camporee);
  const deadlineLabels: Record<DeadlineKey, string> = {
    club_registration_deadline: t("deadlines.clubs"),
    member_registration_deadline: t("deadlines.members"),
    payment_deadline: t("deadlines.payment"),
    agenda_visible_from: t("deadlines.agenda"),
  };

  const hasCoords =
    typeof camporee.lat === "number" &&
    Number.isFinite(camporee.lat) &&
    typeof camporee.long === "number" &&
    Number.isFinite(camporee.long);
  const sectionNames = [
    camporee.includes_adventurers ? "adventurers" : null,
    camporee.includes_pathfinders ? "pathfinders" : null,
    camporee.includes_master_guides ? "masterGuides" : null,
  ].filter((key): key is "adventurers" | "pathfinders" | "masterGuides" => key !== null);
  const tf = useTranslations("camporees.form");
  const sectionsLabel = sectionNames.length
    ? format.list(sectionNames.map((key) => tf(key)), { type: "conjunction" })
    : UNKNOWN;

  function itemText(item: PendingItem): string {
    switch (item.key) {
      case "members":
        return t("pending.members", { count: item.count });
      case "clubs":
        return t("pending.clubs", { count: item.count });
      case "payments":
        return t("pending.payments", {
          count: item.count,
          amount: formatMxnAmount(item.amount ?? 0),
        });
      case "eventsWithoutJudge":
        return t("pending.eventsWithoutJudge", { count: item.count });
    }
  }

  const closedAt = camporee.club_registration_closed_at;

  return (
    <div className="space-y-8">
      <KpiStrip aria-label={t("kpiLabel")}>
        <KpiStripItem
          label={t("kpi.clubs")}
          value={clubsFailed ? UNKNOWN : clubs.length}
          subline={clubsFailed ? t("kpi.unavailable") : t("kpi.enrolled")}
          href={href("registrations", "clubs")}
        />
        <KpiStripItem
          label={t("kpi.members")}
          value={membersFailed ? UNKNOWN : membersTotal}
          subline={
            membersFailed
              ? t("kpi.unavailable")
              : pendingMembers > 0
                ? t("kpi.membersPending", { count: pendingMembers })
                : t("kpi.enrolled")
          }
          href={href("registrations", pendingMembers > 0 ? "pending" : "members")}
        />
        <KpiStripItem
          label={t("kpi.collected")}
          value={paymentsFailed ? UNKNOWN : formatMxnAmount(balance.collectedApproved)}
          subline={
            paymentsFailed
              ? t("kpi.unavailable")
              : balance.expectedTotal != null
                ? t("kpi.collectedOf", { total: formatMxnAmount(balance.expectedTotal) })
                : t("kpi.noCost")
          }
          href={href("money", "payments")}
        />
        <KpiStripItem
          label={t("kpi.events")}
          value={eventsFailed ? UNKNOWN : eventsCount}
          subline={
            eventsFailed
              ? t("kpi.unavailable")
              : t("kpi.eventsScoring", { count: scoringEventsCount })
          }
          href={href("program", "events")}
        />
      </KpiStrip>

      <section aria-labelledby="summary-pending" className="space-y-2">
        <h2 id="summary-pending" className="text-base font-semibold tracking-tight">
          {t("pending.title")}
        </h2>
        {pendingStaleAt && (
          <StaleDataNotice at={pendingStaleAt} onRetry={onRetryPending} />
        )}
        {pendingFailure ? (
          <ErrorState
            variant="inline"
            kind={pendingFailure.kind}
            detail={pendingFailure.detail}
            title={t("pending.loadFailed")}
            onRetry={onRetryPending}
          />
        ) : pendingItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("pending.none")}</p>
        ) : (
          <ul className="divide-y rounded-xl bg-card px-4 shadow-card">
            {pendingItems.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>{itemText(item)}</span>
                <Link
                  href={href(item.group, item.view)}
                  className="shrink-0 font-medium text-primary hover:underline"
                >
                  {item.key === "eventsWithoutJudge" ? t("pending.assign") : t("pending.review")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="summary-deadlines" className="space-y-2">
        <h2 id="summary-deadlines" className="text-base font-semibold tracking-tight">
          {t("deadlines.title")}
        </h2>
        {deadlines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("deadlines.none")}</p>
        ) : (
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
            {deadlines.map(({ key, value }) => (
              <div key={key} className="contents">
                <dt className="text-muted-foreground">{deadlineLabels[key]}</dt>
                <dd className="tabular-nums">
                  {key === "agenda_visible_from"
                    ? t("deadlines.from", { date: formatCalendarDate(value, locale, "short") })
                    : t("deadlines.until", { date: formatCalendarDate(value, locale, "short") })}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section aria-labelledby="summary-data" className="space-y-2">
        <h2 id="summary-data" className="text-base font-semibold tracking-tight">
          {t("data.title")}
        </h2>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">
            {kind === "union" ? tp("labelUnionKpi") : tp("labelLocalFieldKpi")}
          </dt>
          <dd>{ownerName ?? UNKNOWN}</dd>
          <dt className="text-muted-foreground">{tp("labelCampLocation")}</dt>
          <dd className="space-y-0.5">
            <span>{camporee.local_camporee_place ?? UNKNOWN}</span>
            {hasCoords && (
              <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {tp("coordinates", { lat: Number(camporee.lat), lng: Number(camporee.long) })}
                </span>
                <Link
                  href={`https://www.google.com/maps?q=${camporee.lat},${camporee.long}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {tp("openInMaps")}
                  <ExternalLink className="size-3" aria-hidden />
                </Link>
              </span>
            )}
          </dd>
          <dt className="text-muted-foreground">{tp("labelIncludes")}</dt>
          <dd>{sectionsLabel}</dd>
          {closedAt && (
            <>
              <dt className="text-muted-foreground">{t("data.registration")}</dt>
              <dd className="tabular-nums">{t("data.closedAt", { date: formatTimestamp(closedAt) })}</dd>
            </>
          )}
          {camporee.description && (
            <>
              <dt className="text-muted-foreground">{tp("labelDescription")}</dt>
              <dd className="whitespace-pre-line">{camporee.description}</dd>
            </>
          )}
        </dl>
      </section>
    </div>
  );
}
