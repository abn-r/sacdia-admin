"use client";


/**
 * EventFormPage — shared client component for create/edit camporee event instances.
 *
 * DS rule §6.1: rendered as an intercepted-route modal over the agenda, with a
 * full-page fallback. Four steps; all stay mounted so the server action gets
 * every field.
 *
 * PR6a: core fields — title, description, day_number, starts_at, ends_at,
 *       display_category (button grid), status (Select).
 * PR6b: venue Select + VenueCreateDialog inline.
 * PR6c: leader picker (user FK or external override) + sections multi-toggle.
 *       Additional numeric fields: capacity, registered_count, max_points.
 */

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Check, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FormModalBody,
  FormModalFooter,
  FormModalSteps,
  useFormModal,
} from "@/components/shared/form-modal";
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
import { resolveSectionLogoSrc } from "@/lib/camporees/section-logo";
import { deriveDaysFromRange } from "@/lib/camporee-timeline/mapper";
import {
  EVENT_CATEGORIES,
} from "@/lib/camporee-timeline/event-categories";
import {
  VenueCreateDialog,
} from "@/components/camporee-events/venue-create-dialog";
import { RubricsEditor } from "@/components/camporee-events/rubrics-editor";
import { PenaltiesEditor } from "@/components/camporee-events/penalties-editor";
import { ScheduleBlocksEditor } from "@/components/camporee-events/schedule-blocks-editor";
import { EventHonorsPicker } from "@/components/camporee-events/event-honors-picker";
import { useFormSteps } from "@/components/shared/use-form-steps";
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

const STATUS_OPTIONS: { value: CamporeeEventStatus; label: string }[] = [
  { value: "programado", label: "Programado" },
  { value: "publicado", label: "Publicado" },
  { value: "en_curso", label: "En curso" },
  { value: "realizado", label: "Realizado" },
  { value: "cancelado", label: "Cancelado" },
];

const SECTION_LABELS: Record<CamporeeEventSection, string> = {
  adventurers: "Aventureros",
  pathfinders: "Conquistadores",
  master_guides: "Guías Mayores",
};

const SECTION_TINT: Record<CamporeeEventSection, string> = {
  adventurers: "bg-section-aventureros/15 text-section-aventureros border-section-aventureros",
  pathfinders: "bg-section-conquistadores/15 text-section-conquistadores border-section-conquistadores",
  master_guides: "bg-section-guias/15 text-section-guias border-section-guias",
};

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const NO_VENUE_VALUE = "__no_venue__";
const CREATE_VENUE_VALUE = "__create_venue__";
const NO_LEADER_VALUE = "__no_leader__";

// ─── SubmitButton ─────────────────────────────────────────────────────────────

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button loading={pending} type="submit">
      <Check className="size-4" />
      {label}
    </Button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/** Server-validated fields whose input is not inside a step container → step index. */
