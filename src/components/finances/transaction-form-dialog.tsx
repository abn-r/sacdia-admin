"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  getFinanceCategories,
  createFinance,
  updateFinance,
  type Finance,
  type FinanceCategory,
  type CreateFinancePayload,
} from "@/lib/api/finances";

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  year: z.coerce
    .number({ error: "Ingresá un año válido" })
    .min(2000, "Año inválido")
    .max(2100, "Año inválido"),
  month: z.coerce
    .number({ error: "Ingresá un mes válido" })
    .min(1, "Mes inválido")
    .max(12, "Mes inválido"),
  amount: z.coerce
    .number({ error: "Ingresá un monto válido" })
    .positive("El monto debe ser positivo"),
  description: z.string().optional(),
  finance_category_id: z.coerce
    .number({ error: "Seleccioná una categoría" })
    .min(1, "Seleccioná una categoría"),
  finance_date: z.string().min(1, "Ingresá la fecha"),
  club_type_id: z.coerce.number().optional(),
  club_section_id: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClubSection = {
  club_section_id: number;
  club_type_id: number;
  name: string;
  club_type?: { name?: string } | null;
};

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  sections: ClubSection[];
  /** If provided, dialog is in edit mode */
  finance?: Finance | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionFormDialog({
  open,
  onOpenChange,
  clubId,
  sections,
  finance,
  onSuccess,
}: TransactionFormDialogProps) {
  const isEdit = !!finance;
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories on open
  useEffect(() => {
    if (!open) return;
    setLoadingCategories(true);
    getFinanceCategories()
      .then(setCategories)
      .catch(() => toast.error("No se pudieron cargar las categorías"))
      .finally(() => setLoadingCategories(false));
  }, [open]);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      year: currentYear,
      month: new Date().getMonth() + 1,
      amount: undefined,
      description: "",
      finance_category_id: undefined,
      finance_date: today,
      club_type_id: undefined,
      club_section_id: undefined,
    },
  });

  // Reset when dialog opens/finance changes
  useEffect(() => {
    if (open) {
      reset({
        year: finance?.year ?? currentYear,
        month: finance?.month ?? new Date().getMonth() + 1,
        amount: finance ? finance.amount / 100 : undefined,
        description: finance?.description ?? "",
        finance_category_id: finance?.finance_category_id ?? undefined,
        finance_date: finance?.finance_date
          ? finance.finance_date.split("T")[0]
          : today,
        club_type_id: finance?.club_type_id ?? sections[0]?.club_type_id,
        club_section_id: finance?.club_section_id ?? sections[0]?.club_section_id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, finance]);

  const selectedSectionId = watch("club_section_id");
  const selectedCategoryId = watch("finance_category_id");
  const selectedYear = watch("year");
  const selectedMonth = watch("month");

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      if (isEdit && finance) {
        await updateFinance(finance.finance_id, {
          amount: Math.round(values.amount * 100),
          description: values.description,
          finance_category_id: values.finance_category_id,
          finance_date: values.finance_date,
        });
        toast.success("Movimiento actualizado correctamente");
      } else {
        if (!values.club_section_id || !values.club_type_id) {
          toast.error("Seleccioná una sección del club");
          return;
        }
        const payload: CreateFinancePayload = {
          year: values.year,
          month: values.month,
          amount: Math.round(values.amount * 100),
          description: values.description,
          club_type_id: values.club_type_id,
          finance_category_id: values.finance_category_id,
          finance_date: values.finance_date,
          club_section_id: values.club_section_id,
        };
        await createFinance(clubId, payload);
        toast.success("Movimiento creado correctamente");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : isEdit
            ? "No se pudo actualizar el movimiento"
            : "No se pudo crear el movimiento";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modificá los datos del movimiento financiero."
              : "Registrá un nuevo ingreso o egreso del club."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Categoría */}
          <div className="space-y-1.5">
            <Label>
              Categoría <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              value={selectedCategoryId?.toString() ?? ""}
              onValueChange={(v) => setValue("finance_category_id", Number(v))}
              disabled={loadingCategories}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingCategories ? "Cargando categorías..." : "Seleccioná una categoría"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem
                    key={cat.finance_category_id}
                    value={cat.finance_category_id.toString()}
                  >
                    {cat.name} — {cat.type === 0 ? "Ingreso" : "Egreso"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.finance_category_id && (
              <p className="text-xs text-destructive">
                {errors.finance_category_id.message}
              </p>
            )}
          </div>

          {/* Fecha */}
          <div className="space-y-1.5">
            <Label htmlFor="finance_date">
              Fecha <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input id="finance_date" type="date" {...register("finance_date")} />
            {errors.finance_date && (
              <p className="text-xs text-destructive">{errors.finance_date.message}</p>
            )}
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">
              Monto (ARS) <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Año y Mes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Año <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select
                value={selectedYear?.toString() ?? ""}
                onValueChange={(v) => setValue("year", Number(v))}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.year && (
                <p className="text-xs text-destructive">{errors.year.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>
                Mes <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select
                value={selectedMonth?.toString() ?? ""}
                onValueChange={(v) => setValue("month", Number(v))}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.month && (
                <p className="text-xs text-destructive">{errors.month.message}</p>
              )}
            </div>
          </div>

          {/* Sección del club (solo al crear) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>
                Sección del club <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select
                value={selectedSectionId?.toString() ?? ""}
                onValueChange={(v) => {
                  const sectionId = Number(v);
                  setValue("club_section_id", sectionId);
                  const section = sections.find(
                    (s) => s.club_section_id === sectionId,
                  );
                  if (section) {
                    setValue("club_type_id", section.club_type_id);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una sección" />
                </SelectTrigger>
                <SelectContent>
                  {sections.length > 0 ? (
                    sections.map((s) => (
                      <SelectItem
                        key={s.club_section_id}
                        value={s.club_section_id.toString()}
                      >
                        {s.name}
                        {s.club_type?.name ? ` (${s.club_type.name})` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="0" disabled>
                      No hay secciones disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Descripción del movimiento (opcional)"
              className="min-h-[80px] resize-none"
              {...register("description")}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || loadingCategories}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear movimiento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
