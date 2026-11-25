"use client";

import { useMemo, useRef, useState, useActionState, useEffect } from "react";
import { Calculator } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import {
  submitCamporeeEventScoreAction,
  type CamporeeScoringActionState,
} from "@/lib/camporee-scoring/actions";
import { formatTabularNumber } from "@/lib/format-locale";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import { getCamporeeEventSectionScore } from "@/lib/api/camporee-scoring";
import { scoreEntryTotals } from "@/lib/camporee-events/score-entry";
import type {
  CamporeeEventJudgeAssignment,
  CamporeeEventRubric,
  CamporeeJudge,
  CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";

export interface EventScoreEntryPanelProps {
  camporeeId: number;
  isUnionCamporee?: boolean;
  events: BackendCamporeeEvent[];
  rubricsByEvent: Record<number, CamporeeEventRubric[]>;
  targetsByEvent: Record<number, CamporeeScoringTarget[]>;
  judges?: CamporeeJudge[];
  assignmentsByEvent?: Record<number, CamporeeEventJudgeAssignment[]>;
  canEdit?: boolean;
}

const ALL_JUDGES = "__all__";

/** Points loaded from the active official result, keyed by the selection it belongs to. */
type LoadedScore = {
  key: string;
  status: "ok" | "error";
  points: Record<number, number>;
};

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPoints(value: number) {
  return formatTabularNumber(value);
}

export function calculateAwardedTotal(values: Record<number, number>) {
  return Object.values(values).reduce((total, value) => total + Number(value || 0), 0);
}

function getTargetLabel(
  target: CamporeeScoringTarget,
  unknownClub: string,
  sectionFallback: (id: number) => string,
) {
  const section = target.section_name ?? sectionFallback(target.club_section_id);
  return `${target.club_name ?? unknownClub} · ${section}`;
}

export function EventScoreEntryPanel({
  camporeeId,
  isUnionCamporee = false,
  events,
  rubricsByEvent,
  targetsByEvent,
  judges = [],
  assignmentsByEvent = {},
  canEdit = false,
}: EventScoreEntryPanelProps) {
  const t = useTranslations("camporees.scoreEntry");
  const tEntry = useTranslations("evaluation.camporeeEvents.entry");
  const scoringEvents = useMemo(
    () => events.filter((event) => event.scoring_enabled),
    [events],
  );

  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    scoringEvents[0]?.camporee_event_id ?? null,
  );
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>(ALL_JUDGES);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(() => {
    const firstEventId = scoringEvents[0]?.camporee_event_id;
    if (!firstEventId) return null;
    return targetsByEvent[firstEventId]?.[0]?.club_section_id ?? null;
  });
  const [awardedPoints, setAwardedPoints] = useState<Record<number, number>>({});
  const [loadedScore, setLoadedScore] = useState<LoadedScore | null>(null);
  const [state, formAction] = useActionState<CamporeeScoringActionState, FormData>(
    submitCamporeeEventScoreAction,
    {},
  );

  const rubrics = selectedEventId ? rubricsByEvent[selectedEventId] ?? [] : [];
  const allTargets = selectedEventId ? targetsByEvent[selectedEventId] ?? [] : [];
  const eventAssignments = selectedEventId
    ? (assignmentsByEvent[selectedEventId] ?? []).filter((item) => item.active)
    : [];

  const judgeSectionIds = useMemo(() => {
    if (selectedJudgeId === ALL_JUDGES) return null;
    return new Set(
      eventAssignments
        .filter((item) => item.camporee_judge_id === selectedJudgeId)
        .map((item) => item.club_section_id),
    );
  }, [eventAssignments, selectedJudgeId]);

  const visibleTargets = useMemo(() => {
    if (!judgeSectionIds) return allTargets;
    return allTargets.filter((target) => judgeSectionIds.has(target.club_section_id));
  }, [allTargets, judgeSectionIds]);

  const totalMax = rubrics.reduce((total, rubric) => total + Number(rubric.max_points || 0), 0);

  const selectedTarget = useMemo(
    () =>
      visibleTargets.find((target) => target.club_section_id === selectedSectionId) ??
      null,
    [selectedSectionId, visibleTargets],
  );
  const activeResultId = selectedTarget?.active_result_id ?? null;
  const isOverride = Boolean(activeResultId);

  // A correction must start from the official points, never from zeros.
  const scoreKey =
    activeResultId && selectedEventId && selectedSectionId
      ? `${selectedEventId}:${selectedSectionId}:${activeResultId}`
      : null;
  const loadedForSelection = scoreKey && loadedScore?.key === scoreKey ? loadedScore : null;
  const scoreLoadState: "idle" | "loading" | "error" | "ready" = !scoreKey
    ? "idle"
    : !loadedForSelection
      ? "loading"
      : loadedForSelection.status === "ok"
        ? "ready"
        : "error";
  const scoreBlocked = scoreLoadState === "loading" || scoreLoadState === "error";

  const currentPoints: Record<number, number> = {};
  for (const rubric of rubrics) {
    const id = rubric.camporee_event_rubric_id;
    currentPoints[id] = awardedPoints[id] ?? loadedForSelection?.points[id] ?? 0;
  }
  const totalAwarded = calculateAwardedTotal(currentPoints);
  const { overMax } = scoreEntryTotals(rubrics, currentPoints);
  const scoreItems = rubrics.map((rubric) => ({
    camporee_event_rubric_id: rubric.camporee_event_rubric_id,
    awarded_points: currentPoints[rubric.camporee_event_rubric_id] ?? 0,
  }));

  const assignedJudgeForSection = useMemo(() => {
    if (!selectedSectionId) return null;
    const assignment = eventAssignments.find(
      (item) =>
        item.club_section_id === selectedSectionId && item.judge_role === "primary",
    );
    if (!assignment) return null;
    return judges.find((judge) => judge.camporee_judge_id === assignment.camporee_judge_id);
  }, [eventAssignments, judges, selectedSectionId]);

  // The action state changes identity on every submission; the ref guards
  // against re-toasting the same result when `t` changes identity.
  const toastedStateRef = useRef(state);
  useEffect(() => {
    if (toastedStateRef.current === state) return;
    toastedStateRef.current = state;
    if (state.error) {
      toast.error(state.error);
    } else if (state.success) {
      toast.success(
        state.scoreMode === "correction" ? t("savedCorrection") : t("savedOfficial"),
      );
    }
  }, [state, t]);

  useEffect(() => {
    if (!scoreKey || !selectedEventId || !selectedSectionId) return;
    let cancelled = false;

    getCamporeeEventSectionScore(selectedEventId, selectedSectionId)
      .then((score) => {
        if (cancelled) return;
        if (!score) {
          // An active result was announced but cannot be read: do not fall back to zeros.
          setLoadedScore({ key: scoreKey, status: "error", points: {} });
          return;
        }
        const points: Record<number, number> = {};
        for (const item of score.items) {
          points[item.camporee_event_rubric_id] = Number(item.awarded_points) || 0;
        }
        setLoadedScore({ key: scoreKey, status: "ok", points });
      })
      .catch(() => {
        if (cancelled) return;
        setLoadedScore({ key: scoreKey, status: "error", points: {} });
      });

    return () => {
      cancelled = true;
    };
  }, [scoreKey, selectedEventId, selectedSectionId]);

  useEffect(() => {
    if (visibleTargets.length === 0) {
      setSelectedSectionId(null);
      return;
    }
    const stillVisible = visibleTargets.some(
      (target) => target.club_section_id === selectedSectionId,
    );
    if (!stillVisible) {
      setSelectedSectionId(visibleTargets[0]?.club_section_id ?? null);
    }
  }, [selectedSectionId, visibleTargets]);

  function handleEventChange(eventId: number) {
    const nextTargets = targetsByEvent[eventId] ?? [];
    setSelectedEventId(eventId);
    setSelectedJudgeId(ALL_JUDGES);
    setSelectedSectionId(nextTargets[0]?.club_section_id ?? null);
    setAwardedPoints({});
  }

  function handleJudgeChange(judgeId: string) {
    setSelectedJudgeId(judgeId);
    setAwardedPoints({});
  }

  function updateAwardedPoints(rubricId: number, value: string) {
    setAwardedPoints((current) => ({
      ...current,
      [rubricId]: toNumber(value),
    }));
  }

  if (scoringEvents.length === 0) {
    return (
      <EmptyState
        icon={Calculator}
        title={t("emptyEventsTitle")}
        description={t("emptyEventsDescription")}
      />
    );
  }

  const canEnter = canEdit && selectedEventId && rubrics.length > 0 && allTargets.length > 0;

  const eventSelect = (
    <div className="space-y-2">
      <Label htmlFor="score-entry-event">{tEntry("eventLabel")}</Label>
      <Select
        value={selectedEventId ? String(selectedEventId) : ""}
        onValueChange={(value) => handleEventChange(Number(value))}
      >
        <SelectTrigger id="score-entry-event" className="w-full">
          <SelectValue placeholder={t("selectPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {scoringEvents.map((event) => (
            <SelectItem key={event.camporee_event_id} value={String(event.camporee_event_id)}>
              {tEntry("eventOption", {
                title: event.title,
                points: formatPoints(event.max_points),
              })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const content = (
    <div className="space-y-6">
      {selectedEventId && rubrics.length === 0 && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {t("noRubrics")}
        </p>
      )}

      {selectedEventId && allTargets.length === 0 && (
        <EmptyState
          icon={Calculator}
          title={t("emptySectionsTitle")}
          description={t("emptySectionsDescription")}
          variant="no-results"
        />
      )}

      <div className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          {eventSelect}

          {canEnter && (
            <>
              <div className="space-y-2">
                <Label htmlFor="score-entry-section">{t("sectionLabel")}</Label>
                <Select
                  value={selectedSectionId ? String(selectedSectionId) : ""}
                  onValueChange={(value) => {
                    setSelectedSectionId(value ? Number(value) : null);
                    setAwardedPoints({});
                  }}
                >
                  <SelectTrigger id="score-entry-section" className="w-full">
                    <SelectValue placeholder={t("selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleTargets.map((target) => (
                      <SelectItem
                        key={target.club_section_id}
                        value={String(target.club_section_id)}
                      >
                        {getTargetLabel(target, t("unknownClub"), (id) =>
                          t("sectionFallback", { id }),
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {judges.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="score-entry-judge">{t("judgeFilterLabel")}</Label>
                  <Select value={selectedJudgeId} onValueChange={handleJudgeChange}>
                    <SelectTrigger id="score-entry-judge" className="w-full">
                      <SelectValue placeholder={t("judgeFilterPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_JUDGES}>{t("judgeFilterAll")}</SelectItem>
                      {judges.map((judge) => (
                        <SelectItem key={judge.camporee_judge_id} value={judge.camporee_judge_id}>
                          {judge.name || judge.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {visibleTargets.length === 0 && selectedJudgeId !== ALL_JUDGES && (
                <p className="text-sm text-muted-foreground">{t("noSectionsForJudge")}</p>
              )}

              <p className="text-[13px] text-muted-foreground">
                {assignedJudgeForSection
                  ? tEntry("fallbackHintWithJudge", {
                      name: assignedJudgeForSection.name || assignedJudgeForSection.user_id,
                    })
                  : tEntry("fallbackHint")}
              </p>
            </>
          )}
        </div>

        {canEnter && (
          <div className="space-y-4">
            {scoreLoadState === "loading" && (
              <p className="text-sm text-muted-foreground" role="status">
                {t("scoreLoading")}
              </p>
            )}
            {scoreLoadState === "error" && (
              <p className="text-sm text-destructive" role="alert">
                {t("scoreLoadError")}
              </p>
            )}

            <div className="rounded-xl bg-card px-4 py-1 shadow-card">
              <ul className="divide-y">
                {rubrics.map((rubric) => {
                  const rubricId = rubric.camporee_event_rubric_id;
                  const exceeded = overMax.includes(rubricId);
                  return (
                    <li key={rubricId} className="flex items-center gap-4 py-3">
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={`score-rubric-${rubricId}`} className="text-sm">
                          {rubric.title}
                        </Label>
                        {rubric.description && (
                          <p className="text-[13px] text-muted-foreground">{rubric.description}</p>
                        )}
                        <p
                          className={
                            exceeded
                              ? "text-xs text-destructive"
                              : "text-xs text-muted-foreground"
                          }
                        >
                          {t("maxPoints", { points: formatPoints(rubric.max_points) })}
                        </p>
                      </div>
                      <Input
                        id={`score-rubric-${rubricId}`}
                        aria-label={t("awardedAria", { title: rubric.title })}
                        aria-invalid={exceeded || undefined}
                        className="w-24 text-right tabular-nums"
                        type="number"
                        min={0}
                        max={rubric.max_points}
                        step="0.01"
                        value={currentPoints[rubricId] ?? 0}
                        disabled={scoreBlocked}
                        onChange={(event) => updateAwardedPoints(rubricId, event.target.value)}
                      />
                    </li>
                  );
                })}
                <li className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm font-medium">{tEntry("total")}</span>
                  <output
                    aria-live="polite"
                    className="text-sm font-semibold tabular-nums"
                    data-testid="score-entry-total"
                  >
                    {tEntry("totalOf", {
                      awarded: formatPoints(totalAwarded),
                      max: formatPoints(totalMax),
                    })}
                  </output>
                </li>
              </ul>
            </div>

            {overMax.length > 0 && (
              <p role="alert" className="text-sm text-destructive">
                {tEntry("overMax")}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="score-entry-notes">{t("notesLabel")}</Label>
              <Textarea
                id="score-entry-notes"
                name="notes"
                rows={2}
                required={isOverride}
                placeholder={isOverride ? t("notesOverridePlaceholder") : t("notesPlaceholder")}
              />
              {isOverride && <p className="text-xs text-muted-foreground">{t("notesOverrideHint")}</p>}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {state.error && (
                <p className="mr-auto text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              )}
              <FormSubmitButton
                disabled={
                  !selectedSectionId ||
                  visibleTargets.length === 0 ||
                  scoreBlocked ||
                  overMax.length > 0
                }
              >
                {isOverride ? t("submitCorrectionButton") : tEntry("submit")}
              </FormSubmitButton>
            </div>
          </div>
        )}
      </div>

      {!canEdit && selectedEventId && rubrics.length > 0 && (
        <p className="text-sm text-muted-foreground">{t("readOnlyHint")}</p>
      )}
    </div>
  );

  if (!canEnter) return content;

  return (
    <form action={formAction}>
      <input type="hidden" name="camporee_id" value={camporeeId} />
      <input type="hidden" name="is_union" value={isUnionCamporee ? "true" : "false"} />
      <input type="hidden" name="event_id" value={selectedEventId ?? ""} />
      <input type="hidden" name="club_section_id" value={selectedSectionId ?? ""} />
      <input type="hidden" name="source" value="manual_lf" />
      <input
        type="hidden"
        name="expected_active_result_id"
        value={selectedTarget?.active_result_id ?? ""}
      />
      <input type="hidden" name="items" value={JSON.stringify(scoreItems)} />
      {content}
    </form>
  );
}