const EVENT_FIELD_STEP: Record<string, number> = {
  starts_at: 1,
  ends_at: 1,
};

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
  const t = useTranslations("camporees.eventInstanceForm");
  const isEdit = mode === "edit";
  const backHref = isUnionCamporee
    ? `/dashboard/campamentos/union/${camporeeId}?tab=events`
    : `/dashboard/campamentos/${camporeeId}?tab=events`;

  const [actionState, formAction] = useActionState<CamporeeEventActionState, FormData>(
    action,
    {},
  );

  // ── Core field state ─────────────────────────────────────────────────────────
  const [category, setCategory] = useState<CamporeeEventDisplayCategory>(
    event?.display_category ?? "logistico",
  );
  const [status, setStatus] = useState<CamporeeEventStatus>(
    event?.status ?? "programado",
  );

  // Day selector — derive range from camporee start/end dates
  const days = deriveDays(camporee.start_date, camporee.end_date);
  const [dayNumber, setDayNumber] = useState<number>(event?.day_number ?? 1);

  // ── Time validation state ────────────────────────────────────────────────────
  const [startsAt, setStartsAt] = useState<string>(event?.starts_at ?? "");
  const [endsAt, setEndsAt] = useState<string>(event?.ends_at ?? "");
  const [timeError, setTimeError] = useState<string | null>(null);

  function validateTimes(start: string, end: string) {
    if (start && !TIME_REGEX.test(start)) {
      setTimeError("Formato de hora inválido (HH:MM)");
      return;
    }
    if (end && !TIME_REGEX.test(end)) {
      setTimeError("Formato de hora inválido (HH:MM)");
      return;
    }
    if (start && end && start >= end) {
      setTimeError("La hora de fin debe ser posterior a la hora de inicio");
      return;
    }
    setTimeError(null);
  }

  // ── PR6b: Venue state ────────────────────────────────────────────────────────
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

  // ── PR6c: Leader state ───────────────────────────────────────────────────────
  const [leaderMode, setLeaderMode] = useState<"user" | "external">(
    event?.leader_user_id ? "user" : event?.leader_name_override ? "external" : "user",
  );
  const [leaderUserId, setLeaderUserId] = useState<string>(
    event?.leader_user_id ?? NO_LEADER_VALUE,
  );

  // ── PR6c: Sections state ─────────────────────────────────────────────────────
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
  const [minPointsDraft, setMinPointsDraft] = useState<string>(
    String(event?.min_points ?? 0),
  );
  const [penaltiesEnabled, setPenaltiesEnabled] = useState<boolean>(
    (event?.penalties?.length ?? 0) > 0 || (event?.min_points ?? 0) > 0,
  );
  const [penalties, setPenalties] = useState<PenaltyRule[]>(
    Array.isArray(event?.penalties) ? event.penalties : [],
  );
  const [scoringEnabled, setScoringEnabled] = useState<boolean>(
    event?.scoring_enabled ?? false,
  );
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
  const [selectedHonors, setSelectedHonors] = useState<CamporeeEventHonor[]>(
    event?.honors ?? [],
  );
  const [scheduleBlocks, setScheduleBlocks] = useState<CamporeeEventScheduleBlock[]>(
    () => {
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
    },
  );

  function handleScheduleBlocksChange(next: CamporeeEventScheduleBlock[]) {
    setScheduleBlocks(next);
    const primary = next[0];
    if (!primary) return;
    setDayNumber(primary.day_number);
    setStartsAt(primary.starts_at ?? "");
    setEndsAt(primary.ends_at ?? "");
    validateTimes(primary.starts_at ?? "", primary.ends_at ?? "");
  }

  function handleEventTypeChange(value: string) {
    setSelectedEventTypeId(value);
    const selectedType = eventTypes.find(
      (type) => String(type.event_type_id) === value,
    );
    if (selectedType?.code === "scoring") {
      setScoringEnabled(true);
    }
  }

  function toggleSection(s: CamporeeEventSection) {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const tModal = useTranslations("shared.formModal");
  const modal = useFormModal(backHref);
  const steps = [t("steps.general"), t("steps.schedule"), t("steps.leader"), t("steps.scoring")];
  const {
    step,
    direction,
    lastStep,
    stepIncomplete,
    goTo,
    goNext,
    goToField,
    handleSubmit,
    handleKeyDown,
    stepRef,
  } = useFormSteps(steps.length);

  // The event was saved but its rubrics were not: close the form (never leave
  // a saved event open for a retry that would duplicate it) and say why.
  useEffect(() => {
    if (!actionState.warning) return;
    toast.warning(t("rubricsWarningTitle"), {
      description: t("rubricsWarningDescription", { detail: actionState.warning }),
    });
    modal.complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to each new action result only
  }, [actionState]);

  useEffect(() => {
    if (!actionState.field) return;
    // Hidden/aggregate fields that live outside a step container map to their step.
    if (!goToField(actionState.field)) {
      const fallback = EVENT_FIELD_STEP[actionState.field];
      if (fallback !== undefined) goTo(fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to each new action result only
  }, [actionState]);

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      {/* Hidden fields for IDs and controlled state */}
      <input type="hidden" name="camporee_id" value={String(camporeeId)} />
      <input type="hidden" name="is_union" value={String(isUnionCamporee)} />
      {isEdit && event && (
        <input type="hidden" name="id" value={String(event.camporee_event_id)} />
      )}
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
      <input
        type="hidden"
        name="schedule_blocks"
        value={JSON.stringify(scheduleBlocks)}
      />
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
      <input
        type="hidden"
        name="sections"
        value={JSON.stringify(Array.from(selectedSections))}
      />

      <FormModalSteps steps={steps} current={step} />
      <FormModalBody stepKey={step} direction={direction} className="space-y-5">
        {/* Error banner */}
        {actionState.error && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {actionState.error}
          </div>
        )}

        {stepIncomplete && (
          <p role="alert" className="text-sm text-destructive">
            {t("stepIncomplete")}
          </p>
        )}

        {/* Steps stay mounted (hidden) so the server action receives every field. */}

        {/* ══ Step 1: Identidad + secciones ══ */}
        <div ref={stepRef(0)} hidden={step !== 0} className="space-y-5">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            {/* Title */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                required
                maxLength={150}
                defaultValue={event?.title ?? ""}
                placeholder="Ej. Competencia de nudos"
              />
            </div>

            {/* Description */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">
                Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={event?.description ?? ""}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>

            {/* Category — button grid */}
            <div className="space-y-2 sm:col-span-2">
              <Label>
                Categoría <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_CATEGORIES.map((c) => {
                  const active = c.id === category;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id as CamporeeEventDisplayCategory)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] border transition-colors",
                        active
                          ? cn("font-semibold", c.tint, c.border)
                          : "border-border/60 text-foreground hover:bg-muted",
                      )}
                    >
                      <span className={cn("size-2 rounded-full", c.dot)} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {eventTypes.length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Tipo de evento</Label>
                <Select value={selectedEventTypeId} onValueChange={handleEventTypeChange}>
                  <SelectTrigger id="event_type_id" className="w-full">
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.event_type_id} value={String(type.event_type_id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  El tipo clasifica la agenda; los puntos oficiales dependen de rúbricas activas.
                </p>
              </div>
            )}
          </div>

          {/* Secciones participantes — before Horario: filters its club list */}
          {enabledSections.length > 0 && (
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-medium">Secciones participantes</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Deja vacío para que aplique a todas las secciones del camporee.
                  Define qué clubes/secciones aparecen en Horario.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {enabledSections.map((s) => {
                  const active = selectedSections.has(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSection(s)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.98]",
                        active
                          ? cn("font-semibold", SECTION_TINT[s])
                          : "border-border/60 text-foreground hover:bg-muted",
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
                      {SECTION_LABELS[s]}
                      {active && <Check className="size-3.5 shrink-0" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ══ Step 2: Horario (multi-slot via schedule_blocks) + Sede ══ */}
        <div ref={stepRef(1)} hidden={step !== 1} className="space-y-6">
          <ScheduleBlocksEditor
            value={scheduleBlocks}
            onChange={handleScheduleBlocksChange}
            days={days}
            venues={venues}
            camporeeClubs={camporeeClubs}
            allowedSectionKinds={
              selectedSections.size > 0
                ? Array.from(selectedSections)
                : enabledSections
            }
            timeError={timeError}
          />

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Sede</h3>

            <div className="max-w-md space-y-2">
              {venues.length === 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    No hay sedes configuradas para este camporee.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => setVenueDialogOpen(true)}
                  >
                    + Crear primera sede
                  </Button>
                </div>
              ) : (
                <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sin sede asignada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_VENUE_VALUE}>Sin sede</SelectItem>
                    {venues.map((v) => (
                      <SelectItem key={v.camporee_venue_id} value={String(v.camporee_venue_id)}>
                        {v.name}
                        {v.capacity != null && (
                          <span className="text-muted-foreground ml-1.5 text-[11px]">
                            (cap. {v.capacity})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                    <SelectItem value={CREATE_VENUE_VALUE}>
                      <span className="text-primary font-medium">+ Crear nueva sede</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Trigger inline dialog when "Crear nueva sede" is picked */}
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
                  Abrir formulario de sede
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
          </section>
        </div>

        {/* ══ Step 3: Responsable + especialidades de preparación ══ */}
        <div ref={stepRef(2)} hidden={step !== 2} className="space-y-6">
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Responsable</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Nombre visible en la agenda. No alcanza para publicar: eso pide un
                responsable del roster de personal del camporee.
              </p>
            </div>

            {/* Leader mode toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLeaderMode("user")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition-colors",
                  leaderMode === "user"
                    ? "font-semibold bg-primary/10 text-primary border-primary"
                    : "border-border/60 text-foreground hover:bg-muted",
                )}
              >
                <UserRound className="size-3.5" />
                Usuario del sistema
              </button>
              <button
                type="button"
                onClick={() => setLeaderMode("external")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition-colors",
                  leaderMode === "external"
                    ? "font-semibold bg-primary/10 text-primary border-primary"
                    : "border-border/60 text-foreground hover:bg-muted",
                )}
              >
                Líder externo
              </button>
            </div>

            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              {leaderMode === "user" ? (
                <div className="space-y-2">
                  <Label>Usuario responsable</Label>
                  <Select value={leaderUserId} onValueChange={setLeaderUserId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_LEADER_VALUE}>Sin responsable</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                          {u.email && (
                            <span className="text-muted-foreground ml-1.5 text-[11px]">
                              {u.email}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="leader_name_override">Nombre del líder externo</Label>
                  <Input
                    id="leader_name_override"
                    name="leader_name_override"
                    maxLength={100}
                    defaultValue={event?.leader_name_override ?? ""}
                    placeholder="Ej. Dr. Roberto Gimenez"
                  />
                </div>
              )}

              {/* Leader role (always shown) */}
              <div className="space-y-2">
                <Label htmlFor="leader_role">
                  Rol / cargo <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="leader_role"
                  name="leader_role"
                  maxLength={100}
                  defaultValue={event?.leader_role ?? ""}
                  placeholder="Ej. Director de Juegos"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-medium">Especialidades de preparación</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Relaciona especialidades del catálogo para que los participantes
                consulten el material PDF antes del evento.
              </p>
            </div>
            <EventHonorsPicker value={selectedHonors} onChange={setSelectedHonors} />
          </section>
        </div>

        {/* ══ Step 4: Puntos + rúbricas + estado ══ */}
        <div ref={stepRef(3)} hidden={step !== 3} className="space-y-6">
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Puntos</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Máximo del evento, piso mínimo si hay penalizaciones, y reglas de
                descuento.
              </p>
            </div>

            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="max_points">
                  Puntos máximos <span className="text-destructive">*</span>
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
                  Puntos mínimos
                  {!penaltiesEnabled && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      (solo con penalización)
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
                    const next = Math.min(Number(raw), maxPoints);
                    setMinPoints(next);
                  }}
                  onBlur={() => {
                    setMinPointsDraft(String(minPoints));
                  }}
                  placeholder="0"
                />
                {penaltiesEnabled && (
                  <p className="text-xs text-muted-foreground">
                    Piso al aplicar penalizaciones: el puntaje no baja de este
                    valor (0 permitido; debe ser ≤ máximos).
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="penalties_enabled" className="text-sm font-medium">
                  Aplica penalización
                </Label>
                <p className="text-xs text-muted-foreground">
                  Activa descuentos y permite definir puntos mínimos.
                </p>
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
                <Label>Penalizaciones</Label>
                <PenaltiesEditor value={penalties} onChange={setPenalties} />
              </div>
            )}

            {!penaltiesEnabled && (
              <>
                <input type="hidden" name="min_points" value="0" />
                <input type="hidden" name="penalties" value="[]" />
              </>
            )}
          </section>

          <RubricsEditor
            enabled={scoringEnabled}
            onEnabledChange={setScoringEnabled}
            value={rubrics}
            onChange={setRubrics}
            maxPoints={maxPoints}
          />

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Estado</h3>

            {isEdit ? (
              <div className="space-y-2 max-w-xs">
                <Label>Estado del evento</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as CamporeeEventStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Publicar exige un responsable activo del roster de personal.
                  El líder de esta ficha no cubre ese requisito.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                El evento se crea como Programado. Las especialidades de
                preparación se guardan igual. Publicar viene después, con un
                responsable del roster de personal.
              </p>
            )}
          </section>
        </div>
      </FormModalBody>

      <FormModalFooter step={step} total={steps.length}>
        {step === 0 ? (
          <Button type="button" variant="outline" onClick={modal.close}>
            Cancelar
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => goTo(step - 1)}>
            {tModal("back")}
          </Button>
        )}
        {step < lastStep ? (
          <Button type="button" onClick={goNext}>
            {tModal("continue")}
          </Button>
        ) : (
          <SubmitButton label={isEdit ? "Guardar cambios" : "Crear evento"} />
        )}
      </FormModalFooter>
    </form>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deriveDays(
  startDateStr: string,
  endDateStr: string,
): { number: number; label: string }[] {
  const days = deriveDaysFromRange(startDateStr, endDateStr);
  if (days.length === 0) return fallbackDays();
  return days.map((day) => ({
    number: day.numero,
    label: `Día ${day.numero} · ${day.fechaFmt}`,
  }));
}

function fallbackDays(): { number: number; label: string }[] {
  return Array.from({ length: 5 }, (_, i) => ({
    number: i + 1,
    label: `Día ${i + 1}`,
  }));
}
