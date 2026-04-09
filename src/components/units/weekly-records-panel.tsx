"use client";

import { useState, useCallback, useEffect } from "react";
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
import { getLocalFieldScoringCategories } from "@/lib/api/scoring-categories";
import type { WeeklyRecord, UnitMember, ScoreEntry } from "@/lib/api/units";
import type { ScoringCategory } from "@/lib/api/scoring-categories";

// ─── Add Record Dialog ────────────────────────────────────────────────────────

interface AddRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  unitId: number;
  members: UnitMember[];
  categories: ScoringCategory[];
  onSuccess: () => void;
}

function AddRecordDialog({
  open,
  onOpenChange,
  clubId,
  unitId,
  members,
  categories,
  onSuccess,
}: AddRecordDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState("");
  const [week, setWeek] = useState(1);
  const [attendance, setAttendance] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  // Map of category_id → points value
  const [scoreMap, setScoreMap] = useState<Record<number, number>>({});

  // Reset on close
  function handleClose(val: boolean) {
    if (!val) {
      setUserId("");
      setWeek(1);
      setAttendance(0);
      setPunctuality(0);
      setScoreMap({});
    }
    onOpenChange(val);
  }

  const activeCategories = categories.filter((c) => c.active);

  function getCategoryScore(categoryId: number): number {
    return scoreMap[categoryId] ?? 0;
  }

  function setCategoryScore(categoryId: number, value: number) {
    setScoreMap((prev) => ({ ...prev, [categoryId]: value }));
  }

  const totalPoints = activeCategories.reduce(
    (sum, cat) => sum + getCategoryScore(cat.scoring_category_id),
    0,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      toast.error("Selecciona un miembro");
      return;
    }
    setIsSubmitting(true);
    try {
      const scores: ScoreEntry[] = activeCategories.map((cat) => ({
        category_id: cat.scoring_category_id,
        points: getCategoryScore(cat.scoring_category_id),
      }));

      await createWeeklyRecord(clubId, unitId, {
        user_id: userId,
        week,
        year: new Date().getFullYear(),
        attendance,
        punctuality,
        scores,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo registro semanal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member */}
          <div className="space-y-1.5">
            <Label htmlFor="record_user">
              Miembro <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select value={userId} onValueChange={setUserId}>
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
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
            />
          </div>

          {/* Fixed fields: attendance and punctuality */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="record_attendance">Asistencia</Label>
              <Input
                id="record_attendance"
                type="number"
                min={0}
                value={attendance}
                onChange={(e) => setAttendance(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="record_punctuality">Puntualidad</Label>
              <Input
                id="record_punctuality"
                type="number"
                min={0}
                value={punctuality}
                onChange={(e) => setPunctuality(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Dynamic scoring categories */}
          {activeCategories.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Categorías de puntaje
              </p>
              <div className="grid grid-cols-2 gap-3">
                {activeCategories.map((cat) => (
                  <div key={cat.scoring_category_id} className="space-y-1.5">
                    <Label htmlFor={`sc_${cat.scoring_category_id}`}>
                      {cat.name}
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        (máx. {cat.max_points})
                      </span>
                    </Label>
                    <Input
                      id={`sc_${cat.scoring_category_id}`}
                      type="number"
                      min={0}
                      max={cat.max_points}
                      value={getCategoryScore(cat.scoring_category_id)}
                      onChange={(e) =>
                        setCategoryScore(
                          cat.scoring_category_id,
                          Math.min(
                            cat.max_points,
                            Math.max(0, Number(e.target.value)),
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total (read-only) */}
          <div className="rounded-lg bg-muted/40 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <span className="text-sm font-semibold tabular-nums">
                {totalPoints} pts
              </span>
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
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar registro"
              )}
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
  min?: number;
  max?: number;
  onSave: (val: number) => Promise<void>;
}

function EditableCell({ value, min = 0, max, onSave }: EditableCellProps) {
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
        min={min}
        max={max}
        className="h-7 w-20 px-2 text-xs tabular-nums"
        value={draft}
        autoFocus
        onChange={(e) => {
          const v = Number(e.target.value);
          setDraft(max !== undefined ? Math.min(max, Math.max(min, v)) : Math.max(min, v));
        }}
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

// ─── Read-only total cell ─────────────────────────────────────────────────────

function TotalCell({ value }: { value: number }) {
  return (
    <span className="font-semibold tabular-nums text-primary">{value}</span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface WeeklyRecordsPanelProps {
  clubId: number;
  unitId: number;
  members: UnitMember[];
  /** Local field ID to fetch active scoring categories. Optional for backward compat. */
  localFieldId?: number | null;
}

export function WeeklyRecordsPanel({
  clubId,
  unitId,
  members,
  localFieldId,
}: WeeklyRecordsPanelProps) {
  const [records, setRecords] = useState<WeeklyRecord[] | null>(null);
  const [categories, setCategories] = useState<ScoringCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsData, categoriesData] = await Promise.allSettled([
        listWeeklyRecords(clubId, unitId),
        localFieldId
          ? getLocalFieldScoringCategories(localFieldId)
          : Promise.resolve([] as ScoringCategory[]),
      ]);

      if (recordsData.status === "fulfilled") {
        setRecords(recordsData.value);
      } else {
        toast.error("No se pudieron cargar los registros");
      }

      if (categoriesData.status === "fulfilled") {
        setCategories(categoriesData.value.filter((c) => c.active));
      }

      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [clubId, unitId, localFieldId]);

  // Lazy load on first render of this panel
  useEffect(() => {
    if (!loaded && !loading) {
      loadAll();
    }
  }, [loaded, loading, loadAll]);

  // ─── Update handler ─────────────────────────────────────────────────────────

  async function handleUpdateFixed(
    recordId: number,
    field: "attendance" | "punctuality",
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

  async function handleUpdateScore(
    recordId: number,
    categoryId: number,
    value: number,
  ) {
    // Build scores array for update: only the category being changed
    await updateWeeklyRecord(clubId, unitId, recordId, {
      scores: [{ category_id: categoryId, points: value }],
    });

    setRecords((prev) => {
      if (!prev) return prev;
      return prev.map((r) => {
        if (r.record_id !== recordId) return r;
        const existingScores = r.scores ?? [];
        const updatedScores = existingScores.some(
          (s) => s.category_id === categoryId,
        )
          ? existingScores.map((s) =>
              s.category_id === categoryId ? { ...s, points: value } : s,
            )
          : [...existingScores, { category_id: categoryId, points: value }];
        // Recalculate total
        const newTotal = updatedScores.reduce((sum, s) => sum + s.points, 0);
        return { ...r, scores: updatedScores, points: newTotal };
      });
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function getScoreForCategory(record: WeeklyRecord, categoryId: number): number {
    return record.scores?.find((s) => s.category_id === categoryId)?.points ?? 0;
  }

  function calculateTotal(record: WeeklyRecord): number {
    if (record.scores && record.scores.length > 0) {
      return record.scores.reduce((sum, s) => sum + s.points, 0);
    }
    return record.points;
  }

  const activeMembers = members.filter((m) => m.active);

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading && !loaded) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        <span className="text-sm">Cargando registros...</span>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Registros de asistencia y puntaje semanal. Haz clic en un valor para
          editarlo.
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
              : "No hay registros de asistencia aún. Crea el primero."
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

                {/* Dynamic category columns */}
                {categories.map((cat) => (
                  <TableHead
                    key={cat.scoring_category_id}
                    className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    title={`Máx. ${cat.max_points} pts`}
                  >
                    {cat.name}
                  </TableHead>
                ))}

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
                        handleUpdateFixed(record.record_id, "attendance", val)
                      }
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right align-middle text-sm">
                    <EditableCell
                      value={record.punctuality}
                      onSave={(val) =>
                        handleUpdateFixed(record.record_id, "punctuality", val)
                      }
                    />
                  </TableCell>

                  {/* Dynamic category score cells */}
                  {categories.map((cat) => (
                    <TableCell
                      key={cat.scoring_category_id}
                      className="px-3 py-2.5 text-right align-middle text-sm"
                    >
                      <EditableCell
                        value={getScoreForCategory(
                          record,
                          cat.scoring_category_id,
                        )}
                        min={0}
                        max={cat.max_points}
                        onSave={(val) =>
                          handleUpdateScore(
                            record.record_id,
                            cat.scoring_category_id,
                            val,
                          )
                        }
                      />
                    </TableCell>
                  ))}

                  {/* Total (calculated) */}
                  <TableCell className="px-3 py-2.5 text-right align-middle">
                    <TotalCell value={calculateTotal(record)} />
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
        categories={categories}
        onSuccess={loadAll}
      />
    </div>
  );
}
