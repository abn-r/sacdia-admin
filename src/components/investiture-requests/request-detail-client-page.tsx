"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Info, ShieldAlert } from "lucide-react";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  resolveInvestitureRequest,
  type InvestitureRequest,
  type InvestitureRequestPerson,
  type InvestitureResolution,
} from "@/lib/api/investiture-requests";
import { DecisionConfirmDialog } from "./decision-confirm-dialog";
import { formatCivilDate } from "./format-date";
import {
  getInvestitureRequestErrorCode,
  getInvestitureRequestErrorMessage,
} from "./investiture-request-errors";
import { PersonStatusBadge } from "./person-status-badge";
import { ResolutionSummary } from "./resolution-summary";

const COMMENT_MAX = 500;
const REASON_MAX = 1000;
const CLOSED_CODES = new Set([
  "INVESTITURE_REQUEST_WINDOW_CLOSED",
  "INVESTITURE_REQUEST_YEAR_CLOSED",
]);

type DecisionAction = "none" | "invest" | "reject";
type PersonDecision = { action: DecisionAction; text: string };
type FormValues = { decisions: Record<string, PersonDecision> };

const NONE: PersonDecision = { action: "none", text: "" };

export interface RequestDetailClientPageProps {
  request: InvestitureRequest;
  /** Display name of the ecclesiastical year, when the catalog could be read. */
  yearName: string | null;
}

