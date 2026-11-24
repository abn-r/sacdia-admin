"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Info, ShieldAlert } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailHeader } from "@/components/shared/detail-header";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { StatusIntent } from "@/components/ui/status-badge";
import {
  resolveInvestitureRequest,
  type InvestiturePersonStatus,
  type InvestitureRequest,
  type InvestitureRequestPerson,
  type InvestitureResolution,
} from "@/lib/api/investiture-requests";
import { formatCivilDate } from "./format-date";
import {
  getInvestitureRequestErrorCode,
  getInvestitureRequestErrorMessage,
} from "./investiture-request-errors";
import { ResolutionSummary } from "./resolution-summary";

const REASON_MAX = 1000;
const CLOSED_CODES = new Set([
  "INVESTITURE_REQUEST_WINDOW_CLOSED",
  "INVESTITURE_REQUEST_YEAR_CLOSED",
]);

type DecisionAction = "none" | "invest" | "reject";
type Decisions = Record<string, { action: DecisionAction; reason: string }>;

const STATUS_INTENTS: Partial<Record<InvestiturePersonStatus, StatusIntent>> = {
  PENDING: "warning",
  REJECTED_BY_PERSON: "destructive",
  REJECTED_BY_SYSTEM: "warning",
  REMOVED: "neutral",
  CLOSED_YEAR: "neutral",
};

export interface RequestDetailClientPageProps {
  request: InvestitureRequest;
  /** Display name of the ecclesiastical year, when the catalog could be read. */
  yearName: string | null;
}

