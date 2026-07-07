"use client";

import { useMemo, useState, useActionState } from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  assignCamporeeEventJudgeAction,
  type CamporeeScoringActionState,
} from "@/lib/camporee-scoring/actions";
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
  clubRegistrationClosed?: boolean;
}

export function EventJudgeAssignmentsPanel({
  camporeeId,
  isUnionCamporee = false,
  events,
  judges,
  assignmentsByEvent,
  targetsByEvent,
  canEdit = false,
  clubRegistrationClosed = true,
}: EventJudgeAssignmentsPanelProps) {
  const scoringEvents = events.filter((event) => event.scoring_enabled);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    scoringEvents[0]?.camporee_event_id ?? events[0]?.camporee_event_id ?? null,
  );
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<CamporeeJudgeRole>("primary");
  const [state, formAction] = useActionState<CamporeeScoringActionState, FormData>(
    assignCamporeeEventJudgeAction,
    {},
  );

  const assignments = selectedEventId ? assignmentsByEvent[selectedEventId] ?? [] : [];
  const targets = selectedEventId ? targetsByEvent[selectedEventId] ?? [] : [];

  const primaryConflict = useMemo(() => {
    if (!selectedSectionId || selectedRole !== "primary") return false;
    return assignments.some(
      (assignment) =>
        assignment.active &&
        assignment.judge_role === "primary" &&
        assignment.club_section_id === selectedSectionId,
    );
  }, [assignments, selectedRole, selectedSectionId]);

  const selectedEvent = events.find((event) => event.camporee_event_id === selectedEventId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="size-4" />
          Asignaciones de jueces por evento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay eventos para asignar jueces.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assignment-event">Evento</Label>
              <select
                id="assignment-event"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedEventId ?? ""}
                onChange={(event) => {
                  setSelectedEventId(Number(event.target.value));
                  setSelectedSectionId(null);
                }}
              >
                {events.map((event) => (
                  <option key={event.camporee_event_id} value={event.camporee_event_id}>
                    {event.title}{event.scoring_enabled ? " · puntuable" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <div className="font-medium">{selectedEvent?.title ?? "Evento"}</div>
              <div className="mt-1 text-muted-foreground">
                {assignments.length} asignaciones activas · {targets.length} secciones inscritas
              </div>
            </div>
          </div>
        )}

        {assignments.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => {
              const judge = judges.find((item) => item.camporee_judge_id === assignment.camporee_judge_id);
              return (
                <div key={assignment.camporee_event_judge_assignment_id} className="rounded-lg border p-3">
                  <div className="font-medium">{judge?.name || assignment.camporee_judge_id}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Sección #{assignment.club_section_id}
                  </div>
                  <Badge className="mt-2" variant={assignment.judge_role === "primary" ? "default" : "secondary"}>
                    {assignment.judge_role === "primary" ? "Principal" : "Ayudante"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {canEdit && selectedEventId && !clubRegistrationClosed && (
          <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
            Primero cerrá/cierra la inscripción de clubes para congelar las secciones participantes.
          </p>
        )}

        {canEdit && selectedEventId && clubRegistrationClosed && (
          <form action={formAction} className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
            <input type="hidden" name="camporee_id" value={camporeeId} />
            <input type="hidden" name="is_union" value={isUnionCamporee ? "true" : "false"} />
            <input type="hidden" name="event_id" value={selectedEventId} />
            <input type="hidden" name="club_section_id" value={selectedSectionId ?? ""} />
            <input type="hidden" name="judge_role" value={selectedRole} />

            <div className="space-y-2">
              <Label htmlFor="assignment-section">Sección</Label>
              <select
                id="assignment-section"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedSectionId ?? ""}
                onChange={(event) => setSelectedSectionId(Number(event.target.value) || null)}
              >
                <option value="">Seleccionar</option>
                {targets.map((target) => (
                  <option key={target.club_section_id} value={target.club_section_id}>
                    {target.club_name ?? "Club"} · {target.section_name ?? `Sección ${target.club_section_id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-judge">Juez</Label>
              <select
                id="assignment-judge"
                name="camporee_judge_id"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Seleccionar</option>
                {judges.map((judge) => (
                  <option key={judge.camporee_judge_id} value={judge.camporee_judge_id}>
                    {judge.name || judge.user_id}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-role">Rol</Label>
              <select
                id="assignment-role"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as CamporeeJudgeRole)}
              >
                <option value="primary">Principal</option>
                <option value="assistant">Ayudante</option>
              </select>
            </div>

            <Button type="submit" className="self-end" disabled={primaryConflict}>
              Asignar juez
            </Button>

            {primaryConflict && (
              <p className="text-sm text-destructive md:col-span-4">
                Esta sección ya tiene juez principal activo para el evento.
              </p>
            )}
            {state.error && <p className="text-sm text-destructive md:col-span-4">{state.error}</p>}
            {state.success && <p className="text-sm text-emerald-700 md:col-span-4">{state.success}</p>}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
