"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

import { ReviewSheet } from "@/components/requests/review-sheet";
import {
  CLUB_ENROLLMENTS_LIST_KEY,
  ClubEnrollmentStatusBadge,
  classifyClubEnrollmentError,
  useClubEnrollmentErrorMessage,
  useEnrollmentRoleLabel,
} from "@/components/club-enrollments/club-enrollment-shared";
import {
  approveClubEnrollment,
  rejectClubEnrollment,
  type ClubEnrollmentItem,
  type ClubEnrollmentPerson,
} from "@/lib/api/club-enrollment-review";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { parseDecimalQuantity, useFormatCurrency, useFormatDateTime } from "@/lib/format-locale";

type Props = {
  item: ClubEnrollmentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SCREEN_ID = "club-enrollments-review";

function personName(person: ClubEnrollmentPerson | null): string | null {
  if (!person) return null;
  return person.name?.trim() || person.user_id;
}

function toDays(value: ClubEnrollmentItem["meeting_days"]): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : value.split(",");
  return list.map((day) => day.trim()).filter(Boolean);
}

/** Side sheet with the enrollment data and the review actions (reject happens inside it). */
export function ClubEnrollmentReviewSheet({ item, open, onOpenChange }: Props) {
  const t = useTranslations("club_enrollments");
  const tq = useTranslations("queues.requests.enrollments.sheet");
  const formatDateTime = useFormatDateTime();
  const formatCurrency = useFormatCurrency();
  const roleLabel = useEnrollmentRoleLabel();
  const errorMessage = useClubEnrollmentErrorMessage();
  const queryClient = useQueryClient();
  const { canCapability } = useScreenAccess();
  const canValidate = canCapability(SCREEN_ID, "validate");

  if (!item) return null;

  function refreshList() {
    void queryClient.invalidateQueries({ queryKey: CLUB_ENROLLMENTS_LIST_KEY });
  }

  /** 404: gone from the scope. 409: someone reviewed it. Either way the row is stale. */
  function handleStaleError(error: unknown): boolean {
    if (classifyClubEnrollmentError(error) === "other") return false;
    toast.error(errorMessage(error));
    refreshList();
    return true;
  }

  async function approve(id: string) {
    try {
      await approveClubEnrollment(id);
    } catch (error) {
      if (handleStaleError(error)) return;
      throw error;
    }
    toast.success(t("toasts.approved"));
    refreshList();
  }

  async function reject(id: string, reason: string) {
    try {
      await rejectClubEnrollment(id, reason);
    } catch (error) {
      if (handleStaleError(error)) return;
      throw error;
    }
    toast.success(t("toasts.rejected"));
    refreshList();
  }

  const pending = item.status === "pending_validation";
  const days = toDays(item.meeting_days);
  const schedule = item.meeting_schedule ?? [];
  const hasCoords =
    item.latitude != null &&
    item.longitude != null &&
    String(item.latitude) !== "" &&
    String(item.longitude) !== "";
  const feeAmount = parseDecimalQuantity(item.fee_amount);
  const board = item.board;
  const secretaryTreasurerOnly =
    board != null && board.secretary_treasurer != null && !board.secretary && !board.treasurer;

  const unassigned = t("detail.unassigned");
  const reviewable = pending && canValidate;

  return (
    <ReviewSheet
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={item.club.name}
      description={t("detail.description", {
        section: item.section.club_type_name,
        year: item.ecclesiastical_year.name,
      })}
      errorMessage={errorMessage}
      {...(reviewable
        ? {
            approve: {
              label: t("detail.approve.action"),
              onConfirm: () => approve(item.enrollment_id),
            },
            reject: {
              label: t("detail.reject.action"),
              confirmLabel: t("detail.reject.confirm"),
              audience: tq("rejectAudience"),
              onConfirm: (reason: string) => reject(item.enrollment_id, reason),
            },
          }
        : {})}
    >
      <Section title={t("detail.sections.meetings")}>
        <Meta label={t("detail.fields.address")} className="sm:col-span-2">
          {item.address ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{item.address}</span>
              {hasCoords ? (
                <a
                  href={`https://www.google.com/maps?q=${encodeURIComponent(`${item.latitude},${item.longitude}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {t("detail.openMap")}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </span>
          ) : (
            "—"
          )}
        </Meta>
        <Meta label={t("detail.fields.days")}>{days.length > 0 ? days.join(", ") : "—"}</Meta>
        <Meta label={t("detail.fields.schedule")}>
          {schedule.length > 0 ? (
            <ul className="space-y-0.5">
              {schedule.map((slot) => (
                <li key={`${slot.day}-${slot.time}`}>
                  {slot.day} · {slot.time}
                </li>
              ))}
            </ul>
          ) : (
            "—"
          )}
        </Meta>
      </Section>

      <Section title={t("detail.sections.goal")}>
        <Meta label={t("detail.fields.soulsTarget")}>{item.souls_target ?? "—"}</Meta>
        <Meta label={t("detail.fields.fee")}>
          {item.fee
            ? feeAmount != null
              ? t("detail.feeWithAmount", { amount: formatCurrency(feeAmount) })
              : t("detail.feeYes")
            : t("detail.feeNo")}
        </Meta>
      </Section>

      <Section title={t("detail.sections.board")} hint={t("detail.boardHint")}>
        <Meta label={t("detail.fields.director")}>{personName(board.director) ?? unassigned}</Meta>
        <Meta label={t("detail.fields.deputies")}>
          {board.deputies.length > 0 ? (
            <ul className="space-y-0.5">
              {board.deputies.map((deputy) => (
                <li key={deputy.user_id}>{personName(deputy)}</li>
              ))}
            </ul>
          ) : (
            unassigned
          )}
        </Meta>
        {!secretaryTreasurerOnly ? (
          <>
            <Meta label={t("detail.fields.secretary")}>{personName(board.secretary) ?? unassigned}</Meta>
            <Meta label={t("detail.fields.treasurer")}>{personName(board.treasurer) ?? unassigned}</Meta>
          </>
        ) : null}
        {board.secretary_treasurer ? (
          <Meta label={t("detail.fields.secretaryTreasurer")}>{personName(board.secretary_treasurer)}</Meta>
        ) : null}
      </Section>

      <Section title={t("detail.sections.submission")}>
        <Meta label={t("detail.fields.submittedBy")}>{personName(item.submitted_by) ?? "—"}</Meta>
        <Meta label={t("detail.fields.submittedAt")}>{formatDateTime(item.submitted_at ?? item.created_at)}</Meta>
      </Section>

      {!pending ? (
        <Section title={t("detail.sections.review")}>
          <Meta label={t("detail.fields.status")}>
            <ClubEnrollmentStatusBadge status={item.status} />
          </Meta>
          <Meta label={t("detail.fields.reviewedBy")}>
            {personName(item.reviewed_by) ?? "—"}
            {item.reviewer_role ? (
              <span className="text-muted-foreground"> · {roleLabel(item.reviewer_role)}</span>
            ) : null}
          </Meta>
          {item.reviewed_at ? (
            <Meta label={t("detail.fields.reviewedAt")}>{formatDateTime(item.reviewed_at)}</Meta>
          ) : null}
          {item.decision_reason ? (
            <Meta label={t("detail.fields.reason")} className="sm:col-span-2">
              <span className="whitespace-pre-wrap">{item.decision_reason}</span>
            </Meta>
          ) : null}
        </Section>
      ) : null}
    </ReviewSheet>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Meta({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