export function RequestDetailClientPage({ request, yearName }: RequestDetailClientPageProps) {
  const t = useTranslations("queues.investitures.detail");
  const tLegacy = useTranslations("investiture_requests.detail");
  const tRoot = useTranslations("investiture_requests");
  const locale = useLocale();
  const router = useRouter();

  const [decisions, setDecisions] = useState<Decisions>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closedCode, setClosedCode] = useState<string | null>(null);
  const [resolution, setResolution] = useState<InvestitureResolution | null>(null);
  // People already resolved in this session, so the table shows the result at once.
  const [applied, setApplied] = useState<Record<string, InvestitureRequestPerson>>({});
  // The authorizer never receives the stored human reason: keep what was typed here.
  const [ownReasons, setOwnReasons] = useState<Record<string, string>>({});

  const people = useMemo(
    () => request.people.map((person) => applied[person.person_id] ?? person),
    [request.people, applied],
  );
  const authorizable = useMemo(
    () => people.filter((p) => p.status === "PENDING" && p.can_authorize),
    [people],
  );
  const hasPending = people.some((p) => p.status === "PENDING");
  const readOnly = hasPending && authorizable.length === 0;

  const actionOf = (id: string): DecisionAction => decisions[id]?.action ?? "none";
  const reasonOf = (id: string): string => decisions[id]?.reason ?? "";

  const investing = authorizable.filter((p) => actionOf(p.person_id) === "invest");
  const rejecting = authorizable.filter((p) => actionOf(p.person_id) === "reject");
  const undecided = authorizable.filter((p) => actionOf(p.person_id) === "none");
  const total = investing.length + rejecting.length;
  const reasonsOk = rejecting.every((p) => {
    const text = reasonOf(p.person_id).trim();
    return text.length > 0 && text.length <= REASON_MAX;
  });

  function setAction(id: string, action: DecisionAction) {
    setDecisions((prev) => ({ ...prev, [id]: { action, reason: prev[id]?.reason ?? "" } }));
  }

  function setReason(id: string, reason: string) {
    setDecisions((prev) => ({ ...prev, [id]: { action: prev[id]?.action ?? "reject", reason } }));
  }

  function investAllUndecided() {
    setDecisions((prev) => {
      const next = { ...prev };
      for (const person of undecided) {
        next[person.person_id] = { action: "invest", reason: "" };
      }
      return next;
    });
  }

  async function submit() {
    const invest = investing.map((p) => ({ person_id: p.person_id }));
    const reject = rejecting.map((p) => ({
      person_id: p.person_id,
      reason: reasonOf(p.person_id).trim(),
    }));
    const typedReasons = Object.fromEntries(reject.map((r) => [r.person_id, r.reason]));

    setClosedCode(null);
    let result: InvestitureResolution;
    try {
      result = await resolveInvestitureRequest(request.request_id, { invest, reject });
    } catch (error) {
      const code = getInvestitureRequestErrorCode(error);
      if (code && CLOSED_CODES.has(code)) setClosedCode(code);
      // The dialog stays open and shows this message inline.
      throw new Error(getInvestitureRequestErrorMessage(error, tRoot, { context: "resolve" }));
    }

    const resolvedNow = [
      ...result.invested,
      ...result.rejected_by_person,
      ...result.rejected_by_system,
      ...result.retired,
    ];
    setApplied((prev) => ({
      ...prev,
      ...Object.fromEntries(resolvedNow.map((p) => [p.person_id, p])),
    }));
    setOwnReasons((prev) => ({ ...prev, ...typedReasons }));
    setDecisions((prev) => {
      const next = { ...prev };
      for (const person of resolvedNow) delete next[person.person_id];
      return next;
    });
    setResolution(result);
    toast.success(tLegacy("toasts.resolved"));
    router.refresh();
  }

  const noValue = tLegacy("noValue");
  const title = request.club_name ?? tLegacy("titleFallback");
  const pendingDates = people
    .filter((p) => p.status === "PENDING")
    .map((p) => p.investiture_date)
    .sort();

  const names = (list: InvestitureRequestPerson[]) =>
    new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(
      list.map((p) => p.user_name ?? noValue),
    );

  const confirmDescription = (
    <div className="space-y-1.5">
      <p>
        {[
          investing.length > 0 ? t("confirm.invest", { count: investing.length }) : null,
          rejecting.length > 0 ? t("confirm.reject", { count: rejecting.length }) : null,
          undecided.length > 0
            ? t("confirm.undecided", { count: undecided.length, names: names(undecided) })
            : null,
        ]
          .filter(Boolean)
          .join(" ")}
      </p>
      <p className="font-medium text-foreground">{t("confirm.irreversible")}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <DetailHeader
        breadcrumbs={[
          { label: t("breadcrumbList"), href: "/dashboard/investiture-requests" },
          { label: title },
        ]}
        title={title}
        subtitle={tLegacy("description", {
          section: request.section_name ?? noValue,
          district: request.district_name ?? noValue,
          year: yearName ?? noValue,
        })}
        facts={[
          ...(pendingDates[0]
            ? [
                {
                  label: t("facts.investiture"),
                  value: formatCivilDate(pendingDates[0], locale) ?? noValue,
                },
              ]
            : []),
          ...(hasPending
            ? [{ label: t("facts.toDecide"), value: String(pendingDates.length) }]
            : []),
        ]}
      />

      {closedCode && (
        <Alert variant="destructive">
          <ShieldAlert aria-hidden="true" />
          <AlertDescription>
            {closedCode === "INVESTITURE_REQUEST_WINDOW_CLOSED"
              ? tLegacy("windowClosedBanner")
              : tRoot("errors.year_closed")}
          </AlertDescription>
        </Alert>
      )}

      {readOnly && (
        <Alert>
          <Info aria-hidden="true" />
          <AlertDescription>{tLegacy("readOnlyNotice")}</AlertDescription>
        </Alert>
      )}

      {resolution && (
        <ResolutionSummary
          resolution={resolution}
          people={request.people}
          onDismiss={() => setResolution(null)}
        />
      )}

      <section aria-labelledby="investiture-people-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="investiture-people-heading" className="font-semibold text-base tracking-tight">
            {t("people", { count: people.length })}
          </h2>
          {authorizable.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={undecided.length === 0}
              onClick={investAllUndecided}
            >
              {t("investAll")}
            </Button>
          )}
        </div>

        <ul className="divide-y overflow-hidden rounded-xl bg-card shadow-card">
          {people.map((person) => (
            <PersonRow
              key={person.person_id}
              person={person}
              date={formatCivilDate(person.investiture_date, locale) ?? noValue}
              decidable={person.status === "PENDING" && person.can_authorize}
              action={actionOf(person.person_id)}
              reason={reasonOf(person.person_id)}
              ownReason={ownReasons[person.person_id]}
              onAction={(action) => setAction(person.person_id, action)}
              onReason={(value) => setReason(person.person_id, value)}
            />
          ))}
        </ul>
      </section>

      {authorizable.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground tabular-nums" role="status">
            {t("bar.summary", {
              invest: investing.length,
              reject: rejecting.length,
              none: undecided.length,
            })}
            {!reasonsOk && <span className="ml-2 text-foreground">{t("bar.needReason")}</span>}
          </p>
          <Button
            type="button"
            disabled={total === 0 || !reasonsOk}
            onClick={() => setConfirmOpen(true)}
          >
            {t("bar.confirm", { count: total })}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirm.title", { count: total })}
        description={confirmDescription}
        confirmLabel={t("confirm.action")}
        onConfirm={submit}
      />
    </div>
  );
}

// ─── Person ──────────────────────────────────────────────────────────────────

