"use client";

import { usePanelPath } from "@/lib/v2/panel-path-context";

/**
 * EventFormPage — shared client component for create/edit camporee event instances.
 *
 * DS rule §6.1.1: >4 fields + relations (venue, leader) → dedicated page form.
 *
 * PR6a: core fields — title, description, day_number, starts_at, ends_at,
 *       display_category (button grid), status (Select).
 * PR6b: venue Select + VenueCreateDialog inline.
 * PR6c: leader picker (user FK or external override) + sections multi-toggle.
 *       Additional numeric fields: capacity, registered_count, max_points.
 */

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
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
import { cn } from "@/lib/utils";
import {
  EVENT_CATEGORIES,
} from "@/lib/camporee-timeline/event-categories";
import {
  VenueCreateDialog,
} from "@/components/camporee-events/venue-create-dialog";
import { RubricsEditor } from "@/components/camporee-events/rubrics-editor";
import { ScheduleBlocksEditor } from "@/components/camporee-events/schedule-blocks-editor";
import {
  EventStaffAssignmentsEditor,
  normalizeEventStaffAssignments,
  type EditableEventStaffAssignment,
} from "@/components/camporee-events/event-staff-assignments-editor";
import type {
  CamporeeEventStatus,
  CamporeeEventDisplayCategory,
  CamporeeEventSection,
  CamporeeEventScheduleBlock,
  CamporeeEventType,
  BackendCamporeeEvent,
} from "@/lib/api/camporee-events";
import type {
  CamporeeEventRubric,
  CamporeeTemplateRubricInput,
} from "@/lib/api/camporee-scoring";
import type { CamporeeVenue } from "@/lib/api/camporee-venues";
import type { Camporee, CamporeeClub } from "@/lib/api/camporees";
import type { CamporeeStaffMember } from "@/lib/api/camporee-staff";
import type { CamporeeEventActionState } from "@/lib/camporee-events/actions";

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
  staffRoster?: CamporeeStaffMember[];
  scoringSetupEnabled?: boolean;
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
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      {label}
    </Button>
  );
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
  staffRoster = [],
  scoringSetupEnabled = true,
  isUnionCamporee = false,
  event,
  rubrics: initialRubrics = [],
  action,
}: EventFormPageProps) {
  const t = useTranslations("camporees.eventInstanceForm");
  const { toPanelPath } = usePanelPath();
  const isEdit = mode === "edit";
  const backHref = toPanelPath(
    isUnionCamporee
      ? `/dashboard/camporees/union/${camporeeId}?tab=events`
      : `/dashboard/camporees/${camporeeId}?tab=events`,
  );

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
  const [scheduleBlocks, setScheduleBlocks] = useState<CamporeeEventScheduleBlock[]>(
    (event?.schedule_blocks ?? []).map((block, index) => ({
      title: block.title ?? "",
      description: block.description ?? null,
      day_number: block.day_number ?? event?.day_number ?? 1,
      starts_at: block.starts_at ?? null,
      ends_at: block.ends_at ?? null,
      venue_id: block.venue_id ?? null,
      display_order: block.display_order ?? index,
      capacity: block.capacity ?? null,
      notes: block.notes ?? null,
      assignments: block.assignments ?? [],
    })),
  );
  const [staffAssignments, setStaffAssignments] = useState<EditableEventStaffAssignment[]>(
    normalizeEventStaffAssignments(event?.staff_assignments),
  );

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

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <PageHeader
        title={isEdit ? t("titleEdit") : t("titleCreate")}
        description={isEdit ? t("descriptionEdit") : t("descriptionCreate")}
        breadcrumbs={[{ label: t("backToEvents"), href: backHref }]}
      />

      {/* ── Form ── */}
      <form action={formAction} className="space-y-8">
        {/* Hidden fields for IDs and controlled state */}
        <input type="hidden" name="camporee_id" value={String(camporeeId)} />
        <input type="hidden" name="is_union" value={String(isUnionCamporee)} />
        {isEdit && event && (
          <input type="hidden" name="id" value={String(event.camporee_event_id)} />
        )}
        <input type="hidden" name="display_category" value={category} />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="day_number" value={String(dayNumber)} />
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

        {/* Error banner */}
        {actionState.error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionState.error}
          </div>
        )}

        {/* ══ Section 1: Identidad ══ */}
        <section className="space-y-6 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight">Identidad del evento</h2>

          {/* Title */}
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
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
            <div className="space-y-2">
              <Label>Tipo de evento</Label>
              <Select value={selectedEventTypeId} onValueChange={handleEventTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná el tipo" />
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
        </section>

        {/* ══ Section 2: Horario ══ */}
        <section className="space-y-6 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight">Horario</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Day number */}
            <div className="space-y-2">
              <Label>
                Día <span className="text-destructive">*</span>
              </Label>
              <Select
                value={String(dayNumber)}
                onValueChange={(v) => setDayNumber(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná el día" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d.number} value={String(d.number)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Starts at */}
            <div className="space-y-2">
              <Label htmlFor="starts_at">Inicio</Label>
              <Input
                id="starts_at"
                name="starts_at"
                type="time"
                value={startsAt}
                onChange={(e) => {
                  setStartsAt(e.target.value);
                  validateTimes(e.target.value, endsAt);
                }}
                placeholder="HH:MM"
              />
            </div>

            {/* Ends at */}
            <div className="space-y-2">
              <Label htmlFor="ends_at">Fin</Label>
              <Input
                id="ends_at"
                name="ends_at"
                type="time"
                value={endsAt}
                onChange={(e) => {
                  setEndsAt(e.target.value);
                  validateTimes(startsAt, e.target.value);
                }}
                placeholder="HH:MM"
              />
            </div>
          </div>

          {timeError && (
            <p className="text-sm text-destructive">{timeError}</p>
          )}
        </section>

        {/* ══ Section 3: Sede ══ (PR6b) */}
        <section className="space-y-6 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight">Sede</h2>

          <div className="space-y-2">
            <Label>Sede del evento</Label>
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
                <SelectTrigger>
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

        {/* ══ Section 4: Responsable ══ (PR6c) */}
        <section className="space-y-6 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight">Responsable</h2>

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

          {leaderMode === "user" ? (
            <div className="space-y-2">
              <Label>Usuario responsable</Label>
              <Select value={leaderUserId} onValueChange={setLeaderUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un usuario" />
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
            <div className="space-y-4">
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
        </section>

        {/* ══ Section 5: Secciones ══ (PR6c) */}
        {enabledSections.length > 0 && (
          <section className="space-y-6 rounded-xl border p-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Secciones participantes</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Dejá vacío para que aplique a todas las secciones del camporee.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {enabledSections.map((s) => {
                const active = selectedSections.has(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSection(s)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition-colors",
                      active
                        ? cn("font-semibold", SECTION_TINT[s])
                        : "border-border/60 text-foreground hover:bg-muted",
                    )}
                  >
                    {SECTION_LABELS[s]}
                    {active && <Check className="size-3" />}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <EventStaffAssignmentsEditor
          staff={staffRoster}
          value={staffAssignments}
          onChange={setStaffAssignments}
          publishRequested={status === "publicado"}
        />

        {/* ══ Section 6: Capacidad y puntos ══ (PR6c) */}
        <section className="space-y-6 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight">Capacidad y puntos</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">
                Cupo máximo <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min={0}
                defaultValue={event?.capacity ?? ""}
                placeholder={t("capacityPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registered_count">Inscritos actuales</Label>
              <Input
                id="registered_count"
                name="registered_count"
                type="number"
                min={0}
                defaultValue={event?.registered_count ?? 0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_points">
                Puntos en juego <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="max_points"
                name="max_points"
                type="number"
                min={0}
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
        </section>

        {!scoringSetupEnabled && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            Primero cerrá/cierra la inscripción de clubes para congelar las secciones participantes.
          </div>
        )}

        <RubricsEditor
          enabled={scoringEnabled}
          onEnabledChange={setScoringEnabled}
          value={rubrics}
          onChange={setRubrics}
          maxPoints={maxPoints}
          disabled={!scoringSetupEnabled}
        />

        <ScheduleBlocksEditor
          value={scheduleBlocks}
          onChange={setScheduleBlocks}
          days={days}
          venues={venues}
          camporeeClubs={camporeeClubs}
        />

        {/* ══ Section 7: Estado ══ */}
        <section className="space-y-6 rounded-xl border p-6">
          <h2 className="text-base font-semibold tracking-tight">Estado</h2>

          <div className="space-y-2 max-w-xs">
            <Label>Estado del evento</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CamporeeEventStatus)}>
              <SelectTrigger>
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
          </div>
        </section>

        {/* ── Footer actions ── */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" asChild>
            <Link href={backHref} prefetch={false}>
              <ArrowLeft className="size-4" />
              Cancelar
            </Link>
          </Button>

          <SubmitButton label={isEdit ? "Guardar cambios" : "Crear evento"} />
        </div>
      </form>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deriveDays(
  startDateStr: string,
  endDateStr: string,
): { number: number; label: string }[] {
  try {
    // Parse as UTC to avoid timezone drift
    const start = new Date(startDateStr + "T00:00:00Z");
    const end = new Date(endDateStr + "T00:00:00Z");
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return fallbackDays();
    const days: { number: number; label: string }[] = [];
    let n = 1;
    for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1), n++) {
      const day = d.getUTCDate();
      const month = d.toLocaleString("es-MX", { month: "short", timeZone: "UTC" });
      days.push({ number: n, label: `Día ${n} · ${day} ${month}` });
    }
    return days.length > 0 ? days : fallbackDays();
  } catch {
    return fallbackDays();
  }
}

function fallbackDays(): { number: number; label: string }[] {
  return Array.from({ length: 5 }, (_, i) => ({
    number: i + 1,
    label: `Día ${i + 1}`,
  }));
}
