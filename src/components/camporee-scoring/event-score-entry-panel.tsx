"use client";

import { useMemo, useState, useActionState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  submitCamporeeEventScoreAction,
  type CamporeeScoringActionState,
} from "@/lib/camporee-scoring/actions";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type {
  CamporeeEventRubric,
  CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";

export interface EventScoreEntryPanelProps {
  camporeeId: number;
  isUnionCamporee?: boolean;
  events: BackendCamporeeEvent[];
  rubricsByEvent: Record<number, CamporeeEventRubric[]>;
  targetsByEvent: Record<number, CamporeeScoringTarget[]>;
  canEdit?: boolean;
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPoints(value: number) {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function calculateAwardedTotal(values: Record<number, number>) {
  return Object.values(values).reduce((total, value) => total + Number(value || 0), 0);
}

export function EventScoreEntryPanel({
  camporeeId,
  isUnionCamporee = false,
  events,
  rubricsByEvent,
  targetsByEvent,
  canEdit = false,
}: EventScoreEntryPanelProps) {
  const scoringEvents = useMemo(
    () => events.filter((event) => event.scoring_enabled),
    [events],
  );
  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    scoringEvents[0]?.camporee_event_id ?? null,
  );
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

  const selectedEvent = scoringEvents.find(
    (event) => event.camporee_event_id === selectedEventId,
  );
  const rubrics = selectedEventId ? rubricsByEvent[selectedEventId] ?? [] : [];
  const targets = selectedEventId ? targetsByEvent[selectedEventId] ?? [] : [];
  const totalAwarded = calculateAwardedTotal(awardedPoints);
  const totalMax = rubrics.reduce((total, rubric) => total + Number(rubric.max_points || 0), 0);
  const scoreItems = rubrics.map((rubric) => ({
    camporee_event_rubric_id: rubric.camporee_event_rubric_id,
    awarded_points: awardedPoints[rubric.camporee_event_rubric_id] ?? 0,
  }));

  function handleEventChange(eventId: number) {
    const nextTargets = targetsByEvent[eventId] ?? [];
    setSelectedEventId(eventId);
    setSelectedSectionId(nextTargets[0]?.club_section_id ?? null);
    setAwardedPoints({});
  }

  function updateAwardedPoints(rubricId: number, value: string) {
    setAwardedPoints((current) => ({
      ...current,
      [rubricId]: toNumber(value),
    }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="size-4" />
          Captura manual de puntajes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scoringEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay eventos puntuables con rúbricas habilitadas.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="score-entry-event">Evento puntuable</Label>
              <select
                id="score-entry-event"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedEventId ?? ""}
                onChange={(event) => handleEventChange(Number(event.target.value))}
              >
                {scoringEvents.map((event) => (
                  <option key={event.camporee_event_id} value={event.camporee_event_id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <div className="font-medium">{selectedEvent?.title ?? "Evento"}</div>
              <div className="mt-1 text-muted-foreground">
                {rubrics.length} criterios · {targets.length} secciones inscritas
              </div>
            </div>
          </div>
        )}

        {selectedEventId && rubrics.length === 0 && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Este evento está marcado como puntuable, pero no tiene rúbricas activas.
          </p>
        )}

        {selectedEventId && targets.length === 0 && (
          <p className="rounded-lg border p-3 text-sm text-muted-foreground">
            No hay secciones inscritas disponibles para puntuar este evento.
          </p>
        )}

        {canEdit && selectedEventId && rubrics.length > 0 && (
          <form action={formAction} className="space-y-4 rounded-lg border p-4">
            <input type="hidden" name="camporee_id" value={camporeeId} />
            <input type="hidden" name="is_union" value={isUnionCamporee ? "true" : "false"} />
            <input type="hidden" name="event_id" value={selectedEventId} />
            <input type="hidden" name="club_section_id" value={selectedSectionId ?? ""} />
            <input type="hidden" name="source" value="manual_lf" />
            <input type="hidden" name="items" value={JSON.stringify(scoreItems)} />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="score-entry-section">Sección</Label>
                <select
                  id="score-entry-section"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={selectedSectionId ?? ""}
                  onChange={(event) => setSelectedSectionId(Number(event.target.value) || null)}
                >
                  <option value="">Seleccionar</option>
                  {targets.map((target) => (
                    <option key={target.club_section_id} value={target.club_section_id}>
                      {target.club_name ?? "Club"} ·{" "}
                      {target.section_name ?? `Sección ${target.club_section_id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                role="status"
              >
                Total calculado: {formatPoints(totalAwarded)} / {formatPoints(totalMax)} puntos
              </div>
            </div>

            <div className="space-y-3">
              {rubrics.map((rubric) => (
                <div
                  key={rubric.camporee_event_rubric_id}
                  className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_9rem]"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{rubric.title}</div>
                    {rubric.description && (
                      <p className="text-sm text-muted-foreground">{rubric.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Máximo: {formatPoints(rubric.max_points)} puntos
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`score-rubric-${rubric.camporee_event_rubric_id}`}>
                      Puntos otorgados · {rubric.title}
                    </Label>
                    <Input
                      id={`score-rubric-${rubric.camporee_event_rubric_id}`}
                      aria-label={`Puntos otorgados ${rubric.title}`}
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
              <Label htmlFor="score-entry-notes">Notas</Label>
              <Textarea
                id="score-entry-notes"
                name="notes"
                rows={2}
                placeholder="Observaciones opcionales"
              />
            </div>

            <Button type="submit" disabled={!selectedSectionId || targets.length === 0}>
              Guardar puntaje oficial
            </Button>

            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            {state.success && <p className="text-sm text-emerald-700">{state.success}</p>}
          </form>
        )}

        {!canEdit && selectedEventId && rubrics.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Necesitás permisos de gestión de eventos para registrar puntajes manuales.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
