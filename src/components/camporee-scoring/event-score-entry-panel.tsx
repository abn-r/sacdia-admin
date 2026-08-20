"use client";

import { useMemo, useState, useActionState, useEffect } from "react";
import { Calculator } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { formatTabularNumber } from "@/lib/format-locale";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
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

  const selectedEvent = scoringEvents.find(
    (event) => event.camporee_event_id === selectedEventId,
  );
  const totalAwarded = calculateAwardedTotal(awardedPoints);
  const totalMax = rubrics.reduce((total, rubric) => total + Number(rubric.max_points || 0), 0);
  const scoreItems = rubrics.map((rubric) => ({
    camporee_event_rubric_id: rubric.camporee_event_rubric_id,
    awarded_points: awardedPoints[rubric.camporee_event_rubric_id] ?? 0,
  }));

  const selectedTarget = useMemo(
    () =>
      visibleTargets.find((target) => target.club_section_id === selectedSectionId) ??
      null,
    [selectedSectionId, visibleTargets],
  );
  const isOverride = Boolean(selectedTarget?.active_result_id);

  const assignedJudgeForSection = useMemo(() => {
    if (!selectedSectionId) return null;
    const assignment = eventAssignments.find(
      (item) =>
        item.club_section_id === selectedSectionId && item.judge_role === "primary",
    );
    if (!assignment) return null;
    return judges.find((judge) => judge.camporee_judge_id === assignment.camporee_judge_id);
  }, [eventAssignments, judges, selectedSectionId]);

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

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("eyebrow")}
        </p>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("title")}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </header>

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("eventLabel")}
        </Label>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {scoringEvents.map((event) => {
            const isSelected = event.camporee_event_id === selectedEventId;
            const criteriaCount = (rubricsByEvent[event.camporee_event_id] ?? []).length;

            return (
              <Button
                key={event.camporee_event_id}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-auto shrink-0 rounded-full px-4 py-2 text-left",
                  !isSelected && "bg-background/80",
                )}
                onClick={() => handleEventChange(event.camporee_event_id)}
              >
                <span className="flex flex-col items-start gap-0.5">
                  <span className="font-medium">{event.title}</span>
                  <span
                    className={cn(
                      "text-[11px]",
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {t("eventMeta", {
                      criteria: criteriaCount,
                      sections: (targetsByEvent[event.camporee_event_id] ?? []).length,
                    })}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t("statCriteria"), value: rubrics.length },
          { label: t("statSections"), value: allTargets.length },
          {
            label: t("statTotal"),
            value: `${formatPoints(totalAwarded)} / ${formatPoints(totalMax)}`,
          },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className={cn(
              "rounded-2xl bg-muted/30 p-4 ring-1 ring-foreground/10",
              STAGGER_CLASSES,
            )}
            style={getStaggerStyle(index, 40)}
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{stat.value}</p>
            {index === 2 && selectedEvent?.title && (
              <p className="mt-1 truncate text-xs text-muted-foreground">{selectedEvent.title}</p>
            )}
          </div>
        ))}
      </div>

      {selectedEventId && rubrics.length === 0 && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
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

      {canEdit && selectedEventId && rubrics.length > 0 && allTargets.length > 0 && (
        <form
          action={formAction}
          className="space-y-6 rounded-2xl bg-muted/20 p-1 ring-1 ring-foreground/10"
        >
          <div className="space-y-5 rounded-[calc(1rem-0.25rem)] bg-card p-5">
            <input type="hidden" name="camporee_id" value={camporeeId} />
            <input type="hidden" name="is_union" value={isUnionCamporee ? "true" : "false"} />
            <input type="hidden" name="event_id" value={selectedEventId} />
            <input type="hidden" name="club_section_id" value={selectedSectionId ?? ""} />
            <input type="hidden" name="source" value="manual_lf" />
            <input
              type="hidden"
              name="expected_active_result_id"
              value={selectedTarget?.active_result_id ?? ""}
            />
            <input type="hidden" name="items" value={JSON.stringify(scoreItems)} />

            <div className="grid gap-4 md:grid-cols-2">
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
                  <p className="text-xs text-muted-foreground">{t("judgeFilterHint")}</p>
                </div>
              )}

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
                {assignedJudgeForSection && (
                  <p className="text-xs text-muted-foreground">
                    {t("assignedJudgeHint", {
                      name: assignedJudgeForSection.name || assignedJudgeForSection.user_id,
                    })}
                  </p>
                )}
              </div>
            </div>

            {visibleTargets.length === 0 && selectedJudgeId !== ALL_JUDGES && (
              <p className="text-sm text-muted-foreground">{t("noSectionsForJudge")}</p>
            )}

            <div
              className="rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success-foreground dark:text-success"
              role="status"
            >
              {t("totalLive", {
                awarded: formatPoints(totalAwarded),
                max: formatPoints(totalMax),
              })}
            </div>

            <div className="space-y-3">
              {rubrics.map((rubric, index) => (
                <div
                  key={rubric.camporee_event_rubric_id}
                  className={cn(
                    "grid gap-4 rounded-xl bg-muted/20 p-4 ring-1 ring-foreground/10 md:grid-cols-[1fr_9rem] md:items-end",
                    STAGGER_CLASSES,
                  )}
                  style={getStaggerStyle(index, 30)}
                >
                  <div className="space-y-1">
                    <p className="font-medium">{rubric.title}</p>
                    {rubric.description && (
                      <p className="text-sm text-muted-foreground">{rubric.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t("maxPoints", { points: formatPoints(rubric.max_points) })}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`score-rubric-${rubric.camporee_event_rubric_id}`}>
                      {t("awardedLabel", { title: rubric.title })}
                    </Label>
                    <Input
                      id={`score-rubric-${rubric.camporee_event_rubric_id}`}
                      aria-label={t("awardedAria", { title: rubric.title })}
                      type="number"
                      min={0}
                      max={rubric.max_points}
                      step="0.01"
                      value={awardedPoints[rubric.camporee_event_rubric_id] ?? 0}
                      onChange={(event) =>
                        updateAwardedPoints(
                          rubric.camporee_event_rubric_id,
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="score-entry-notes">{t("notesLabel")}</Label>
              <Textarea
                id="score-entry-notes"
                name="notes"
                rows={2}
                required={isOverride}
                placeholder={
                  isOverride ? t("notesOverridePlaceholder") : t("notesPlaceholder")
                }
              />
              {isOverride && (
                <p className="text-xs text-muted-foreground">{t("notesOverrideHint")}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={!selectedSectionId || visibleTargets.length === 0}
                className="rounded-full px-6"
              >
                {t("submitButton")}
              </Button>
              {state.error && <p className="text-sm text-destructive">{state.error}</p>}
              {state.success && (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>
              )}
            </div>
          </div>
        </form>
      )}

      {!canEdit && selectedEventId && rubrics.length > 0 && (
        <p className="text-sm text-muted-foreground">{t("readOnlyHint")}</p>
      )}
    </div>
  );
}
