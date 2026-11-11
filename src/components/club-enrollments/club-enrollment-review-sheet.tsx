"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CLUB_ENROLLMENTS_LIST_KEY,
  ClubEnrollmentStatusBadge,
  classifyClubEnrollmentError,
  useClubEnrollmentErrorMessage,
  useEnrollmentRoleLabel,
} from "@/components/club-enrollments/club-enrollment-shared";
import { RejectEnrollmentDialog } from "@/components/club-enrollments/reject-enrollment-dialog";
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

/** Side sheet with the enrollment data and the review actions. */
export function ClubEnrollmentReviewSheet({ item, open, onOpenChange }: Props) {
  const t = useTranslations("club_enrollments");
  const formatDateTime = useFormatDateTime();
  const formatCurrency = useFormatCurrency();
  const roleLabel = useEnrollmentRoleLabel();
  const errorMessage = useClubEnrollmentErrorMessage();
  const queryClient = useQueryClient();
  const { canCapability } = useScreenAccess();
  const canValidate = canCapability(SCREEN_ID, "validate");

  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setActionError(null);
      setRejectOpen(false);
      setRejectError(null);
    }
    onOpenChange(next);
  }

  function refreshList() {
    void queryClient.invalidateQueries({ queryKey: CLUB_ENROLLMENTS_LIST_KEY });
  }

  /** 404: gone from the scope. 409: someone reviewed it. Either way the row is stale. */
  function handleStaleError(error: unknown): boolean {
    if (classifyClubEnrollmentError(error) === "other") return false;
    toast.error(errorMessage(error));
    refreshList();
    handleOpenChange(false);
    return true;
  }

  const approve = useMutation({
    mutationFn: (id: string) => approveClubEnrollment(id),
    onSuccess: () => {
      toast.success(t("toasts.approved"));
      refreshList();
      handleOpenChange(false);
    },
    onError: (error) => {
      if (!handleStaleError(error)) setActionError(errorMessage(error));
    },
  });

  const reject = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      rejectClubEnrollment(input.id, input.reason),
    onSuccess: () => {
      toast.success(t("toasts.rejected"));
      refreshList();
      handleOpenChange(false);
    },
    onError: (error) => {
      if (!handleStaleError(error)) setRejectError(errorMessage(error));
    },
  });

  const pending = item?.status === "pending_validation";
  const busy = approve.isPending || reject.isPending;

  const days = item ? toDays(item.meeting_days) : [];
  const schedule = item?.meeting_schedule ?? [];
  const hasCoords =
    item != null &&
    item.latitude != null &&
    item.longitude != null &&
    String(item.latitude) !== "" &&
    String(item.longitude) !== "";
  const feeAmount = item ? parseDecimalQuantity(item.fee_amount) : null;
  const board = item?.board;
  const secretaryTreasurerOnly =
    board != null && board.secretary_treasurer != null && !board.secretary && !board.treasurer;

  const unassigned = t("detail.unassigned");

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b pr-14">
            <SheetTitle>{item ? item.club.name : t("detail.title")}</SheetTitle>
            <SheetDescription>
              {item
                ? t("detail.description", {
                    section: item.section.club_type_name,
                    year: item.ecclesiastical_year.name,
                  })
                : null}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {item && board ? (
              <>
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
                      <Meta label={t("detail.fields.secretary")}>
                        {personName(board.secretary) ?? unassigned}
                      </Meta>
                      <Meta label={t("detail.fields.treasurer")}>
                        {personName(board.treasurer) ?? unassigned}
                      </Meta>
                    </>
                  ) : null}
                  {board.secretary_treasurer ? (
                    <Meta label={t("detail.fields.secretaryTreasurer")}>
                      {personName(board.secretary_treasurer)}
                    </Meta>
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

                {actionError ? (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{actionError}</AlertDescription>
                  </Alert>
                ) : null}
              </>
            ) : null}
          </div>

          <SheetFooter className="border-t sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t("detail.close")}
            </Button>
            {item && pending && canValidate ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => {
                    setRejectError(null);
                    setRejectOpen(true);
                  }}
                >
                  {t("detail.reject.action")}
                </Button>
                <Button
                  type="button"
                  loading={approve.isPending}
                  disabled={busy}
                  onClick={() => {
                    setActionError(null);
                    approve.mutate(item.enrollment_id);
                  }}
                >
                  {t("detail.approve.action")}
                </Button>
              </div>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {item ? (
        <RejectEnrollmentDialog
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          clubName={item.club.name}
          submitting={reject.isPending}
          serverError={rejectError}
          onConfirm={(reason) => {
            setRejectError(null);
            reject.mutate({ id: item.enrollment_id, reason });
          }}
        />
      ) : null}
    </>
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
