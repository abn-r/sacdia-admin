"use client";

import { useState } from "react";
import { Plus, CalendarDays, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription,
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
import { useTranslations } from "next-intl";
import { getLocalFieldScoringCategories } from "@/lib/api/scoring-categories";
import type { WeeklyRecord, UnitMember, ScoreEntry } from "@/lib/api/units";
import type { ScoringCategory } from "@/lib/api/scoring-categories";

function getIsoWeekYear(date: Date): { week: number; year: number } {
  const target = new Date(date.valueOf());
  const dayNumber = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);

  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstThursdayDayNumber = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDayNumber + 3);

  return {
    week:
      1 +
      Math.round(
        (target.getTime() - firstThursday.getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      ),
    year: target.getFullYear(),
  };
}

function getCategoryMode(
  category: ScoringCategory,
): "numeric" | "boolean_full" {
  return category.scoring_mode ?? "numeric";
}

function normalizeCategoryScore(
  category: ScoringCategory,
  value: number,
): number {
  if (getCategoryMode(category) === "boolean_full") {
    return value > 0 ? category.max_points : 0;
  }
  return Math.min(category.max_points, Math.max(0, value));
}

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
  const t = useTranslations("units_admin");
  const currentIsoPeriod = getIsoWeekYear(new Date());
  const [userId, setUserId] = useState("");
  const [week, setWeek] = useState(currentIsoPeriod.week);
  const [year, setYear] = useState(currentIsoPeriod.year);
  // Map of category_id → points value
  const [scoreMap, setScoreMap] = useState<Record<number, number>>({});

  // Reset on close
  function handleClose(val: boolean) {
    if (!val) {
      setUserId("");
      setWeek(currentIsoPeriod.week);
      setYear(currentIsoPeriod.year);
      setScoreMap({});
    }
    onOpenChange(val);
  }

  const activeCategories = categories.filter((c) => c.active);

  function getCategoryScore(categoryId: number): number {
    return scoreMap[categoryId] ?? 0;
  }

  function setCategoryScore(category: ScoringCategory, value: number) {
    setScoreMap((prev) => ({
      ...prev,
      [category.scoring_category_id]: normalizeCategoryScore(category, value),
    }));
  }

  function setAllCategoryScores(value: "max" | "zero") {
    setScoreMap(
      Object.fromEntries(
        activeCategories.map((cat) => [
          cat.scoring_category_id,
          value === "max" ? cat.max_points : 0,
        ]),
      ),
    );
  }

  const totalPoints = activeCategories.reduce(
    (sum, cat) => sum + getCategoryScore(cat.scoring_category_id),
    0,
  );

  const { mutate: createRecord, isPending: isSubmitting } = useMutation({
    mutationFn: () => {
      const scores: ScoreEntry[] = activeCategories.map((cat) => ({
        category_id: cat.scoring_category_id,
        points: getCategoryScore(cat.scoring_category_id),
      }));
      return createWeeklyRecord(clubId, unitId, {
        user_id: userId,
        week,
        year,
        scores,
      });
    },
    onSuccess: () => {
      toast.success(t("toasts.weekly_record_created"));
      onSuccess();
      handleClose(false);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : t("errors.create_record_failed");
      toast.error(message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      toast.error(t("validation.member_required"));
      return;
    }
    createRecord();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo registro semanal</DialogTitle>
          <DialogDescription>
            Registra los puntajes semanales por categoría para un miembro de la
            unidad.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member */}
          <div className="space-y-1.5">
            <Label htmlFor="record_user">
              Miembro <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="record_user" className="w-full">
                <SelectValue placeholder={t("placeholders.selectMember")} />
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="record_week">
                Semana ISO <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="record_week"
                type="number"
                min={1}
                max={53}
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="record_year">
                Año ISO <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="record_year"
                type="number"
                min={2020}
                max={2100}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Dynamic scoring categories */}
          {activeCategories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Categorías de puntaje
                </p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAllCategoryScores("max")}
                  >
                    Asignar todo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setAllCategoryScores("zero")}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
              <div className="grid gap-3">
                {activeCategories.map((cat) => (
                  <div key={cat.scoring_category_id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`sc_${cat.scoring_category_id}`}>
                        {cat.name}
                        <span className="ml-1 text-[11px] text-muted-foreground">
                          (máx. {cat.max_points})
                        </span>
                      </Label>
                      <Badge variant="secondary" className="text-[10px]">
                        {getCategoryMode(cat) === "boolean_full"
                          ? "Todo o nada"
                          : "Numérico"}
                      </Badge>
                    </div>
                    {getCategoryMode(cat) === "boolean_full" ? (
                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-sm text-muted-foreground">
                          {getCategoryScore(cat.scoring_category_id) ===
                          cat.max_points
                            ? `${cat.max_points} pts`
                            : "0 pts"}
                        </span>
                        <Switch
                          id={`sc_${cat.scoring_category_id}`}
                          checked={
                            getCategoryScore(cat.scoring_category_id) ===
                            cat.max_points
                          }
                          onCheckedChange={(checked) =>
                            setCategoryScore(cat, checked ? cat.max_points : 0)
                          }
                        />
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          id={`sc_${cat.scoring_category_id}`}
                          type="number"
                          min={0}
                          max={cat.max_points}
                          value={getCategoryScore(cat.scoring_category_id)}
                          onChange={(e) =>
                            setCategoryScore(cat, Number(e.target.value))
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCategoryScore(cat, 0)}
                        >
                          0
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCategoryScore(cat, cat.max_points)}
                        >
                          Máx.
                        </Button>
                      </div>
                    )}
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
                  <Loader2 className="size-4 animate-spin" />
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
  disabled?: boolean;
  onSave: (val: number) => Promise<void>;
}

function EditableCell({
  value,
  min = 0,
  max,
  disabled = false,
  onSave,
}: EditableCellProps) {
  const t = useTranslations("units_admin");
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
      toast.error(t("errors.update_value_failed"));
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
          setDraft(
            max !== undefined
              ? Math.min(max, Math.max(min, v))
              : Math.max(min, v),
          );
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
      className="rounded px-1 tabular-nums hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
      disabled={disabled}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title={
        disabled
          ? "Solo se puede editar la semana ISO vigente"
          : "Clic para editar"
      }
    >
      {saving ? <Loader2 className="inline size-3 animate-spin" /> : value}
    </button>
  );
}