export function RequestDetailClientPage({ request, yearName }: RequestDetailClientPageProps) {
  const t = useTranslations("investiture_requests.detail");
  const tRoot = useTranslations("investiture_requests");
  const locale = useLocale();
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closedCode, setClosedCode] = useState<string | null>(null);
  const [resolution, setResolution] = useState<InvestitureResolution | null>(null);

  const schema = useMemo(() => {
    const decision = z
      .object({ action: z.enum(["none", "invest", "reject"]), text: z.string() })
      .superRefine((value, ctx) => {
        const text = value.text.trim();
        if (value.action === "reject") {
          if (text.length === 0) {
            ctx.addIssue({ code: "custom", path: ["text"], message: t("decision.reasonRequired") });
          } else if (text.length > REASON_MAX) {
            ctx.addIssue({ code: "custom", path: ["text"], message: t("decision.reasonMax") });
          }
        } else if (value.action === "invest" && text.length > COMMENT_MAX) {
          ctx.addIssue({ code: "custom", path: ["text"], message: t("decision.commentMax") });
        }
      });
    return z.object({ decisions: z.record(z.string(), decision) });
  }, [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { decisions: {} },
  });

  const authorizable = useMemo(
    () => request.people.filter((p) => p.status === "PENDING" && p.can_authorize),
    [request.people],
  );
  const hasPending = request.people.some((p) => p.status === "PENDING");
  const readOnly = hasPending && authorizable.length === 0;

  const watched = useWatch({ control: form.control, name: "decisions" });
  const counts = useMemo(() => {
    let invest = 0;
    let reject = 0;
    for (const person of authorizable) {
      const action = watched?.[person.person_id]?.action;
      if (action === "invest") invest += 1;
      if (action === "reject") reject += 1;
    }
    return { invest, reject, total: invest + reject };
  }, [authorizable, watched]);

  const canConfirm = counts.total > 0 && form.formState.isValid && !isSubmitting;

  const submit = form.handleSubmit(async (values) => {
    const invest: Array<{ person_id: string; comment?: string }> = [];
    const reject: Array<{ person_id: string; reason: string }> = [];

    for (const person of authorizable) {
      const decision = values.decisions[person.person_id];
      if (!decision) continue;
      const text = decision.text.trim();
      if (decision.action === "invest") {
        invest.push(text ? { person_id: person.person_id, comment: text } : { person_id: person.person_id });
      } else if (decision.action === "reject") {
        reject.push({ person_id: person.person_id, reason: text });
      }
    }

    setIsSubmitting(true);
    setClosedCode(null);
    try {
      const result = await resolveInvestitureRequest(request.request_id, { invest, reject });
      setResolution(result);
      toast.success(t("toasts.resolved"));
      form.reset({ decisions: {} });
      setConfirmOpen(false);
      router.refresh();
    } catch (error) {
      const code = getInvestitureRequestErrorCode(error);
      if (code && CLOSED_CODES.has(code)) setClosedCode(code);
      toast.error(getInvestitureRequestErrorMessage(error, tRoot, { context: "resolve" }));
      setConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  });

  const noValue = t("noValue");
  const title = request.club_name ?? t("titleFallback");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={t("description", {
          section: request.section_name ?? noValue,
          district: request.district_name ?? noValue,
          year: yearName ?? noValue,
        })}
        breadcrumbs={[
          { label: t("breadcrumbHome"), href: "/dashboard" },
          { label: t("breadcrumbList"), href: "/dashboard/investiture-requests" },
          { label: title },
        ]}
      />

      {closedCode && (
        <Alert variant="destructive">
          <ShieldAlert aria-hidden="true" />
          <AlertDescription>
            {closedCode === "INVESTITURE_REQUEST_WINDOW_CLOSED"
              ? t("windowClosedBanner")
              : tRoot("errors.year_closed")}
          </AlertDescription>
        </Alert>
      )}

      {readOnly && (
        <Alert>
          <Info aria-hidden="true" />
          <AlertDescription>{t("readOnlyNotice")}</AlertDescription>
        </Alert>
      )}

      {resolution && (
        <ResolutionSummary
          resolution={resolution}
          people={request.people}
          onDismiss={() => setResolution(null)}
        />
      )}

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.person")}</TableHead>
              <TableHead>{t("columns.class")}</TableHead>
              <TableHead>{t("columns.date")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              {authorizable.length > 0 && <TableHead>{t("columns.decision")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {request.people.map((person) => (
              <TableRow key={person.person_id}>
                <TableCell className="font-medium">{person.user_name ?? noValue}</TableCell>
                <TableCell>{person.class_name ?? noValue}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatCivilDate(person.investiture_date, locale) ?? noValue}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <PersonStatusBadge status={person.status} />
                    <ResolvedDetails person={person} />
                  </div>
                </TableCell>
                {authorizable.length > 0 && (
                  <TableCell className="min-w-72 align-top">
                    {person.status === "PENDING" && person.can_authorize && (
                      <DecisionControl
                        person={person}
                        control={form.control}
                        error={form.formState.errors.decisions?.[person.person_id]?.text?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      {authorizable.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-xl border border-border/60 bg-card/95 p-3 shadow-md backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t("actionBar.hint")}</p>
          <Button type="button" disabled={!canConfirm} onClick={() => setConfirmOpen(true)}>
            {t("actionBar.confirm", { count: counts.total })}
          </Button>
        </div>
      )}

      <DecisionConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        investCount={counts.invest}
        rejectCount={counts.reject}
        isSubmitting={isSubmitting}
        onConfirm={() => void submit()}
      />
    </div>
  );
}

function ResolvedDetails({ person }: { person: InvestitureRequestPerson }) {
  const t = useTranslations("investiture_requests.detail");

  // The authorizer never receives `rejection_reason` (the backend returns null),
  // so it is deliberately not rendered here.
  if (person.status === "REJECTED_BY_SYSTEM") {
    return (
      <div className="space-y-0.5 text-xs text-muted-foreground">
        <p>{t("resolvedBySystem")}</p>
        <p>{person.system_reason ?? t("systemReasonFallback")}</p>
      </div>
    );
  }

  if (person.status === "INVESTED" || person.status === "REJECTED_BY_PERSON") {
    return (
      <div className="space-y-0.5 text-xs text-muted-foreground">
        {person.resolved_by_name && <p>{t("resolvedBy", { name: person.resolved_by_name })}</p>}
        {person.status === "INVESTED" && person.authorization_comment && (
          <p>{t("authorizationComment", { comment: person.authorization_comment })}</p>
        )}
      </div>
    );
  }

  return null;
}

function DecisionControl({
  person,
  control,
  error,
  disabled,
}: {
  person: InvestitureRequestPerson;
  control: Control<FormValues>;
  error?: string;
  disabled: boolean;
}) {
  const t = useTranslations("investiture_requests.detail.decision");
  const textId = useId();
  const name = person.user_name ?? person.person_id;

  return (
    <Controller
      control={control}
      name={`decisions.${person.person_id}`}
      defaultValue={NONE}
      render={({ field }) => {
        const value: PersonDecision = field.value ?? NONE;
        const isInvest = value.action === "invest";
        const isReject = value.action === "reject";

        return (
          <div className="flex flex-col gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={value.action}
              disabled={disabled}
              aria-label={t("groupLabel", { name })}
              onValueChange={(next) => {
                // Single mode reports "" when the active item is clicked again.
                if (!next || next === value.action) return;
                field.onChange({ action: next as DecisionAction, text: "" });
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

            {(isInvest || isReject) && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={textId} className="text-xs">
                  {isInvest ? t("commentLabel") : t("reasonLabel")}
                </Label>
                <Textarea
                  id={textId}
                  rows={2}
                  value={value.text}
                  disabled={disabled}
                  maxLength={isInvest ? COMMENT_MAX : REASON_MAX}
                  placeholder={isInvest ? t("commentPlaceholder") : t("reasonPlaceholder")}
                  aria-invalid={Boolean(error)}
                  onChange={(event) => field.onChange({ action: value.action, text: event.target.value })}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
