"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FileText, FolderSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { AnnualFolderEvidenceViewerDialog } from "@/components/annual-folders/annual-folder-evidence-viewer-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailHeader } from "@/components/shared/detail-header";
import { ErrorState } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import {
  SplitInbox,
  SplitInboxFooter,
  SplitInboxItemContent,
} from "@/components/shared/split-inbox";
import { StaleDataNotice } from "@/components/shared/stale-data-notice";
import {
  confirmUnionSection,
  evaluateSection,
  getFolder,
  getFolderEvaluations,
  reopenSection,
} from "@/lib/api/annual-folders";
import type {
  AnnualFolder,
  FolderEvidence,
  FolderSectionWithEvidences,
  SectionEvaluation,
  UnionConfirmationDecision,
} from "@/lib/api/annual-folders";
import { ApiError } from "@/lib/api/client";
import { errorStateFromError } from "@/lib/api/error-state";
import {
  CLUBS_EVIDENCE_FOLDERS_BASE,
  clubsEvidenceFolderPath,
} from "@/lib/clubs/evidence-folders-paths";
import {
  canReopenState,
  defaultSectionId,
  latestEvidenceDate,
  mergeSectionEvaluation,
  nextSectionId,
  resolveSectionState,
  sortSections,
  validatePoints,
  type SectionState,
} from "@/lib/evidence-folders/section-state";
import { useFormatDate, useFormatDateTime, useFormatNumber } from "@/lib/format-locale";
import { useToastError } from "@/lib/feedback/toast-retry";

interface EvidenceFolderReviewProps {
  folderId: string;
  /** `folders.confirm_union` capability of the viewer. */
  canConfirmUnion?: boolean;
}

type FolderBundle = { folder: AnnualFolder; evaluations: SectionEvaluation[] };

async function loadFolderBundle(folderId: string): Promise<FolderBundle> {
  const [folderResult, evaluationsResult] = await Promise.allSettled([
    getFolder(folderId),
    getFolderEvaluations(folderId),
  ]);
  if (folderResult.status === "rejected") throw folderResult.reason;
  // Non-fatal: the folder itself carries status and points; only the actors
  // (who approved, when) come from the evaluations endpoint.
  return {
    folder: folderResult.value,
    evaluations: evaluationsResult.status === "fulfilled" ? evaluationsResult.value : [],
  };
}

type Row = {
  section: FolderSectionWithEvidences;
  evaluation: SectionEvaluation | undefined;
  state: SectionState;
};

type FormState = { id: string | null; points: string; notes: string; attempted: boolean };

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