interface ScoreCellProps {
  value: number;
  category: ScoringCategory;
  disabled?: boolean;
  onSave: (val: number) => Promise<void>;
}

function ScoreCell({
  value,
  category,
  disabled = false,
  onSave,
}: ScoreCellProps) {
  const mode = getCategoryMode(category);
  const normalizedValue = normalizeCategoryScore(category, value);

  if (mode === "boolean_full") {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs tabular-nums text-muted-foreground">
          {normalizedValue === category.max_points ? category.max_points : 0}
        </span>
        <Switch
          checked={normalizedValue === category.max_points}
          disabled={disabled}
          onCheckedChange={(checked) => {
            void onSave(checked ? category.max_points : 0).catch(
              () => undefined,
            );
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <EditableCell
        value={normalizedValue}
        min={0}
        max={category.max_points}
        disabled={disabled}
        onSave={(val) => onSave(normalizeCategoryScore(category, val))}
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        disabled={disabled}
        onClick={() => {
          void onSave(0).catch(() => undefined);
        }}
      >
        0
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        disabled={disabled}
        onClick={() => {
          void onSave(category.max_points).catch(() => undefined);
        }}
      >
        Máx.
      </Button>
    </div>
  );
}

// ─── Read-only total cell ─────────────────────────────────────────────────────

function TotalCell({ value }: { value: number }) {
  return (
    <span className="font-semibold tabular-nums text-primary">{value}</span>
  );
}

// ─── Query key factories ─────────────────────────────────────────────────────

export const weeklyRecordsQueryKey = (clubId: number, unitId: number) =>
  ["weekly-records", clubId, unitId] as const;

export const scoringCategoriesQueryKey = (localFieldId: number) =>
  ["scoring-categories", localFieldId] as const;

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
  const t = useTranslations("units_admin");
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: records = null, isLoading: recordsLoading } = useQuery({
    queryKey: weeklyRecordsQueryKey(clubId, unitId),
    queryFn: async () => {
      try {
        return await listWeeklyRecords(clubId, unitId);
      } catch {
        toast.error(t("errors.load_records_failed"));
        throw new Error(t("errors.load_records_failed"));
      }
    },
    staleTime: 30_000,
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: scoringCategoriesQueryKey(localFieldId ?? 0),
    queryFn: () =>
      localFieldId
        ? getLocalFieldScoringCategories(localFieldId)
        : Promise.resolve([] as ScoringCategory[]),
    // Scoring categories are catalog data — refresh every 5 min.
    staleTime: 5 * 60_000,
    enabled: true,
  });

  const categories = allCategories.filter((c) => c.active);
  const currentIsoPeriod = getIsoWeekYear(new Date());

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const { mutateAsync: updateScore } = useMutation({
    mutationFn: ({
      recordId,
      categoryId,
      value,
    }: {
      recordId: number;
      categoryId: number;
      value: number;
    }) =>
      updateWeeklyRecord(clubId, unitId, recordId, {
        scores: [{ category_id: categoryId, points: value }],
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: weeklyRecordsQueryKey(clubId, unitId),
      });
    },
    onError: () => {
      toast.error(t("errors.update_value_failed"));
    },
  });

  // ─── Handlers for category score cells ──────────────────────────────────────

  async function handleUpdateScore(
    recordId: number,
    category: ScoringCategory,
    value: number,
  ) {
    await updateScore({
      recordId,
      categoryId: category.scoring_category_id,
      value: normalizeCategoryScore(category, value),
    });
  }

  async function applyAllCategoriesToRecord(
    record: WeeklyRecord,
    value: "max" | "zero",
  ) {
    if (!isRecordEditable(record)) return;
    try {
      for (const category of categories) {
        await handleUpdateScore(
          record.record_id,
          category,
          value === "max" ? category.max_points : 0,
        );
      }
      toast.success(
        value === "max"
          ? "Puntajes del miembro asignados"
          : "Puntajes del miembro limpiados",
      );
    } catch {
      toast.error(t("errors.update_value_failed"));
    }
  }

  async function applyCategoryToAll(
    category: ScoringCategory,
    value: "max" | "zero",
  ) {
    const editableRecords = (records ?? []).filter(isRecordEditable);
    try {
      for (const record of editableRecords) {
        await handleUpdateScore(
          record.record_id,
          category,
          value === "max" ? category.max_points : 0,
        );
      }
      toast.success(
        value === "max"
          ? "Categoría asignada a todos"
          : "Categoría limpiada para todos",
      );
    } catch {
      toast.error(t("errors.update_value_failed"));
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function getScoreForCategory(
    record: WeeklyRecord,
    categoryId: number,
  ): number {
    return (
      record.scores?.find((s) => s.category_id === categoryId)?.points ?? 0
    );
  }

  function calculateTotal(record: WeeklyRecord): number {
    if (record.scores && record.scores.length > 0) {
      return record.scores.reduce((sum, s) => sum + s.points, 0);
    }
    return record.points;
  }

  function isRecordEditable(record: WeeklyRecord): boolean {
    return (
      record.week === currentIsoPeriod.week &&
      record.year === currentIsoPeriod.year
    );
  }

  const activeMembers = members.filter((m) => m.active);

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (recordsLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Cargando registros...</span>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Planilla semanal agregada por categorías. Solo la semana ISO vigente
          se puede editar; asistencia y puntualidad deben configurarse como
          categorías si deben sumar puntos.
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
              : "No hay registros semanales aún. Crea el primero."
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
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Miembro
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Semana
                </TableHead>
                {/* Dynamic category columns */}
                {categories.map((cat) => (
                  <TableHead
                    key={cat.scoring_category_id}
                    className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    title={t("weeklyRecords.maxPointsTitle", {
                      max: cat.max_points,
                    })}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-end gap-1">
                        <span>{cat.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {getCategoryMode(cat) === "boolean_full"
                            ? "Todo o nada"
                            : "Num."}
                        </Badge>
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px]"
                          onClick={() => void applyCategoryToAll(cat, "zero")}
                        >
                          0 todos
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px]"
                          onClick={() => void applyCategoryToAll(cat, "max")}
                        >
                          Máx.
                        </Button>
                      </div>
                    </div>
                  </TableHead>
                ))}

                <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total
                </TableHead>
                <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Acciones
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
                      Sem. {record.week}/{record.year}
                    </Badge>
                  </TableCell>
                  {/* Dynamic category score cells */}
                  {categories.map((cat) => (
                    <TableCell
                      key={cat.scoring_category_id}
                      className="px-3 py-2.5 text-right align-middle text-sm"
                    >
                      <ScoreCell
                        value={getScoreForCategory(
                          record,
                          cat.scoring_category_id,
                        )}
                        category={cat}
                        disabled={!isRecordEditable(record)}
                        onSave={(val) =>
                          handleUpdateScore(record.record_id, cat, val)
                        }
                      />
                    </TableCell>
                  ))}

                  {/* Total (calculated) */}
                  <TableCell className="px-3 py-2.5 text-right align-middle">
                    <TotalCell value={calculateTotal(record)} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right align-middle">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        disabled={!isRecordEditable(record)}
                        onClick={() =>
                          void applyAllCategoriesToRecord(record, "max")
                        }
                      >
                        Todo
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        disabled={!isRecordEditable(record)}
                        onClick={() =>
                          void applyAllCategoriesToRecord(record, "zero")
                        }
                      >
                        Limpiar
                      </Button>
                    </div>
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
        onSuccess={() =>
          void queryClient.invalidateQueries({
            queryKey: weeklyRecordsQueryKey(clubId, unitId),
          })
        }
      />
    </div>
  );
}
