"use client";

import { useMemo, useState } from "react";
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
  CamporeeEventSection,
} from "@/lib/api/camporee-events";
import type { CamporeeClub } from "@/lib/api/camporees";
import type { CamporeeVenue } from "@/lib/api/camporee-venues";
import { filterCamporeeClubsBySectionKinds } from "@/lib/camporees/club-display";

const NO_VENUE_VALUE = "__none__";

type DayOption = { number: number; label: string };

export function ScheduleBlocksEditor({
  value,
  onChange,
  days,
  venues,
  camporeeClubs,
  allowedSectionKinds,
  timeError,
}: {
  value: CamporeeEventScheduleBlock[];
  onChange: (next: CamporeeEventScheduleBlock[]) => void;
  days: DayOption[];
  venues: CamporeeVenue[];
  camporeeClubs: CamporeeClub[];
  /** Section kinds allowed by camporee (+ event). Empty = hide all. */
  allowedSectionKinds: CamporeeEventSection[];
  timeError?: string | null;
}) {
  const [extrasOpen, setExtrasOpen] = useState(() =>
    value.some(
      (block) =>
        Boolean(block.title) ||
        Boolean(block.venue_id) ||
        Boolean(block.notes) ||
        (block.assignments?.length ?? 0) > 0,
    ),
  );

  const assignableClubs = useMemo(
    () => filterCamporeeClubsBySectionKinds(camporeeClubs, allowedSectionKinds),
    [camporeeClubs, allowedSectionKinds],
  );

  function updateBlock(index: number, patch: Partial<CamporeeEventScheduleBlock>) {
    onChange(value.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  }

  function removeBlock(index: number) {
    if (value.length <= 1) return;
    onChange(value.filter((_, i) => i !== index));
  }

  function addBlock() {
    const last = value[value.length - 1];
    onChange([
      ...value,
      {
        title: "",
        day_number: last?.day_number ?? days[0]?.number ?? 1,
        starts_at: last?.starts_at ?? null,
        ends_at: last?.ends_at ?? null,
        venue_id: null,
        display_order: value.length,
        assignments: [],
      },
    ]);
  }

  function toggleAssignment(blockIndex: number, club: CamporeeClub, checked: boolean) {
    const sectionId = club.club_section_id;
    onChange(
      value.map((block, i) => {
        const current = block.assignments ?? [];
        if (i === blockIndex) {
          const nextAssignments: CamporeeEventScheduleBlockAssignment[] = checked
            ? current.some((item) => item.club_section_id === sectionId)
              ? current
              : [
                  ...current,
                  {
                    camporee_club_id: club.camporee_club_id,
                    club_section_id: sectionId,
                  },
                ]
            : current.filter((item) => item.club_section_id !== sectionId);
          return { ...block, assignments: nextAssignments };
        }
        // Exclusive: a section can only belong to one schedule block at a time.
        if (checked) {
          return {
            ...block,
            assignments: current.filter((item) => item.club_section_id !== sectionId),
          };
        }
        return block;
      }),
    );
  }

  /** Map club_section_id → block index where it is currently assigned (if any). */
  const assignmentOwnerBySection = useMemo(() => {
    const owners = new Map<number, number>();
    value.forEach((block, index) => {
      for (const item of block.assignments ?? []) {
        owners.set(item.club_section_id, index);
      }
    });
    return owners;
  }, [value]);

  return (
    <section className="space-y-6 rounded-xl border p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Horario</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Agrega uno o más horarios si el evento se repite en distintos días o franjas.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addBlock}>
          <Plus className="size-4" />
          Agregar horario
        </Button>
      </div>

      <div className="space-y-4">
        {value.map((block, index) => {
          const selectedSections = new Set(
            (block.assignments ?? []).map((item) => item.club_section_id),
          );
          const showAdvanced = extrasOpen || value.length > 1;

          return (
            <div
              key={index}
              className="space-y-4 rounded-lg border bg-muted/20 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  {value.length > 1 ? `Horario ${index + 1}` : "Horario"}
                </p>
                {value.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBlock(index)}
                    aria-label="Eliminar horario"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>
                    Día <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={String(block.day_number)}
                    onValueChange={(day) =>
                      updateBlock(index, { day_number: Number(day) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el día" />
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
                    onChange={(event) =>
                      updateBlock(index, {
                        starts_at: event.target.value || null,
                      })
                    }
                    placeholder="HH:MM"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fin</Label>
                  <Input
                    type="time"
                    value={block.ends_at ?? ""}
                    onChange={(event) =>
                      updateBlock(index, {
                        ends_at: event.target.value || null,
                      })
                    }
                    placeholder="HH:MM"
                  />
                </div>
              </div>

              {showAdvanced && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Título del bloque</Label>
                      <Input
                        value={block.title ?? ""}
                        placeholder="Ej. Primer grupo"
                        onChange={(event) =>
                          updateBlock(index, { title: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sede</Label>
                      <Select
                        value={
                          block.venue_id ? String(block.venue_id) : NO_VENUE_VALUE
                        }
                        onValueChange={(venueId) =>
                          updateBlock(index, {
                            venue_id:
                              venueId === NO_VENUE_VALUE ? null : Number(venueId),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sin sede" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_VENUE_VALUE}>Sin sede</SelectItem>
                          {venues.map((venue) => (
                            <SelectItem
                              key={venue.camporee_venue_id}
                              value={String(venue.camporee_venue_id)}
                            >
                              {venue.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Textarea
                      rows={2}
                      value={block.notes ?? ""}
                      onChange={(event) =>
                        updateBlock(index, { notes: event.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Clubes/secciones asignadas</Label>
                    {assignableClubs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hay secciones inscritas que coincidan con este
                        camporee/evento. Solo se listan clubes ya inscritos y
                        del tipo habilitado (no todo el campo local).
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {assignableClubs.map((club) => {
                          const ownerIndex = assignmentOwnerBySection.get(
                            club.club_section_id,
                          );
                          const ownedElsewhere =
                            ownerIndex != null && ownerIndex !== index;
                          return (
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
                            <span className="min-w-0 flex-1">
                              {club.club_name ??
                                club.section_name ??
                                `Sección #${club.club_section_id}`}
                              {club.club_name && club.section_name
                                ? ` · ${club.section_name}`
                                : ""}
                              {ownedElsewhere && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  (ahora en Horario {ownerIndex + 1})
                                </span>
                              )}
                            </span>
                          </label>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Solo secciones inscritas y habilitadas. Una sección no
                      puede estar en dos horarios: al marcarla aquí se quita del
                      otro. Sin selección, el horario queda general.
                    </p>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {!extrasOpen && value.length === 1 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-0 text-muted-foreground"
          onClick={() => setExtrasOpen(true)}
        >
          Más opciones (sede, grupos, notas)
        </Button>
      )}

      {timeError && <p className="text-sm text-destructive">{timeError}</p>}
    </section>
  );
}
