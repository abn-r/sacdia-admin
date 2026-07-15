"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CamporeeEventScheduleBlock,
  CamporeeEventScheduleBlockAssignment,
} from "@/lib/api/camporee-events";
import type { CamporeeClub } from "@/lib/api/camporees";
import type { CamporeeVenue } from "@/lib/api/camporee-venues";

const NO_VENUE_VALUE = "__none__";

type DayOption = { number: number; label: string };

export function ScheduleBlocksEditor({
  value,
  onChange,
  days,
  venues,
  camporeeClubs,
}: {
  value: CamporeeEventScheduleBlock[];
  onChange: (next: CamporeeEventScheduleBlock[]) => void;
  days: DayOption[];
  venues: CamporeeVenue[];
  camporeeClubs: CamporeeClub[];
}) {
  function updateBlock(index: number, patch: Partial<CamporeeEventScheduleBlock>) {
    onChange(value.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  }

  function removeBlock(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addBlock() {
    onChange([
      ...value,
      {
        title: "",
        day_number: days[0]?.number ?? 1,
        starts_at: null,
        ends_at: null,
        venue_id: null,
        display_order: value.length,
        assignments: [],
      },
    ]);
  }

  function toggleAssignment(blockIndex: number, club: CamporeeClub, checked: boolean) {
    const block = value[blockIndex];
    const current = block.assignments ?? [];
    const nextAssignments: CamporeeEventScheduleBlockAssignment[] = checked
      ? [
          ...current,
          {
            camporee_club_id: club.camporee_club_id,
            club_section_id: club.club_section_id,
          },
        ]
      : current.filter((item) => item.club_section_id !== club.club_section_id);
    updateBlock(blockIndex, { assignments: nextAssignments });
  }

  return (
    <section className="space-y-6 rounded-xl border p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Bloques de agenda</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Opcional. Usalo cuando un mismo evento se realiza en varios horarios o por grupos de clubes.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addBlock}>
          <Plus className="size-4" />
          Agregar bloque
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Sin bloques. El evento aplicará como una sola actividad general.
        </p>
      ) : (
        <div className="space-y-4">
          {value.map((block, index) => {
            const selectedSections = new Set(
              (block.assignments ?? []).map((item) => item.club_section_id),
            );
            return (
              <div key={index} className="space-y-4 rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Bloque {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBlock(index)}
                    aria-label="Eliminar bloque"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Título del bloque</Label>
                    <Input
                      value={block.title ?? ""}
                      placeholder="Ej. Primer grupo"
                      onChange={(event) => updateBlock(index, { title: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Día</Label>
                    <Select
                      value={String(block.day_number)}
                      onValueChange={(day) => updateBlock(index, { day_number: Number(day) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {days.map((day) => (
                          <SelectItem key={day.number} value={String(day.number)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Inicio</Label>
                    <Input
                      type="time"
                      value={block.starts_at ?? ""}
                      onChange={(event) => updateBlock(index, { starts_at: event.target.value || null })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fin</Label>
                    <Input
                      type="time"
                      value={block.ends_at ?? ""}
                      onChange={(event) => updateBlock(index, { ends_at: event.target.value || null })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sede</Label>
                    <Select
                      value={block.venue_id ? String(block.venue_id) : NO_VENUE_VALUE}
                      onValueChange={(venueId) =>
                        updateBlock(index, {
                          venue_id: venueId === NO_VENUE_VALUE ? null : Number(venueId),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin sede" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_VENUE_VALUE}>Sin sede</SelectItem>
                        {venues.map((venue) => (
                          <SelectItem key={venue.camporee_venue_id} value={String(venue.camporee_venue_id)}>
                            {venue.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cupo</Label>
                    <Input
                      type="number"
                      min={0}
                      value={block.capacity ?? ""}
                      onChange={(event) =>
                        updateBlock(index, {
                          capacity: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    rows={2}
                    value={block.notes ?? ""}
                    onChange={(event) => updateBlock(index, { notes: event.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Clubes/secciones asignadas</Label>
                  {camporeeClubs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aún no hay clubes inscritos. Podés crear el bloque y asignarlos después.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {camporeeClubs.map((club) => (
                        <label
                          key={`${club.camporee_club_id}-${club.club_section_id}`}
                          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <Checkbox
                            checked={selectedSections.has(club.club_section_id)}
                            onCheckedChange={(checked) =>
                              toggleAssignment(index, club, checked === true)
                            }
                          />
                          <span>
                            {club.club_name ?? "Club"}
                            {club.section_name ? ` · ${club.section_name}` : ""}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Si no seleccionás clubes, el bloque queda como general para todos.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
