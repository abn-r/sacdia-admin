"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Scale,
  Trash2,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import {
  assignCamporeeEventJudgeAction,
  deleteCamporeeEventJudgeAssignmentAction,
  replaceCamporeeEventJudgeAssignmentAction,
  type CamporeeScoringActionState,
} from "@/lib/camporee-scoring/actions";
import { cn } from "@/lib/utils";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type {
  CamporeeEventJudgeAssignment,
  CamporeeJudge,
  CamporeeJudgeRole,
  CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";

export interface EventJudgeAssignmentsPanelProps {
  camporeeId: number;
  isUnionCamporee?: boolean;
  events: BackendCamporeeEvent[];
  judges: CamporeeJudge[];
  assignmentsByEvent: Record<number, CamporeeEventJudgeAssignment[]>;
  targetsByEvent: Record<number, CamporeeScoringTarget[]>;
  canEdit?: boolean;
}

function getJudgeName(judges: CamporeeJudge[], judgeId: string) {
  const judge = judges.find((item) => item.camporee_judge_id === judgeId);
  return judge?.name || judgeId;
}

function JudgeSlot({
  label,
  name,
  role,
  empty,
  canEdit,
  judges,
  currentJudgeId,
  busy,
  onAssignRequest,
  onReplace,
  onRemove,
}: {
  label: string;
  name?: string;
  role: CamporeeJudgeRole;
  empty?: boolean;
  canEdit?: boolean;
  judges: CamporeeJudge[];
  currentJudgeId?: string;
  busy?: boolean;
  onAssignRequest?: () => void;
  onReplace?: (judgeId: string) => void;
  onRemove?: () => void;
}) {
  const t = useTranslations("camporees.judgeAssignments");
  const intent = role === "primary" ? "primary" : "info";
  const [isReplacing, setIsReplacing] = useState(false);
  const [nextJudgeId, setNextJudgeId] = useState(currentJudgeId ?? "");

  useEffect(() => {
    if (isReplacing) setNextJudgeId(currentJudgeId ?? "");
  }, [currentJudgeId, isReplacing]);

  if (canEdit && !empty && isReplacing) {
    return (
      <div className="flex min-w-[180px] flex-1 flex-col gap-2 rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10">
        <p className="text-xs font-medium text-muted-foreground">
          {t("changeJudge")}
        </p>
        <Select value={nextJudgeId} onValueChange={setNextJudgeId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {judges.map((judge) => (
              <SelectItem
                key={judge.camporee_judge_id}
                value={judge.camporee_judge_id}
              >
                {judge.name || judge.user_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1"
            disabled={busy || !nextJudgeId || nextJudgeId === currentJudgeId}
            onClick={() => {
              if (!nextJudgeId || !onReplace) return;
              onReplace(nextJudgeId);
              setIsReplacing(false);
            }}
          >
            {t("saveJudgeChange")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setIsReplacing(false)}
          >
            {t("cancelEdit")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-[140px] flex-1 items-center gap-2 rounded-xl px-3 py-2 ring-1",
        empty
          ? "border-dashed bg-muted/20 ring-border/60"
          : "bg-card ring-foreground/10",
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          empty ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
        )}
      >
        <UserRound className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "truncate text-sm font-medium",
            empty && "text-muted-foreground",
          )}
        >
          {empty ? "—" : name}
        </p>
      </div>
      {!empty && <StatusBadge intent={intent} size="xs" label={label} />}

      {canEdit && empty && onAssignRequest && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          disabled={busy}
          onClick={onAssignRequest}
        >
          {t("assignSlot")}
        </Button>
      )}

      {canEdit && !empty && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              disabled={busy}
              aria-label={t("editAssignment")}
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => setIsReplacing(true)}>
              <Pencil className="size-4" aria-hidden />
              {t("changeJudge")}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={busy || !onRemove}
              onSelect={() => onRemove?.()}
            >
              <Trash2 className="size-4" aria-hidden />
              {t("removeAssignment")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

type EventSummary = {
  event: BackendCamporeeEvent;
  targets: CamporeeScoringTarget[];
  activeAssignments: CamporeeEventJudgeAssignment[];
  sectionsWithPrimary: number;
  pendingSections: number;
  primaryJudgeNames: string[];
};

export function EventJudgeAssignmentsPanel({
  camporeeId,
  isUnionCamporee = false,
  events,
  judges,
  assignmentsByEvent,
  targetsByEvent,
  canEdit = false,
}: EventJudgeAssignmentsPanelProps) {
  const t = useTranslations("camporees.judgeAssignments");
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [localAssignments, setLocalAssignments] = useState(assignmentsByEvent);

  useEffect(() => {
    setLocalAssignments(assignmentsByEvent);
  }, [assignmentsByEvent]);

  const scoringEvents = useMemo(
    () => events.filter((event) => event.scoring_enabled),
    [events],
  );

  const manageJudgesHref = `/dashboard/campamentos/jueces?scope=${
    isUnionCamporee ? "union" : "local"
  }&camporeeId=${camporeeId}`;

  const manageJudgesButton = (
    <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
      <Link href={manageJudgesHref}>
        <Users className="size-4" aria-hidden />
        {t("manageJudges")}
      </Link>
    </Button>
  );

  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<CamporeeJudgeRole>("primary");

  const eventSummaries = useMemo<EventSummary[]>(() => {
    return scoringEvents.map((event) => {
      const targets = targetsByEvent[event.camporee_event_id] ?? [];
      const activeAssignments = (localAssignments[event.camporee_event_id] ?? []).filter(
        (item) => item.active,
      );
      const primaryAssignments = activeAssignments.filter(
        (item) => item.judge_role === "primary",
      );
      const primarySectionIds = new Set(
        primaryAssignments.map((item) => item.club_section_id),
      );
      const sectionsWithPrimary = targets.filter((target) =>
        primarySectionIds.has(target.club_section_id),
      ).length;
      const primaryJudgeIds = [...new Set(primaryAssignments.map((a) => a.camporee_judge_id))];
      const primaryJudgeNames = primaryJudgeIds.map((id) => getJudgeName(judges, id));

      return {
        event,
        targets,
        activeAssignments,
        sectionsWithPrimary,
        pendingSections: Math.max(targets.length - sectionsWithPrimary, 0),
        primaryJudgeNames,
      };
    });
  }, [judges, localAssignments, scoringEvents, targetsByEvent]);

  const selectedSummary = eventSummaries.find(
    (item) => item.event.camporee_event_id === selectedEventId,
  );

  const activeAssignments = selectedSummary?.activeAssignments ?? [];
  const targets = selectedSummary?.targets ?? [];
  const selectedEvent = selectedSummary?.event;
  const sectionsWithPrimary = selectedSummary?.sectionsWithPrimary ?? 0;
  const pendingSections = selectedSummary?.pendingSections ?? 0;

  const primaryConflict = useMemo(() => {
    if (!selectedSectionId || selectedRole !== "primary") return false;
    return activeAssignments.some(
      (assignment) =>
        assignment.judge_role === "primary" &&
        assignment.club_section_id === selectedSectionId,
    );
  }, [activeAssignments, selectedRole, selectedSectionId]);

  function openEvent(eventId: number) {
    setSelectedEventId(eventId);
    setSelectedSectionId(null);
    setSelectedJudgeId("");
    setSelectedRole("primary");
    setActionError(null);
  }

  function backToList() {
    setSelectedEventId(null);
    setSelectedSectionId(null);
    setSelectedJudgeId("");
    setSelectedRole("primary");
    setActionError(null);
  }

  function requestAssign(sectionId: number, role: CamporeeJudgeRole) {
    setSelectedSectionId(sectionId);
    setSelectedRole(role);
    setSelectedJudgeId("");
    setActionError(null);
  }

  /**
   * Runs a judge-assignment mutation. The list is updated from the action
   * result right away; the route is refreshed in the background afterwards so
   * the rest of the page (tab counters, score entry) catches up without
   * blocking the UI or the toast.
   */
  async function runMutation(
    action: (
      prevState: CamporeeScoringActionState,
      formData: FormData,
    ) => Promise<CamporeeScoringActionState>,
    formData: FormData,
    successMessage: string,
    onSuccess?: (result: CamporeeScoringActionState) => void,
    options: { refreshOnError?: boolean } = {},
  ) {
    if (isPending) return;
    setActionError(null);
    setIsPending(true);
    let result: CamporeeScoringActionState;
    try {
      result = await action({}, formData);
    } catch {
      result = { error: t("mutationFailed") };
    } finally {
      setIsPending(false);
    }

    if (result.error) {
      setActionError(result.error);
      toast.error(result.error);
      // A replace deletes before it assigns, so a failure can leave the server
      // ahead of the list we show.
      if (options.refreshOnError) router.refresh();
      return;
    }

    onSuccess?.(result);
    toast.success(successMessage);
    router.refresh();
  }

  function deactivateLocal(assignment: CamporeeEventJudgeAssignment) {
    setLocalAssignments((prev) => ({
      ...prev,
      [assignment.camporee_event_id]: (prev[assignment.camporee_event_id] ?? []).map(
        (item) =>
          item.camporee_event_judge_assignment_id ===
          assignment.camporee_event_judge_assignment_id
            ? { ...item, active: false }
            : item,
      ),
    }));
  }

  function addLocal(assignment: CamporeeEventJudgeAssignment) {
    setLocalAssignments((prev) => ({
      ...prev,
      [assignment.camporee_event_id]: [
        ...(prev[assignment.camporee_event_id] ?? []).filter(
          (item) =>
            item.camporee_event_judge_assignment_id !==
            assignment.camporee_event_judge_assignment_id,
        ),
        assignment,
      ],
    }));
  }

  function handleAssignSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEventId || !selectedSectionId || !selectedJudgeId) return;

    void runMutation(
      assignCamporeeEventJudgeAction,
      new FormData(event.currentTarget),
      t("toastAssigned"),
      (result) => {
        if (result.assignment) addLocal(result.assignment);
        setSelectedSectionId(null);
        setSelectedJudgeId("");
        setSelectedRole("primary");
      },
    );
  }

  function handleRemove(assignment: CamporeeEventJudgeAssignment) {
    const formData = new FormData();
    formData.set("assignment_id", assignment.camporee_event_judge_assignment_id);
    formData.set("camporee_id", String(camporeeId));
    formData.set("is_union", isUnionCamporee ? "true" : "false");

    void runMutation(
      deleteCamporeeEventJudgeAssignmentAction,
      formData,
      t("toastRemoved"),
      () => deactivateLocal(assignment),
    );
  }

  function handleReplace(
    assignment: CamporeeEventJudgeAssignment,
    nextJudgeId: string,
    target: CamporeeScoringTarget,
  ) {
    const formData = new FormData();
    formData.set("assignment_id", assignment.camporee_event_judge_assignment_id);
    formData.set("event_id", String(assignment.camporee_event_id));
    formData.set("camporee_id", String(camporeeId));
    formData.set("is_union", isUnionCamporee ? "true" : "false");
    formData.set("club_section_id", String(assignment.club_section_id));
    formData.set("camporee_judge_id", nextJudgeId);
    formData.set("judge_role", assignment.judge_role);
    if (target.camporee_club_id) {
      formData.set("camporee_club_id", String(target.camporee_club_id));
    }

    void runMutation(
      replaceCamporeeEventJudgeAssignmentAction,
      formData,
      t("toastReplaced"),
      (result) => {
        deactivateLocal(assignment);
        if (result.assignment) addLocal(result.assignment);
      },
      { refreshOnError: true },
    );
  }

  if (scoringEvents.length === 0) {
    return (
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("eyebrow")}
            </p>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {t("title")}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {t("listDescription")}
              </p>
            </div>
          </div>
          {manageJudgesButton}
        </header>
        <EmptyState
          icon={Scale}
          title={t("emptyEventsTitle")}
          description={t("emptyEventsDescription")}
        />
      </div>
    );
  }

  // ── List: events overview table ────────────────────────────────────────────
  if (!selectedEventId || !selectedSummary) {
    return (
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("eyebrow")}
            </p>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {t("title")}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">{t("listDescription")}</p>
            </div>
          </div>
          {manageJudgesButton}
        </header>

        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("colEvent")}</TableHead>
                <TableHead className="text-right tabular-nums">{t("colSections")}</TableHead>
                <TableHead className="text-right tabular-nums">{t("colCovered")}</TableHead>
                <TableHead className="text-right tabular-nums">{t("colPending")}</TableHead>
                <TableHead>{t("colPrimaryJudges")}</TableHead>
                <RowActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventSummaries.map((summary) => {
                const judgesLabel =
                  summary.primaryJudgeNames.length === 0
                    ? t("noPrimaryJudges")
                    : summary.primaryJudgeNames.length <= 2
                      ? summary.primaryJudgeNames.join(", ")
                      : t("primaryJudgesMore", {
                          names: summary.primaryJudgeNames.slice(0, 2).join(", "),
                          count: summary.primaryJudgeNames.length - 2,
                        });

                return (
                  <TableRow
                    key={summary.event.camporee_event_id}
                    className={cn(
                      "cursor-pointer",
                      summary.pendingSections > 0 && "bg-warning/5",
                    )}
                    onClick={() => openEvent(summary.event.camporee_event_id)}
                  >
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium leading-snug">{summary.event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("eventAssignmentCount", {
                            count: summary.activeAssignments.length,
                          })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {summary.targets.length}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {summary.sectionsWithPrimary}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {summary.pendingSections > 0 ? (
                        <StatusBadge
                          intent="warning"
                          size="xs"
                          label={String(summary.pendingSections)}
                        />
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <p
                        className={cn(
                          "max-w-[220px] truncate text-sm",
                          summary.primaryJudgeNames.length === 0 &&
                            "text-muted-foreground",
                        )}
                        title={summary.primaryJudgeNames.join(", ")}
                      >
                        {judgesLabel}
                      </p>
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <RowActions
                        label={summary.event.title}
                        actions={[
                          {
                            label: t("openEvent"),
                            icon: ChevronRight,
                            onSelect: () => openEvent(summary.event.camporee_event_id),
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // ── Detail: sections × judges for selected event ───────────────────────────
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit gap-1.5 text-muted-foreground"
          onClick={backToList}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToList")}
        </Button>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {t("eyebrow")}
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {selectedEvent?.title}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">{t("detailDescription")}</p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: t("statSections"),
            value: targets.length,
            hint: selectedEvent?.title ?? "",
          },
          {
            label: t("statCovered"),
            value: sectionsWithPrimary,
            hint: t("statCoveredHint"),
          },
          {
            label: t("statPending"),
            value: pendingSections,
            hint: t("statPendingHint"),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-muted/30 p-4 ring-1 ring-foreground/10"
          >
            <p className="text-[11px] font-medium text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
              {stat.value}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>

      {actionError && (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        <div className="grid gap-3 border-b border-border/60 bg-muted/20 px-4 py-3 text-[11px] font-medium text-muted-foreground md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <span>{t("matrixSectionColumn")}</span>
          <span>{t("matrixJudgesColumn")}</span>
        </div>

        {targets.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={UserPlus}
              title={t("emptySectionsTitle")}
              description={t("emptySectionsDescription")}
              variant="no-results"
            />
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {targets.map((target) => {
              const sectionAssignments = activeAssignments.filter(
                (item) => item.club_section_id === target.club_section_id,
              );
              const primary = sectionAssignments.find(
                (item) => item.judge_role === "primary",
              );
              const assistants = sectionAssignments.filter(
                (item) => item.judge_role === "assistant",
              );
              const missingPrimary = !primary;

              return (
                <div
                  key={target.club_section_id}
                  className={cn(
                    "grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-start",
                    missingPrimary && "bg-warning/5",
                  )}
                >
                  <div className="space-y-1">
                    <p className="font-medium leading-snug">
                      {target.club_name ?? t("unknownClub")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {target.section_name ??
                        t("sectionFallback", { id: target.club_section_id })}
                    </p>
                    {missingPrimary && (
                      <StatusBadge
                        intent="warning"
                        size="xs"
                        label={t("missingPrimaryBadge")}
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-2 lg:flex-row">
                    <JudgeSlot
                      label={t("rolePrimary")}
                      name={
                        primary
                          ? getJudgeName(judges, primary.camporee_judge_id)
                          : undefined
                      }
                      role="primary"
                      empty={!primary}
                      canEdit={canEdit}
                      judges={judges}
                      currentJudgeId={primary?.camporee_judge_id}
                      busy={isPending}
                      onAssignRequest={() =>
                        requestAssign(target.club_section_id, "primary")
                      }
                      onReplace={
                        primary
                          ? (judgeId) => handleReplace(primary, judgeId, target)
                          : undefined
                      }
                      onRemove={primary ? () => handleRemove(primary) : undefined}
                    />
                    {assistants.length > 0 ? (
                      assistants.map((assistant) => (
                        <JudgeSlot
                          key={assistant.camporee_event_judge_assignment_id}
                          label={t("roleAssistant")}
                          name={getJudgeName(judges, assistant.camporee_judge_id)}
                          role="assistant"
                          canEdit={canEdit}
                          judges={judges}
                          currentJudgeId={assistant.camporee_judge_id}
                          busy={isPending}
                          onReplace={(judgeId) =>
                            handleReplace(assistant, judgeId, target)
                          }
                          onRemove={() => handleRemove(assistant)}
                        />
                      ))
                    ) : (
                      <JudgeSlot
                        label={t("roleAssistant")}
                        role="assistant"
                        empty
                        canEdit={canEdit}
                        judges={judges}
                        busy={isPending}
                        onAssignRequest={() =>
                          requestAssign(target.club_section_id, "assistant")
                        }
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canEdit && (
        <div className="rounded-2xl bg-muted/20 p-1 ring-1 ring-foreground/10">
          <div className="rounded-[calc(1rem-0.25rem)] bg-card p-5">
            <div className="mb-4 space-y-1">
              <p className="text-sm font-medium">{t("assignFormTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("assignFormDescription")}</p>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <input type="hidden" name="camporee_id" value={camporeeId} />
              <input
                type="hidden"
                name="is_union"
                value={isUnionCamporee ? "true" : "false"}
              />
              <input type="hidden" name="event_id" value={selectedEventId} />
              <input
                type="hidden"
                name="club_section_id"
                value={selectedSectionId ?? ""}
              />
              <input type="hidden" name="judge_role" value={selectedRole} />
              <input type="hidden" name="camporee_judge_id" value={selectedJudgeId} />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="assignment-section">{t("sectionLabel")}</Label>
                  <Select
                    value={selectedSectionId ? String(selectedSectionId) : ""}
                    onValueChange={(value) =>
                      setSelectedSectionId(value ? Number(value) : null)
                    }
                  >
                    <SelectTrigger id="assignment-section" className="w-full">
                      <SelectValue placeholder={t("selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {targets.map((target) => (
                        <SelectItem
                          key={target.club_section_id}
                          value={String(target.club_section_id)}
                        >
                          {target.club_name ?? t("unknownClub")} ·{" "}
                          {target.section_name ??
                            t("sectionFallback", { id: target.club_section_id })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignment-judge">{t("judgeLabel")}</Label>
                  <Select value={selectedJudgeId} onValueChange={setSelectedJudgeId}>
                    <SelectTrigger id="assignment-judge" className="w-full">
                      <SelectValue placeholder={t("selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {judges.map((judge) => (
                        <SelectItem
                          key={judge.camporee_judge_id}
                          value={judge.camporee_judge_id}
                        >
                          {judge.name || judge.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignment-role">{t("roleLabel")}</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(value) =>
                      setSelectedRole(value as CamporeeJudgeRole)
                    }
                  >
                    <SelectTrigger id="assignment-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">{t("rolePrimary")}</SelectItem>
                      <SelectItem value="assistant">{t("roleAssistant")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  loading={isPending}
                  disabled={primaryConflict || !selectedSectionId || !selectedJudgeId}
                  className="rounded-full px-6"
                >
                  {t("assignButton")}
                </Button>
                {primaryConflict && (
                  <p className="text-sm text-destructive">{t("primaryConflict")}</p>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
