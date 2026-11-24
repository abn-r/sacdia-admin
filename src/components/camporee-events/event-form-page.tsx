"use client";

/**
 * EventFormPage — shared client component for create/edit camporee event instances.
 *
 * Long form pattern B: a page with an index of sections and a sticky save bar
 * (`SectionFormPage`). Local and union camporees share it; every section stays
 * mounted so the server action receives every field.
 */

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormSection, SectionFormPage } from "@/components/shared/section-form-page";
import { Segmented } from "@/components/shared/segmented";
import { useFormModal } from "@/components/shared/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCalendarDate } from "@/lib/format-locale";
import { resolveSectionLogoSrc } from "@/lib/camporees/section-logo";
import { deriveDaysFromRange } from "@/lib/camporee-timeline/mapper";
import { EVENT_CATEGORIES } from "@/lib/camporee-timeline/event-categories";
import { VenueCreateDialog } from "@/components/camporee-events/venue-create-dialog";
import { RubricsEditor, areRubricsValid } from "@/components/camporee-events/rubrics-editor";
import { PenaltiesEditor } from "@/components/camporee-events/penalties-editor";
import { ScheduleBlocksEditor } from "@/components/camporee-events/schedule-blocks-editor";
import { EventAttachmentsSection } from "@/components/camporee-events/event-attachments-section";
import { EventHonorsPicker } from "@/components/camporee-events/event-honors-picker";
import { EventStaffAssignmentsSection } from "@/components/camporee-events/event-staff-assignments-section";
import type {
  CamporeeEventStatus,
  CamporeeEventDisplayCategory,
  CamporeeEventSection,
  CamporeeEventScheduleBlock,
  CamporeeEventType,
  BackendCamporeeEvent,
  CamporeeEventHonor,
  PenaltyRule,
} from "@/lib/api/camporee-events";
import type {
  CamporeeEventRubric,
  CamporeeTemplateRubricInput,
} from "@/lib/api/camporee-scoring";
import type { CamporeeVenue } from "@/lib/api/camporee-venues";
import type { Camporee, CamporeeClub } from "@/lib/api/camporees";
import type { CamporeeEventActionState } from "@/lib/camporee-events/actions";
import { RUBRICS_INITIALLY_CONFIGURED_FIELD } from "@/lib/camporee-events/rubric-sync";
import {
  EVENT_SECTION_IDS,
  firstEventDraftIssue,
  validateTimes,
  type EventDraftField,
  type TimeIssue,
} from "@/lib/camporee-events/event-draft";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserOption = {
  value: string; // user_id (UUID)
  label: string; // display name
  email?: string;
};

type FormAction = (
  prev: CamporeeEventActionState,
  data: FormData,
) => Promise<CamporeeEventActionState>;

