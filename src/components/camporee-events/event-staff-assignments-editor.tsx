"use client";

import { Plus, Trash2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CamporeeEventStaffAssignment,
  CamporeeEventStaffAssignmentRole,
  ReplaceCamporeeEventStaffAssignmentsPayload,
} from "@/lib/api/camporee-events";
import type { CamporeeStaffMember } from "@/lib/api/camporee-staff";

export type EditableEventStaffAssignment =
  ReplaceCamporeeEventStaffAssignmentsPayload["assignments"][number];

interface EventStaffAssignmentsEditorProps {
  staff: CamporeeStaffMember[];
  value: EditableEventStaffAssignment[];
  onChange: (value: EditableEventStaffAssignment[]) => void;
  fieldName?: string;
  publishRequested?: boolean;
}

const STAFF_ROLES: Array<{ value: CamporeeEventStaffAssignmentRole; label: string }> = [
  { value: "responsible", label: "Responsable" },
  { value: "assistant", label: "Ayudante" },
  { value: "evaluator", label: "Evaluador" },
  { value: "support", label: "Apoyo" },
];

const CATEGORY_LABELS: Record<string, string> = {
  judge: "Juez",
  administrative: "Administrativo",
  kitchen: "Cocina",
  support: "Apoyo",
  spiritual: "Espiritual",
  leadership: "Liderazgo",
  other: "Otro",
};

function getStaffName(member: CamporeeStaffMember | CamporeeEventStaffAssignment["staff_member"]) {
  const user = member?.user;
  if (!user) return "Personal sin usuario";
  return (
    user.full_name ||
    [user.name, user.paternal_last_name, user.maternal_last_name]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ") ||
    "Personal sin nombre"
  );
}

export function normalizeEventStaffAssignments(
  assignments: CamporeeEventStaffAssignment[] | undefined,
): EditableEventStaffAssignment[] {
  return (assignments ?? [])
    .filter((assignment) => assignment.active !== false)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((assignment, index) => ({
      camporee_staff_member_id: assignment.camporee_staff_member_id,
      assignment_role: assignment.assignment_role,
      title_override: assignment.title_override ?? null,
      notes: assignment.notes ?? null,
      display_order: assignment.display_order ?? index,
    }));
}

export function hasResponsibleAssignment(assignments: EditableEventStaffAssignment[]) {
  return assignments.some(
    (assignment) =>
      assignment.camporee_staff_member_id && assignment.assignment_role === "responsible",
  );
}

export function EventStaffAssignmentsEditor({
  staff,
  value,
  onChange,
  fieldName = "staff_assignments",
  publishRequested = false,
}: EventStaffAssignmentsEditorProps) {
  const responsibleMissing = publishRequested && !hasResponsibleAssignment(value);

  function updateAssignment(index: number, patch: Partial<EditableEventStaffAssignment>) {
    onChange(
      value.map((assignment, currentIndex) =>
        currentIndex === index ? { ...assignment, ...patch } : assignment,
      ),
    );
  }

  function addAssignment() {
    onChange([
      ...value,
      {
        camporee_staff_member_id: "",
        assignment_role: value.some((assignment) => assignment.assignment_role === "responsible")
          ? "assistant"
          : "responsible",
        title_override: null,
        notes: null,
        display_order: value.length,
      },
    ]);
  }

  function removeAssignment(index: number) {
    onChange(
      value
        .filter((_, currentIndex) => currentIndex !== index)
        .map((assignment, display_order) => ({ ...assignment, display_order })),
    );
  }

  return (
    <section className="space-y-6 rounded-xl border p-6">
      <input type="hidden" name={fieldName} value={JSON.stringify(value)} />
      {responsibleMissing && (
        <input
          aria-hidden="true"
          className="sr-only"
          data-testid="staff-responsible-guard"
          onChange={() => undefined}
          required
          tabIndex={-1}
          value=""
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <UsersRound className="size-4" />
            Personal de la actividad
          </h2>
          <p className="text-sm text-muted-foreground">
            Asigná sólo las personas necesarias para esta actividad: responsable,
            ayudantes, evaluadores o apoyo.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addAssignment}>
          <Plus className="size-4" />
          Agregar persona
        </Button>
      </div>

      {staff.length === 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
          Primero cargá el roster en la pestaña Personal para poder asignar personas a actividades.
        </div>
      )}

      {responsibleMissing && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Para publicar el evento necesitás al menos una persona con rol Responsable.
        </div>
      )}

      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Sin personal asignado a esta actividad todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((assignment, index) => (
            <div
              key={`${assignment.camporee_staff_member_id}-${index}`}
              className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1.4fr)_180px_minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <div className="space-y-2">
                <Label>Persona</Label>
                <Select
                  value={assignment.camporee_staff_member_id || undefined}
                  onValueChange={(nextValue) =>
                    updateAssignment(index, { camporee_staff_member_id: nextValue })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar persona" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem
                        key={member.camporee_staff_member_id}
                        value={member.camporee_staff_member_id}
                      >
                        {getStaffName(member)} · {CATEGORY_LABELS[member.category] ?? member.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rol en actividad</Label>
                <Select
                  value={assignment.assignment_role}
                  onValueChange={(nextValue) =>
                    updateAssignment(index, {
                      assignment_role: nextValue as CamporeeEventStaffAssignmentRole,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`staff-title-${index}`}>Etiqueta opcional</Label>
                <Input
                  id={`staff-title-${index}`}
                  value={assignment.title_override ?? ""}
                  onChange={(event) =>
                    updateAssignment(index, { title_override: event.target.value || null })
                  }
                  maxLength={100}
                  placeholder="Ej. Estación 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`staff-notes-${index}`}>Notas</Label>
                <Textarea
                  id={`staff-notes-${index}`}
                  value={assignment.notes ?? ""}
                  onChange={(event) =>
                    updateAssignment(index, { notes: event.target.value || null })
                  }
                  rows={1}
                  placeholder="Opcional"
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="self-end text-destructive hover:text-destructive"
                onClick={() => removeAssignment(index)}
                aria-label={`Eliminar asignación ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
