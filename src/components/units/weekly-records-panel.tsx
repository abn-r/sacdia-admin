"use client";

import { useState, useCallback } from "react";
import { Plus, CalendarDays, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  listWeeklyRecords,
  createWeeklyRecord,
  updateWeeklyRecord,
  getUnitUserDisplayName,
} from "@/lib/api/units";
import type { WeeklyRecord, UnitMember } from "@/lib/api/units";

// ─── Add Record Dialog ────────────────────────────────────────────────────────

interface AddRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  unitId: number;
  members: UnitMember[];
  onSuccess: () => void;
}

function AddRecordDialog({
  open,
  onOpenChange,
  clubId,
  unitId,
  members,
  onSuccess,
}: AddRecordDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState({
    user_id: "",
    week: 1,
    attendance: 0,
    punctuality: 0,
    points: 0,
  });

  function handleClose(val: boolean) {
    if (!val) {
      setValues({ user_id: "", week: 1, attendance: 0, punctuality: 0, points: 0 });
    }
    onOpenChange(val);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.user_id) {
      toast.error("Selecciona un miembro");
      return;
    }
    setIsSubmitting(true);
    try {
      await createWeeklyRecord(clubId, unitId, {
        user_id: values.user_id,
        week: values.week,
        attendance: values.attendance,
        punctuality: values.punctuality,
        points: values.points,
      });
      toast.success("Registro semanal creado");
      onSuccess();
      handleClose(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo crear el registro";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo registro semanal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member */}
          <div className="space-y-1.5">
            <Label htmlFor="record_user">
              Miembro <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              value={values.user_id}
              onValueChange={(val) => setValues((v) => ({ ...v, user_id: val }))}
            >
              <SelectTrigger id="record_user" className="w-full">
                <SelectValue placeholder="Seleccionar miembro" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.unit_member_id} value={m.user_id}>
                    {getUnitUserDisplayName(m.users)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Week */}
          <div className="space-y-1.5">
            <Label htmlFor="record_week">
              Semana <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="record_week"
              type="number"
              min={1}
              max={52}
              value={values.week}
              onChange={(e) =>
                setValues((v) => ({ ...v, week: Number(e.target.value) }))
              }
            />
          </div>

          {/* Points grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="record_attendance">Asistencia</Label>
              <Input
                id="record_attendance"
                type="number"
                min={0}
                value={values.attendance}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    attendance: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="record_punctuality">Puntualidad</Label>
              <Input
                id="record_punctuality"
                type="number"
                min={0}
                value={values.punctuality}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    punctuality: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="record_points">Total</Label>
              <Input
                id="record_points"
                type="number"
                min={0}
                value={values.points}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    points: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar registro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inline edit cell ─────────────────────────────────────────────────────────

interface EditableCellProps {
  value: number;
  onSave: (val: number) => Promise<void>;
}

function EditableCell({ value, onSave }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
    } catch {
      setDraft(value);
      toast.error("No se pudo actualizar el valor");
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <Input
        type="number"
        min={0}
        className="h-7 w-20 px-2 text-xs tabular-nums"
        value={draft}
        autoFocus
        onChange={(e) => setDraft(Number(e.target.value))}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleBlur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        disabled={saving}
      />
    );
  }

  return (
    <button
      type="button"
      className="cursor-pointer rounded px-1 tabular-nums hover:bg-muted/50"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="Clic para editar"
    >
      {saving ? <Loader2 className="inline size-3 animate-spin" /> : value}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface WeeklyRecordsPanelProps {
  clubId: number;
  unitId: number;
  members: UnitMember[];
}

export function WeeklyRecordsPanel({
  clubId,
  unitId,
  members,
}: WeeklyRecordsPanelProps) {
  const [records, setRecords] = useState<WeeklyRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listWeeklyRecords(clubId, unitId);
      setRecords(data);
      setLoaded(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudieron cargar los registros";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [clubId, unitId]);

  // Lazy load on first render of this panel
  if (!loaded && !loading) {
    loadRecords();
  }

  async function handleUpdate(
    recordId: number,
    field: "attendance" | "punctuality" | "points",
    value: number,
  ) {
    await updateWeeklyRecord(clubId, unitId, recordId, { [field]: value });
    setRecords((prev) =>
      prev
        ? prev.map((r) =>
            r.record_id === recordId ? { ...r, [field]: value } : r,
          )
        : prev,
    );
  }

  const activeMembers = members.filter((m) => m.active);

  if (loading && !loaded) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        <span className="text-sm">Cargando registros...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Registros de asistencia y puntaje semanal. Haz clic en un valor para editarlo.
        </p>
        {activeMembers.length > 0 && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            Nuevo registro
          </Button>
        )}
      </div>

      {records === null || records.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin registros semanales"
          description={
            activeMembers.length === 0
              ? "Agrega miembros a la unidad primero para poder registrar asistencia."
              : "No hay registros de asistencia aun. Crea el primero."
          }
        >
          {activeMembers.length > 0 && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 size-3.5" />
              Nuevo registro
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Miembro
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Semana
                </TableHead>
                <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Asistencia
                </TableHead>
                <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Puntualidad
                </TableHead>
                <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.record_id} className="hover:bg-muted/30">
                  <TableCell className="px-3 py-2.5 align-middle text-sm font-medium">
                    {getUnitUserDisplayName(record.users)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <Badge variant="outline" className="tabular-nums">
                      Sem. {record.week}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right align-middle text-sm">
                    <EditableCell
                      value={record.attendance}
                      onSave={(val) =>
                        handleUpdate(record.record_id, "attendance", val)
                      }
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right align-middle text-sm">
                    <EditableCell
                      value={record.punctuality}
                      onSave={(val) =>
                        handleUpdate(record.record_id, "punctuality", val)
                      }
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right align-middle">
                    <EditableCell
                      value={record.points}
                      onSave={(val) =>
                        handleUpdate(record.record_id, "points", val)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddRecordDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        clubId={clubId}
        unitId={unitId}
        members={activeMembers}
        onSuccess={loadRecords}
      />
    </div>
  );
}