export function EvidenceFolderReview({
  folderId,
  canConfirmUnion = false,
}: EvidenceFolderReviewProps) {
  const t = useTranslations("evaluation.evidence.review");
  const tFolders = useTranslations("annual_folders");
  const tTitle = useTranslations("annual_folders.pageFolders");
  const tConfirm = useTranslations("shared.kit.confirm");
  const formatDate = useFormatDate();
  const formatDateTime = useFormatDateTime();
  const formatNumber = useFormatNumber();
  const toastError = useToastError();
  const focusUnion = useSearchParams()?.get("focus") === "union";

  const query = useQuery<FolderBundle, Error>({
    queryKey: ["evidence-folders", "folder", folderId],
    queryFn: () => loadFolderBundle(folderId),
    staleTime: 15_000,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ id: null, points: "", notes: "", attempted: false });
  const [saving, setSaving] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [preview, setPreview] = useState<{ evidence: FolderEvidence; all: FolderEvidence[] } | null>(null);

  if (query.isPending) {
    return (
      <div className="space-y-4" role="status" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    );
  }

  if (!query.data) {
    const failure = errorStateFromError(query.error);
    return (
      <ErrorState
        kind={failure.kind}
        icon={FolderSearch}
        title={t("error.title")}
        description={t("error.description")}
        {...(failure.detail ? { detail: failure.detail } : {})}
        onRetry={() => void query.refetch()}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={CLUBS_EVIDENCE_FOLDERS_BASE}>{t("back")}</Link>
          </Button>
        }
      />
    );
  }

  const { folder, evaluations } = query.data;
  const requiresUnion = folder.requires_union_confirmation;
  const rows: Row[] = sortSections(folder.sections ?? []).map((section) => {
    const evaluation = mergeSectionEvaluation(section, evaluations);
    return { section, evaluation, state: resolveSectionState(evaluation?.status, requiresUnion) };
  });
  const items = rows.map((row) => ({ id: row.section.section_id, state: row.state }));

  const effectiveId =
    selectedId && rows.some((row) => row.section.section_id === selectedId)
      ? selectedId
      : defaultSectionId(items, { focusUnion, canConfirmUnion });
  const selectedIndex = rows.findIndex((row) => row.section.section_id === effectiveId);
  const selected = selectedIndex >= 0 ? rows[selectedIndex] : undefined;

  const club = folder.club_enrollment?.club_section?.club;
  const clubName = club?.name ?? tTitle("titleDetail");
  const sectionName =
    folder.club_enrollment?.club_section?.name ??
    folder.club_enrollment?.club_section?.club_type?.name ??
    "";
  const title = sectionName ? `${clubName} · ${sectionName}` : clubName;
  const yearLabel = folder.club_enrollment?.ecclesiastical_year?.label ?? "";
  const points = (value: number) => formatNumber(value, { maximumFractionDigits: 2 });

  const current: FormState =
    form.id === effectiveId
      ? form
      : { id: effectiveId, points: "", notes: selected?.evaluation?.notes ?? "", attempted: false };
  const maxPoints = selected?.section.max_points ?? 0;
  const check = validatePoints(current.points, maxPoints);
  const pointsError =
    current.attempted && !check.ok
      ? t(`form.errors.${check.error}`, { max: maxPoints })
      : null;

  const nextId = selected ? nextSectionId(items, selected.section.section_id) : null;
  const nextName = rows.find((row) => row.section.section_id === nextId)?.section.name;

  function patchForm(patch: Partial<FormState>) {
    setForm({ ...current, ...patch, id: effectiveId });
  }

  async function saveAndNext() {
    if (!selected) return;
    if (!check.ok) {
      patchForm({ attempted: true });
      return;
    }
    const sectionId = selected.section.section_id;
    setSaving(true);
    try {
      await evaluateSection(folder.annual_folder_id, sectionId, {
        earned_points: check.value,
        ...(current.notes.trim() ? { notes: current.notes.trim() } : {}),
      });
      toast.success(nextId ? t("toasts.evaluated") : t("toasts.evaluatedLast"));
      await query.refetch();
      setForm({ id: null, points: "", notes: "", attempted: false });
      setSelectedId(nextId ?? sectionId);
    } catch (error) {
      toastError({
        title: messageOf(error, t("toasts.saveFailed")),
        onRetry: () => void saveAndNext(),
      });
    } finally {
      setSaving(false);
    }
  }

  async function decideUnion(decision: UnionConfirmationDecision, reason?: string) {
    if (!selected) return;
    const sectionId = selected.section.section_id;
    setDeciding(true);
    try {
      await confirmUnionSection(folder.annual_folder_id, sectionId, {
        decision,
        ...(reason ? { notes: reason } : {}),
      });
      toast.success(decision === "APPROVED" ? t("union.approved") : t("union.rejected"));
      setRejectOpen(false);
      await query.refetch();
      setSelectedId(nextSectionId(items, sectionId, new Set(["awaitingUnion"])) ?? sectionId);
    } catch (error) {
      toastError({ title: messageOf(error, t("union.failed")) });
    } finally {
      setDeciding(false);
    }
  }

  async function reopen() {
    if (!selected) return;
    try {
      await reopenSection(folder.annual_folder_id, selected.section.section_id);
    } catch (error) {
      throw new Error(messageOf(error, t("reopen.failed")));
    }
    toast.success(tFolders("toasts.section_reopened"));
    await query.refetch();
  }

  function evidenceDate(evidence: FolderEvidence): string {
    const value = evidence.uploaded_at ?? evidence.created_at;
    return value ? formatDate(value, { day: "numeric", month: "short" }) : "—";
  }

  const wasSent = (row: Row) => row.state !== "notSent";

  function rowSubtitle(row: Row): string {
    const max = row.section.max_points ?? 0;
    switch (row.state) {
      case "notSent":
        return t("row.notSent");
      case "toEvaluate":
        return t("row.evidencesPoints", {
          count: row.section.evidences.length,
          points: points(max),
        });
      default:
        return t("row.pointsOf", {
          earned: points(row.evaluation?.earned_points ?? 0),
          max: points(row.evaluation?.max_points ?? max),
        });
    }
  }

  function rowMarker(row: Row) {
    if (row.state === "toEvaluate") {
      return <StatusBadge intent="warning" size="xs" label={t("row.toEvaluate")} />;
    }
    if (row.state === "awaitingUnion") {
      return <StatusBadge intent="info" size="xs" label={t("row.inUnion")} />;
    }
    if (row.state === "rejected") {
      return <StatusBadge intent="destructive" size="xs" label={tFolders("sectionCard.statusRejected")} />;
    }
    return null;
  }

  function files(section: FolderSectionWithEvidences) {
    if (section.evidences.length === 0) {
      return <p className="text-sm text-muted-foreground">{t("panel.noFiles")}</p>;
    }
    return (
      <ul className="space-y-2" aria-label={t("panel.files")}>
        {section.evidences.map((evidence) => (
          <li
            key={evidence.evidence_id}
            className="flex min-w-0 items-center gap-3 rounded-lg bg-muted/40 px-3 py-2"
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-medium">
                {evidence.file_name ?? t("panel.fileNoName")}
              </p>
              <p className="text-xs text-muted-foreground">
                {evidence.uploaded_by ?? t("panel.uploaderUnknown")} ·{" "}
                {evidenceDate(evidence)}
              </p>
              {evidence.notes ? (
                <p className="mt-1 text-xs text-muted-foreground">{evidence.notes}</p>
              ) : null}
              {evidence.reviewer_note ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("panel.reviewerNote", { note: evidence.reviewer_note })}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setPreview({ evidence, all: section.evidences })}
            >
              {t("panel.view")}
            </Button>
          </li>
        ))}
      </ul>
    );
  }

  function result(row: Row, withPoints = true) {
    const ev = row.evaluation;
    if (!ev) return null;
    const max = ev.max_points || row.section.max_points || 0;
    return (
      <div className="space-y-2">
        {withPoints ? (
          <p className="text-sm font-semibold tabular-nums">
            {t("result.pointsOf", { earned: points(ev.earned_points), max: points(max) })}
          </p>
        ) : null}
        {ev.lf_approver ? (
          <p className="text-xs text-muted-foreground">
            {t("result.localField")}:{" "}
            {t("result.byAt", {
              name: ev.lf_approver.name,
              date: ev.lf_approved_at ? formatDateTime(ev.lf_approved_at) : "—",
            })}
          </p>
        ) : null}
        {ev.union_approver ? (
          <p className="text-xs text-muted-foreground">
            {t("result.union")}:{" "}
            {t("result.byAt", {
              name: ev.union_approver.name,
              date: ev.union_approved_at ? formatDateTime(ev.union_approved_at) : "—",
            })}
          </p>
        ) : null}
        {ev.union_decision === "REJECTED_OVERRIDE" ? (
          <p className="text-xs text-destructive">{t("result.unionRejected")}</p>
        ) : null}
        {ev.notes ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("result.notes")}: </span>
            {ev.notes}
          </p>
        ) : null}
      </div>
    );
  }

  function panel(row: Row) {
    const max = row.section.max_points ?? 0;
    const sent = latestEvidenceDate(row.section);
    const meta = [
      t("panel.position", { current: selectedIndex + 1, total: rows.length }),
      row.section.required ? t("panel.required") : null,
      t("panel.worth", { points: points(max) }),
      wasSent(row) && sent ? t("panel.sentOn", { date: formatDate(sent, { day: "numeric", month: "short" }) }) : null,
    ].filter(Boolean);

    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold tracking-tight">{row.section.name}</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">{meta.join(" · ")}</p>
          {row.section.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{row.section.description}</p>
          ) : null}
        </div>

        {row.state === "notSent" && row.section.evidences.length === 0 ? (
          <div>
            <p className="text-sm font-medium">{t("notSent.title")}</p>
            <p className="text-sm text-muted-foreground">{t("notSent.description")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t("panel.files")}</h4>
            {files(row.section)}
          </div>
        )}

        {row.state === "toEvaluate" ? (
          <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="evidence-points">{t("form.points")}</Label>
              <Input
                id="evidence-points"
                type="number"
                inputMode="numeric"
                min={0}
                max={max}
                step={1}
                value={current.points}
                onChange={(event) => patchForm({ points: event.target.value })}
                aria-invalid={pointsError ? true : undefined}
                aria-describedby="evidence-points-hint"
                className="tabular-nums"
              />
              <p
                id="evidence-points-hint"
                role={pointsError ? "alert" : undefined}
                className={pointsError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
              >
                {pointsError ?? t("form.pointsHint", { max: points(max) })}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evidence-notes">{t("form.notes")}</Label>
              <Textarea
                id="evidence-notes"
                rows={3}
                maxLength={500}
                value={current.notes}
                placeholder={t("form.notesPlaceholder")}
                onChange={(event) => patchForm({ notes: event.target.value })}
              />
            </div>
          </div>
        ) : null}

        {row.state === "awaitingUnion" && canConfirmUnion ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("union.decide", {
                earned: points(row.evaluation?.earned_points ?? 0),
                max: points(row.evaluation?.max_points ?? max),
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" loading={deciding} onClick={() => void decideUnion("APPROVED")}>
                {t("union.approve")}
              </Button>
              <Button type="button" variant="outline" disabled={deciding} onClick={() => setRejectOpen(true)}>
                {t("union.reject")}
              </Button>
            </div>
          </div>
        ) : null}

        {row.state === "awaitingUnion" && !canConfirmUnion ? (
          <p className="text-sm text-muted-foreground">
            {t("union.waiting", {
              earned: points(row.evaluation?.earned_points ?? 0),
              max: points(row.evaluation?.max_points ?? max),
            })}
          </p>
        ) : null}

        {row.state !== "toEvaluate" && row.state !== "notSent" ? (
          <div className="space-y-3">
            {result(row, row.state !== "awaitingUnion")}
            {canReopenState(row.state) ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setReopenOpen(true)}>
                {t("reopen.action")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <DetailHeader
        breadcrumbs={[
          { label: tTitle("titleList"), href: CLUBS_EVIDENCE_FOLDERS_BASE },
          { label: clubName },
        ]}
        title={title}
        subtitle={[folder.template?.name, yearLabel].filter(Boolean).join(" · ")}
        facts={[
          {
            label: t("scoreFact"),
            value: t("scoreValue", {
              earned: points(folder.total_earned_points ?? 0),
              max: points(folder.total_max_points ?? 0),
            }),
          },
          ...(club?.local_field?.name
            ? [{ label: t("localFieldFact"), value: club.local_field.name }]
            : []),
        ]}
        actions={
          <>
            <ExceptionStatus
              value={folder.status}
              normal={["open", "submitted", "under_evaluation", "evaluated"]}
              labels={{
                open: tFolders("statusBadge.open"),
                submitted: tFolders("statusBadge.submitted"),
                under_evaluation: tFolders("statusBadge.under_evaluation"),
                evaluated: tFolders("statusBadge.evaluated"),
                closed: tFolders("statusBadge.closed"),
              }}
              intents={{ closed: "neutral" }}
            />
            <Button asChild variant="outline" size="sm">
              <Link href={`${clubsEvidenceFolderPath(folder.annual_folder_id)}/view`}>
                {t("viewAsClub")}
              </Link>
            </Button>
          </>
        }
      />

      {query.isError ? (
        <StaleDataNotice at={query.dataUpdatedAt} onRetry={() => void query.refetch()} />
      ) : null}

      <SplitInbox
        items={rows}
        getId={(row) => row.section.section_id}
        selectedId={effectiveId}
        onSelect={setSelectedId}
        listLabel={t("listLabel")}
        emptyTitle={tFolders("evaluationClient.noSections")}
        renderItem={(row) => (
          <SplitInboxItemContent
            title={row.section.name}
            subtitle={rowSubtitle(row)}
            status={rowMarker(row)}
          />
        )}
        detail={selected ? panel(selected) : null}
        footer={
          selected?.state === "toEvaluate" ? (
            <SplitInboxFooter
              {...(nextName ? { nextLabel: nextName } : {})}
              onSaveNext={() => void saveAndNext()}
              pending={saving}
            />
          ) : undefined
        }
      />

      <AnnualFolderEvidenceViewerDialog
        key={preview?.evidence.evidence_id ?? "closed"}
        evidence={preview?.evidence ?? null}
        evidences={preview?.all ?? []}
        onSelectEvidence={(evidence) =>
          setPreview((current) => (current ? { ...current, evidence } : current))
        }
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      />

      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={t("union.rejectTitle", { name: selected?.section.name ?? "" })}
        description={t("union.rejectDescription")}
        label={t("union.rejectLabel")}
        placeholder={t("union.rejectPlaceholder")}
        confirmLabel={t("union.rejectConfirm")}
        pending={deciding}
        onConfirm={(reason) => decideUnion("REJECTED_OVERRIDE", reason)}
      />

      <ConfirmDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        title={t("reopen.title", { name: selected?.section.name ?? "" })}
        description={t("reopen.description")}
        confirmLabel={t("reopen.confirm")}
        cancelLabel={tConfirm("cancel")}
        onConfirm={reopen}
      />
    </div>
  );
}