export interface EventFormPageProps {
  mode: "create" | "edit";
  camporeeId: number;
  camporee: Camporee;
  venues: CamporeeVenue[];
  users: UserOption[];
  eventTypes?: CamporeeEventType[];
  camporeeClubs?: CamporeeClub[];
  isUnionCamporee?: boolean;
  event?: BackendCamporeeEvent;
  rubrics?: CamporeeEventRubric[];
  action: FormAction;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_VALUES: CamporeeEventStatus[] = [
  "programado",
  "publicado",
  "en_curso",
  "realizado",
  "cancelado",
];

const SECTION_TINT: Record<CamporeeEventSection, string> = {
  adventurers: "bg-section-aventureros/15 text-section-aventureros border-section-aventureros",
  pathfinders: "bg-section-conquistadores/15 text-section-conquistadores border-section-conquistadores",
  master_guides: "bg-section-guias/15 text-section-guias border-section-guias",
};

const NO_VENUE_VALUE = "__no_venue__";
const CREATE_VENUE_VALUE = "__create_venue__";
const NO_LEADER_VALUE = "__no_leader__";

/** Server-validated fields whose input is not a form control → the field to reveal. */
const FIELD_ANCHOR: Record<string, string> = {
  starts_at: EVENT_SECTION_IDS.schedule,
  ends_at: EVENT_SECTION_IDS.schedule,
  schedule_blocks: EVENT_SECTION_IDS.schedule,
  rubrics: EVENT_SECTION_IDS.points,
  scoring_enabled: EVENT_SECTION_IDS.points,
  penalties: EVENT_SECTION_IDS.points,
  sections: EVENT_SECTION_IDS.data,
};

function scrollToSection(id: string, focusSelector?: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  if (focusSelector) {
    const target = el?.querySelector<HTMLElement>(focusSelector);
    target?.focus({ preventScroll: true });
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EventFormPage({
  mode,
  camporeeId,
  camporee,
  venues: initialVenues,
  users,
  eventTypes = [],
  camporeeClubs = [],
  isUnionCamporee = false,
  event,
  rubrics: initialRubrics = [],
  action,
}: EventFormPageProps) {
  const t = useTranslations("evaluation.camporeeEvents.form");
  const tProg = useTranslations("evaluation.camporeeEvents.program");
  const tOld = useTranslations("camporees.eventInstanceForm");
  const locale = useLocale();
  const isEdit = mode === "edit";
  const backHref = isUnionCamporee
    ? `/dashboard/campamentos/union/${camporeeId}?tab=events`
    : `/dashboard/campamentos/${camporeeId}?tab=events`;

  const formRef = useRef<HTMLFormElement>(null);
  const [actionState, formAction, isPending] = useActionState<CamporeeEventActionState, FormData>(
    action,
    {},
  );

  // ── Core field state ─────────────────────────────────────────────────────────
  const [category, setCategory] = useState<CamporeeEventDisplayCategory>(
    event?.display_category ?? "logistico",
  );
  const [status, setStatus] = useState<CamporeeEventStatus>(event?.status ?? "programado");
  const [titleError, setTitleError] = useState(false);
  const [touched, setTouched] = useState(false);

  const days = useMemo(
    () =>
      deriveDaysFromRange(camporee.start_date, camporee.end_date).map((day) => ({
        number: day.numero,
        label: t("dayLabel", {
          number: day.numero,
          date: formatCalendarDate(day.fecha, locale, "short"),
        }),
      })),
    [camporee.start_date, camporee.end_date, locale, t],
  );
  const [dayNumber, setDayNumber] = useState<number>(event?.day_number ?? 1);

  // ── Time validation state ────────────────────────────────────────────────────
  const [startsAt, setStartsAt] = useState<string>(event?.starts_at ?? "");
  const [endsAt, setEndsAt] = useState<string>(event?.ends_at ?? "");
  const [timeIssue, setTimeIssue] = useState<TimeIssue>(null);
  const timeError =
    timeIssue === "format" ? t("timeFormat") : timeIssue === "order" ? t("timeOrder") : null;

  // ── Venue state ──────────────────────────────────────────────────────────────
  const [venues, setVenues] = useState<CamporeeVenue[]>(initialVenues);
  const [selectedVenueId, setSelectedVenueId] = useState<string>(
    event?.venue_id ? String(event.venue_id) : NO_VENUE_VALUE,
  );
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);

  function handleVenueCreated(venue: CamporeeVenue) {
    setVenues((prev) => [...prev, venue]);
    setSelectedVenueId(String(venue.camporee_venue_id));
    setVenueDialogOpen(false);
  }

  // ── Leader state ─────────────────────────────────────────────────────────────
  const [leaderMode, setLeaderMode] = useState<"user" | "external">(
    event?.leader_user_id ? "user" : event?.leader_name_override ? "external" : "user",
  );
  const [leaderUserId, setLeaderUserId] = useState<string>(
    event?.leader_user_id ?? NO_LEADER_VALUE,
  );

  // ── Sections state ───────────────────────────────────────────────────────────
  const enabledSections: CamporeeEventSection[] = [];
  if (camporee.includes_adventurers) enabledSections.push("adventurers");
  if (camporee.includes_pathfinders) enabledSections.push("pathfinders");
  if (camporee.includes_master_guides) enabledSections.push("master_guides");

  const [selectedSections, setSelectedSections] = useState<Set<CamporeeEventSection>>(
    new Set(
      (event?.sections ?? []).filter((s): s is CamporeeEventSection =>
        enabledSections.includes(s as CamporeeEventSection),
      ),
    ),
  );

  const [maxPoints, setMaxPoints] = useState<number>(event?.max_points ?? 0);
  const [minPoints, setMinPoints] = useState<number>(event?.min_points ?? 0);
  const [minPointsDraft, setMinPointsDraft] = useState<string>(String(event?.min_points ?? 0));
  const [penaltiesEnabled, setPenaltiesEnabled] = useState<boolean>(
    (event?.penalties?.length ?? 0) > 0 || (event?.min_points ?? 0) > 0,
  );
  const [penalties, setPenalties] = useState<PenaltyRule[]>(
    Array.isArray(event?.penalties) ? event.penalties : [],
  );
  const [scoringEnabled, setScoringEnabled] = useState<boolean>(event?.scoring_enabled ?? false);
  const [rubrics, setRubrics] = useState<CamporeeTemplateRubricInput[]>(
    initialRubrics.map((rubric) => ({
      title: rubric.title,
      description: rubric.description,
      max_points: rubric.max_points,
      display_order: rubric.display_order,
    })),
  );
  const defaultEventTypeId =
    event?.event_type_id ??
    eventTypes.find((type) => type.code === "general")?.event_type_id ??
    eventTypes[0]?.event_type_id;
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string>(
    defaultEventTypeId ? String(defaultEventTypeId) : "",
  );
  const [selectedHonors, setSelectedHonors] = useState<CamporeeEventHonor[]>(event?.honors ?? []);
  const [scheduleBlocks, setScheduleBlocks] = useState<CamporeeEventScheduleBlock[]>(() => {
    const existing = event?.schedule_blocks ?? [];
    if (existing.length > 0) {
      return existing.map((block, index) => ({
        title: block.title ?? "",
        description: block.description ?? null,
        day_number: block.day_number ?? event?.day_number ?? 1,
        starts_at: block.starts_at ?? null,
        ends_at: block.ends_at ?? null,
        venue_id: block.venue_id ?? null,
        display_order: block.display_order ?? index,
        capacity: block.capacity ?? null,
        notes: block.notes ?? null,
        assignments: (block.assignments ?? []).map((assignment) => ({
          camporee_club_id: assignment.camporee_club_id ?? undefined,
          club_section_id: assignment.club_section_id,
        })),
      }));
    }
    return [
      {
        title: "",
        day_number: event?.day_number ?? 1,
        starts_at: event?.starts_at ?? null,
        ends_at: event?.ends_at ?? null,
        venue_id: null,
        display_order: 0,
        assignments: [],
      },
    ];
  });

  function handleScheduleBlocksChange(next: CamporeeEventScheduleBlock[]) {
    setScheduleBlocks(next);
    const primary = next[0];
    if (!primary) return;
    setDayNumber(primary.day_number);
    setStartsAt(primary.starts_at ?? "");
    setEndsAt(primary.ends_at ?? "");
    setTimeIssue(validateTimes(primary.starts_at ?? "", primary.ends_at ?? ""));
  }

  function handleEventTypeChange(value: string) {
    setSelectedEventTypeId(value);
    const selectedType = eventTypes.find((type) => String(type.event_type_id) === value);
    if (selectedType?.code === "scoring") setScoringEnabled(true);
  }

  function toggleSection(s: CamporeeEventSection) {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const modal = useFormModal(backHref);

  // Anything the user changed since the page opened (native inputs set `touched`;
  // controlled state is compared against its first value).
  const initialSignature = useRef<string | null>(null);
  const signature = JSON.stringify([
    category,
    status,
    selectedVenueId,
    leaderMode,
    leaderUserId,
    Array.from(selectedSections),
    maxPoints,
    minPoints,
    penaltiesEnabled,
    penalties,
    scoringEnabled,
    rubrics,
    selectedEventTypeId,
    selectedHonors,
    scheduleBlocks,
  ]);
  if (initialSignature.current === null) initialSignature.current = signature;
  const dirty = touched || signature !== initialSignature.current;

  const sectionList = useMemo(
    () => [
      { id: EVENT_SECTION_IDS.data, title: t("sections.data") },
      { id: EVENT_SECTION_IDS.schedule, title: t("sections.schedule") },
      { id: EVENT_SECTION_IDS.leader, title: t("sections.leader") },
      { id: EVENT_SECTION_IDS.points, title: t("sections.points") },
      { id: EVENT_SECTION_IDS.attachments, title: t("sections.attachments") },
    ],
    [t],
  );

  // The event was saved but its rubrics were not: leave the form (never keep a
  // saved event open for a retry that would duplicate it) and say why.
  useEffect(() => {
    if (!actionState.warning) return;
    toast.warning(tOld("rubricsWarningTitle"), {
      description: tOld("rubricsWarningDescription", { detail: actionState.warning }),
    });
    modal.complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to each new action result only
  }, [actionState]);

  useEffect(() => {
    if (!actionState.saved) return;
    toast.success(actionState.saved === "created" ? tOld("createdToast") : tOld("updatedToast"));
    modal.complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to each new action result only
  }, [actionState]);

  // Server-side field errors: reveal the field (or the section that owns it).
  useEffect(() => {
    const field = actionState.field;
    if (!field) return;
    const control = formRef.current?.querySelector<HTMLElement>(`[name="${field}"]:not([type="hidden"])`);
    if (control) {
      control.scrollIntoView?.({ behavior: "smooth", block: "center" });
      control.focus({ preventScroll: true });
      return;
    }
    const anchor = FIELD_ANCHOR[field];
    if (anchor) scrollToSection(anchor);
  }, [actionState]);

  const rubricsValid = areRubricsValid(scoringEnabled, rubrics, maxPoints);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const title = String(new FormData(e.currentTarget).get("title") ?? "");
    const issue = firstEventDraftIssue({ title, timeIssue, scoringEnabled, rubricsValid });
    setTitleError(issue?.field === "title");
    if (!issue) return;
    e.preventDefault();
    const focus: Record<EventDraftField, string | undefined> = {
      title: "#title",
      times: undefined,
      rubrics: "#max_points",
    };
    scrollToSection(EVENT_SECTION_IDS[issue.section], focus[issue.field]);
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      onInput={() => setTouched(true)}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      {/* Hidden fields for IDs and controlled state */}
      <input type="hidden" name="camporee_id" value={String(camporeeId)} />
      <input type="hidden" name="is_union" value={String(isUnionCamporee)} />
      {isEdit && event && <input type="hidden" name="id" value={String(event.camporee_event_id)} />}
      <input
        type="hidden"
        name={RUBRICS_INITIALLY_CONFIGURED_FIELD}
        value={String(initialRubrics.length > 0 || event?.scoring_enabled === true)}
      />
      <input type="hidden" name="display_category" value={category} />
      <input type="hidden" name="status" value={isEdit ? status : "programado"} />
      <input type="hidden" name="day_number" value={String(dayNumber)} />
      <input type="hidden" name="starts_at" value={startsAt} />
      <input type="hidden" name="ends_at" value={endsAt} />
      {selectedEventTypeId && (
        <input type="hidden" name="event_type_id" value={selectedEventTypeId} />
      )}
      <input type="hidden" name="schedule_blocks" value={JSON.stringify(scheduleBlocks)} />
      <input
        type="hidden"
        name="venue_id"
        value={
          selectedVenueId === NO_VENUE_VALUE || selectedVenueId === CREATE_VENUE_VALUE
            ? ""
            : selectedVenueId
        }
      />
      {leaderMode === "user" && (
        <input
          type="hidden"
          name="leader_user_id"
          value={leaderUserId === NO_LEADER_VALUE ? "" : leaderUserId}
        />
      )}
      <input type="hidden" name="sections" value={JSON.stringify(Array.from(selectedSections))} />

      <SectionFormPage
        sections={sectionList}
        dirty={dirty}
        pending={isPending}
        onSave={() => formRef.current?.requestSubmit()}
        onCancel={() => modal.close()}
        saveLabel={isEdit ? t("saveEdit") : t("saveCreate")}
        footerNote={!dirty && !isEdit ? t("createNote") : undefined}
      >
        {actionState.error && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {actionState.error}
          </div>
        )}

        {/* ══ Datos ══ */}
        <FormSection id={EVENT_SECTION_IDS.data} title={t("sections.data")}>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">
                {t("fields.title")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                required
                maxLength={150}
                defaultValue={event?.title ?? ""}
                placeholder={t("fields.titlePlaceholder")}
                aria-invalid={titleError || undefined}
                aria-describedby={titleError ? "title-error" : undefined}
              />
              {titleError && (
                <p id="title-error" role="alert" className="text-xs text-destructive">
                  {t("errors.title")}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">
                {t("fields.description")}{" "}
                <span className="font-normal text-muted-foreground">({t("optional")})</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={event?.description ?? ""}
                placeholder={tOld("descriptionPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_category_select">{t("fields.category")}</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as CamporeeEventDisplayCategory)}
              >
                <SelectTrigger id="display_category_select" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {tProg(`categories.${c.id}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {eventTypes.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="event_type_id">{t("fields.eventType")}</Label>
                <Select value={selectedEventTypeId} onValueChange={handleEventTypeChange}>
                  <SelectTrigger id="event_type_id" className="w-full">
                    <SelectValue placeholder={t("fields.eventTypePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.event_type_id} value={String(type.event_type_id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t("fields.eventTypeHint")}</p>
              </div>
            )}

            {isEdit && (
              <div className="space-y-2">
                <Label htmlFor="event_status">{t("fields.status")}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as CamporeeEventStatus)}>
                  <SelectTrigger id="event_status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {tProg(`statuses.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {tOld("staffAssignments.publishHint")}
                </p>
              </div>
            )}
          </div>

          {enabledSections.length > 0 && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">{t("fields.participants")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("fields.participantsHint")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {enabledSections.map((s) => {
                  const active = selectedSections.has(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleSection(s)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                        active
                          ? cn("font-semibold", SECTION_TINT[s])
                          : "border-border text-foreground hover:bg-muted",
                      )}
                    >
                      <span className="relative size-7 shrink-0 overflow-hidden rounded-full bg-background ring-1 ring-foreground/10">
                        <Image
                          src={resolveSectionLogoSrc(s)}
                          alt=""
                          fill
                          sizes="28px"
                          className="object-contain p-0.5"
                        />
                      </span>
                      {tProg(`sections.${s}`)}
                      {active && <Check className="size-3.5 shrink-0" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </FormSection>

        {/* ══ Horario y sede ══ */}
        <FormSection id={EVENT_SECTION_IDS.schedule} title={t("sections.schedule")}>
          <ScheduleBlocksEditor
            value={scheduleBlocks}
            onChange={handleScheduleBlocksChange}
            days={days}
            venues={venues}
            camporeeClubs={camporeeClubs}
            allowedSectionKinds={
              selectedSections.size > 0 ? Array.from(selectedSections) : enabledSections
            }
            timeError={timeError}
          />

          <div className="max-w-md space-y-2">
            <Label htmlFor="venue_select">{t("fields.venue")}</Label>
            {venues.length === 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">{t("fields.venueEmpty")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => setVenueDialogOpen(true)}
                >
                  {t("fields.venueCreateFirst")}
                </Button>
              </div>
            ) : (
              <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                <SelectTrigger id="venue_select" className="w-full">
                  <SelectValue placeholder={t("fields.venueNone")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_VENUE_VALUE}>{t("fields.venueNone")}</SelectItem>
                  {venues.map((v) => (
                    <SelectItem key={v.camporee_venue_id} value={String(v.camporee_venue_id)}>
                      {v.name}
                      {v.capacity != null && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({t("fields.venueCapacity", { capacity: v.capacity })})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                  <SelectItem value={CREATE_VENUE_VALUE}>
                    <span className="font-medium text-primary">{t("fields.venueCreateNew")}</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {selectedVenueId === CREATE_VENUE_VALUE && !venueDialogOpen && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => {
                  setSelectedVenueId(NO_VENUE_VALUE);
                  setVenueDialogOpen(true);
                }}
              >
                {t("fields.venueOpenForm")}
              </Button>
            )}
          </div>

          <VenueCreateDialog
            open={venueDialogOpen}
            onOpenChange={setVenueDialogOpen}
            camporeeId={camporeeId}
            isUnionCamporee={isUnionCamporee}
            onCreated={handleVenueCreated}
          />
        </FormSection>

        {/* ══ Responsable ══ */}
        <FormSection
          id={EVENT_SECTION_IDS.leader}
          title={t("sections.leader")}
          description={t("fields.leaderHint")}
        >
          <Segmented
            label={t("fields.leaderMode")}
            value={leaderMode}
            onChange={setLeaderMode}
            size="sm"
            options={[
              { value: "user", label: t("fields.leaderUser") },
              { value: "external", label: t("fields.leaderExternal") },
            ]}
          />

          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            {leaderMode === "user" ? (
              <div className="space-y-2">
                <Label htmlFor="leader_user_select">
                  <UserRound className="size-3.5" aria-hidden />
                  {t("fields.leaderUserLabel")}
                </Label>
                <Select value={leaderUserId} onValueChange={setLeaderUserId}>
                  <SelectTrigger id="leader_user_select" className="w-full">
                    <SelectValue placeholder={t("fields.leaderUserPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_LEADER_VALUE}>{t("fields.leaderNone")}</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                        {u.email && (
                          <span className="ml-1.5 text-xs text-muted-foreground">{u.email}</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="leader_name_override">{t("fields.leaderExternalName")}</Label>
                <Input
                  id="leader_name_override"
                  name="leader_name_override"
                  maxLength={100}
                  defaultValue={event?.leader_name_override ?? ""}
                  placeholder={t("fields.leaderExternalPlaceholder")}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="leader_role">
                {t("fields.leaderRole")}{" "}
                <span className="font-normal text-muted-foreground">({t("optional")})</span>
              </Label>
              <Input
                id="leader_role"
                name="leader_role"
                maxLength={100}
                defaultValue={event?.leader_role ?? ""}
                placeholder={t("fields.leaderRolePlaceholder")}
              />
            </div>
          </div>

          {isEdit && event ? (
            <EventStaffAssignmentsSection
              eventId={event.camporee_event_id}
              camporeeId={camporeeId}
              camporeeType={isUnionCamporee ? "union" : "local"}
              initialAssignments={event.staff_assignments}
            />
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium">{tOld("staffAssignments.title")}</p>
              <p className="text-sm text-muted-foreground">{tOld("staffAssignments.createHint")}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{t("fields.honors")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("fields.honorsHint")}</p>
            </div>
            <EventHonorsPicker value={selectedHonors} onChange={setSelectedHonors} />
          </div>
        </FormSection>

        {/* ══ Puntos y rúbricas ══ */}
        <FormSection id={EVENT_SECTION_IDS.points} title={t("sections.points")}>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max_points">
                {t("fields.maxPoints")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="max_points"
                name="max_points"
                type="number"
                min={0}
                required
                value={maxPoints}
                onChange={(e) => {
                  const raw = e.target.value;
                  const next = raw === "" ? 0 : Number(raw);
                  if (!Number.isFinite(next) || next < 0) return;
                  const floored = Math.floor(next);
                  setMaxPoints(floored);
                  if (minPoints > floored) {
                    setMinPoints(floored);
                    setMinPointsDraft(String(floored));
                  }
                }}
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_points">
                {t("fields.minPoints")}
                {!penaltiesEnabled && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    ({t("fields.minPointsOnlyPenalty")})
                  </span>
                )}
              </Label>
              <Input
                id="min_points"
                name="min_points"
                type="number"
                min={0}
                max={maxPoints}
                disabled={!penaltiesEnabled}
                value={penaltiesEnabled ? minPointsDraft : "0"}
                onChange={(e) => {
                  const raw = e.target.value;
                  // Allow empty while editing so "0" can be typed / kept.
                  if (raw !== "" && !/^\d+$/.test(raw)) return;
                  setMinPointsDraft(raw);
                  if (raw === "") {
                    setMinPoints(0);
                    return;
                  }
                  setMinPoints(Math.min(Number(raw), maxPoints));
                }}
                onBlur={() => setMinPointsDraft(String(minPoints))}
                placeholder="0"
              />
              {penaltiesEnabled && (
                <p className="text-xs text-muted-foreground">{t("fields.minPointsHint")}</p>
              )}
            </div>
          </div>

          <RubricsEditor
            enabled={scoringEnabled}
            onEnabledChange={setScoringEnabled}
            value={rubrics}
            onChange={setRubrics}
            maxPoints={maxPoints}
          />

          <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="penalties_enabled" className="text-sm font-medium">
                {t("fields.penaltiesToggle")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("fields.penaltiesToggleHint")}</p>
            </div>
            <Switch
              id="penalties_enabled"
              checked={penaltiesEnabled}
              onCheckedChange={(checked) => {
                setPenaltiesEnabled(checked);
                if (!checked) {
                  setMinPoints(0);
                  setMinPointsDraft("0");
                  setPenalties([]);
                }
              }}
            />
          </div>

          {penaltiesEnabled && (
            <div className="space-y-2">
              <Label>{t("fields.penalties")}</Label>
              <PenaltiesEditor value={penalties} onChange={setPenalties} />
            </div>
          )}

          {!penaltiesEnabled && (
            <>
              <input type="hidden" name="min_points" value="0" />
              <input type="hidden" name="penalties" value="[]" />
            </>
          )}
        </FormSection>

        {/* ══ Adjuntos ══ */}
        <FormSection id={EVENT_SECTION_IDS.attachments} title={t("sections.attachments")}>
          {isEdit && event ? (
            <EventAttachmentsSection
              eventId={event.camporee_event_id}
              initialAttachments={event.attachments}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t("attachmentsCreateHint")}</p>
          )}
        </FormSection>
      </SectionFormPage>
    </form>
  );
}