interface PersonRowProps {
  person: InvestitureRequestPerson;
  date: string;
  decidable: boolean;
  action: DecisionAction;
  reason: string;
  ownReason: string | undefined;
  onAction: (action: DecisionAction) => void;
  onReason: (reason: string) => void;
}

function PersonRow({
  person,
  date,
  decidable,
  action,
  reason,
  ownReason,
  onAction,
  onReason,
}: PersonRowProps) {
  const noValue = useTranslations("investiture_requests.detail")("noValue");
  const name = person.user_name ?? noValue;

  return (
    <li>
      <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{name}</p>
          <p className="text-[13px] text-muted-foreground tabular-nums">
            {person.class_name ?? noValue} · {date}
          </p>
        </div>
        {decidable ? (
          <DecisionSegment name={name} action={action} onAction={onAction} />
        ) : (
          <PersonResult person={person} ownReason={ownReason} />
        )}
      </div>
      {decidable && action === "reject" && (
        <RejectReason name={name} value={reason} onChange={onReason} />
      )}
    </li>
  );
}

function DecisionSegment({
  name,
  action,
  onAction,
}: {
  name: string;
  action: DecisionAction;
  onAction: (action: DecisionAction) => void;
}) {
  const t = useTranslations("investiture_requests.detail.decision");
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      value={action}
      aria-label={t("groupLabel", { name })}
      onValueChange={(next) => {
        // Single mode reports "" when the active item is pressed again.
        if (!next || next === action) return;
        onAction(next as DecisionAction);
      }}
    >
      <ToggleGroupItem value="none">{t("none")}</ToggleGroupItem>
      <ToggleGroupItem
        value="invest"
        className="data-[state=on]:bg-success/20 data-[state=on]:text-success-foreground dark:data-[state=on]:text-success"
      >
        {t("invest")}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="reject"
        className="data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive"
      >
        {t("reject")}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function RejectReason({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("investiture_requests.detail.decision");
  const id = useId();
  const [touched, setTouched] = useState(false);
  const missing = touched && value.trim().length === 0;

  return (
    <div className="flex flex-col gap-1.5 px-4 pb-3">
      <Label htmlFor={id} className="text-xs">
        {t("reasonLabel")} · {name}
      </Label>
      <Textarea
        id={id}
        rows={2}
        value={value}
        maxLength={REASON_MAX}
        placeholder={t("reasonPlaceholder")}
        aria-invalid={missing}
        onBlur={() => setTouched(true)}
        onChange={(event) => onChange(event.target.value)}
      />
      {missing && <p className="text-xs text-destructive">{t("reasonRequired")}</p>}
    </div>
  );
}

function PersonResult({
  person,
  ownReason,
}: {
  person: InvestitureRequestPerson;
  ownReason: string | undefined;
}) {
  const t = useTranslations("queues.investitures.detail");
  const tStatus = useTranslations("investiture_requests.status");
  const tLegacy = useTranslations("investiture_requests.detail");

  const labels: Record<InvestiturePersonStatus, string> = {
    PENDING: tStatus("pending"),
    INVESTED: tStatus("invested"),
    REJECTED_BY_PERSON: tStatus("rejected_by_person"),
    REJECTED_BY_SYSTEM: tStatus("rejected_by_system"),
    REMOVED: tStatus("removed"),
    CLOSED_YEAR: tStatus("closed_year"),
  };

  let note: string | null = null;
  if (person.status === "REJECTED_BY_SYSTEM") {
    note = t("result.bySystem", { reason: person.system_reason ?? tLegacy("systemReasonFallback") });
  } else if (person.status === "REJECTED_BY_PERSON") {
    note = ownReason ? t("result.reason", { reason: ownReason }) : null;
  } else if (person.status === "INVESTED" && person.authorization_comment) {
    note = tLegacy("authorizationComment", { comment: person.authorization_comment });
  }

  const resolver =
    person.status === "INVESTED" || person.status === "REJECTED_BY_PERSON"
      ? person.resolved_by_name
      : null;

  return (
    <div className="flex min-w-0 flex-col gap-1 md:items-end md:text-right">
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {person.status === "INVESTED" && (
          <span className="text-sm text-muted-foreground">{labels.INVESTED}</span>
        )}
        <ExceptionStatus
          value={person.status}
          normal={["INVESTED"]}
          labels={labels}
          intents={STATUS_INTENTS}
        />
        {resolver && (
          <span className="text-[13px] text-muted-foreground">
            {tLegacy("resolvedBy", { name: resolver })}
          </span>
        )}
      </div>
      {note && <p className="max-w-prose text-[13px] text-muted-foreground">{note}</p>}
    </div>
  );
}
