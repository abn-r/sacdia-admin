"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { Control, FieldErrors, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createInventoryItem,
  updateInventoryItem,
  DEFAULT_INVENTORY_CONDITION,
  INSTANCE_TYPE_LABELS,
  INVENTORY_CONDITIONS,
} from "@/lib/api/inventory";
import type {
  CreateInventoryPayload,
  InventoryItem,
  InventoryCategory,
  InstanceType,
  UpdateInventoryPayload,
} from "@/lib/api/inventory";

// ─── Schema factory ───────────────────────────────────────────────────────────

const MAX_SERIAL_NUMBER = 100;
const MAX_LOCATION = 150;
const MAX_ASSIGNED_TO = 150;
const MAX_NOTES = 2000;

/** Money: optional, >= 0, at most 2 decimals. Kept as a string while editing. */
const MONEY_PATTERN = /^-?\d+(\.\d{1,2})?$/;

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function buildSchema(t: ReturnType<typeof useTranslations<"inventory.validation">>) {
  return z.object({
    name: z
      .string()
      .min(3, t("name_min", { min: 3 }))
      .max(100, t("name_max", { max: 100 })),
    description: z.string().max(500, t("description_max", { max: 500 })).optional(),
    inventory_category_id: z.coerce
      .number()
      .int()
      .positive(t("category_required")),
    amount: z.coerce.number().int().min(0, t("amount_min")),
    condition: z.enum(INVENTORY_CONDITIONS),
    serial_number: z
      .string()
      .trim()
      .max(MAX_SERIAL_NUMBER, t("serial_number_max", { max: MAX_SERIAL_NUMBER })),
    purchase_date: z
      .string()
      .trim()
      .refine((v) => v === "" || isValidCalendarDate(v), t("purchase_date_invalid")),
    estimated_value: z
      .string()
      .trim()
      .superRefine((v, ctx) => {
        if (v === "") return;
        if (!MONEY_PATTERN.test(v)) {
          ctx.addIssue({ code: "custom", message: t("estimated_value_invalid") });
        } else if (Number(v) < 0) {
          ctx.addIssue({ code: "custom", message: t("estimated_value_min") });
        }
      }),
    location: z.string().trim().max(MAX_LOCATION, t("location_max", { max: MAX_LOCATION })),
    assigned_to: z
      .string()
      .trim()
      .max(MAX_ASSIGNED_TO, t("assigned_to_max", { max: MAX_ASSIGNED_TO })),
    notes: z.string().trim().max(MAX_NOTES, t("notes_max", { max: MAX_NOTES })),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

// ─── Steps ────────────────────────────────────────────────────────────────────

type Step = "main" | "details";

const MAIN_FIELDS = [
  "name",
  "description",
  "inventory_category_id",
  "amount",
  "condition",
] as const satisfies readonly (keyof FormValues)[];

const DETAIL_FIELDS = [
  "serial_number",
  "purchase_date",
  "estimated_value",
  "location",
  "assigned_to",
  "notes",
] as const satisfies readonly (keyof FormValues)[];

const TOTAL_STEPS = 2;

function emptyValues(categoryId: number): FormValues {
  return {
    name: "",
    description: "",
    inventory_category_id: categoryId,
    amount: 0,
    condition: DEFAULT_INVENTORY_CONDITION,
    serial_number: "",
    purchase_date: "",
    estimated_value: "",
    location: "",
    assigned_to: "",
    notes: "",
  };
}

function valuesFromItem(item: InventoryItem): FormValues {
  return {
    name: item.name,
    description: item.description ?? "",
    inventory_category_id: item.inventory_category_id,
    amount: item.amount,
    condition: item.condition ?? DEFAULT_INVENTORY_CONDITION,
    serial_number: item.serial_number ?? "",
    purchase_date: item.purchase_date?.slice(0, 10) ?? "",
    estimated_value:
      item.estimated_value === null || item.estimated_value === undefined
        ? ""
        : String(item.estimated_value),
    location: item.location ?? "",
    assigned_to: item.assigned_to ?? "",
    notes: item.notes ?? "",
  };
}

/** Empty string -> null, so a cleared field can be sent as `null` on edit. */
function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function moneyOrNull(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

/** Extended fields for PATCH: cleared values are sent as `null`. */
function buildUpdateExtendedFields(values: FormValues): UpdateInventoryPayload {
  return {
    condition: values.condition,
    serial_number: textOrNull(values.serial_number),
    purchase_date: textOrNull(values.purchase_date),
    estimated_value: moneyOrNull(values.estimated_value),
    location: textOrNull(values.location),
    assigned_to: textOrNull(values.assigned_to),
    notes: textOrNull(values.notes),
  };
}

/** Extended fields for POST: empty values are omitted. */
function buildCreateExtendedFields(
  values: FormValues,
): Pick<
  CreateInventoryPayload,
  | "condition"
  | "serial_number"
  | "purchase_date"
  | "estimated_value"
  | "location"
  | "assigned_to"
  | "notes"
> {
  const serial = textOrNull(values.serial_number);
  const purchaseDate = textOrNull(values.purchase_date);
  const estimatedValue = moneyOrNull(values.estimated_value);
  const location = textOrNull(values.location);
  const assignedTo = textOrNull(values.assigned_to);
  const notes = textOrNull(values.notes);

  return {
    condition: values.condition,
    ...(serial !== null && { serial_number: serial }),
    ...(purchaseDate !== null && { purchase_date: purchaseDate }),
    ...(estimatedValue !== null && { estimated_value: estimatedValue }),
    ...(location !== null && { location }),
    ...(assignedTo !== null && { assigned_to: assignedTo }),
    ...(notes !== null && { notes }),
  };
}

// ─── Text field helper ────────────────────────────────────────────────────────

interface DetailTextFieldProps {
  control: Control<FormValues>;
  name: "serial_number" | "purchase_date" | "estimated_value" | "location" | "assigned_to";
  label: string;
  placeholder?: string;
  type?: "text" | "date" | "number";
  className?: string;
}

function DetailTextField({
  control,
  name,
  label,
  placeholder,
  type = "text",
  className,
}: DetailTextFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              {...(type === "number" ? { min: 0, step: "0.01", inputMode: "decimal" } : {})}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface InventoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  instanceType: InstanceType;
  categories: InventoryCategory[];
  item?: InventoryItem | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InventoryFormDialog({
  open,
  onOpenChange,
  clubId,
  instanceType,
  categories,
  item,
  onSuccess,
}: InventoryFormDialogProps) {
  const isEdit = !!item;
  const t = useTranslations("inventory");
  const tVal = useTranslations("inventory.validation");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("main");
  const schema = useMemo(() => buildSchema(tVal), [tVal]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as z.ZodType<FormValues, FormValues>),
    defaultValues: emptyValues(categories[0]?.inventory_category_id ?? 0),
  });

  // Populate form when editing or reset when creating
  useEffect(() => {
    if (open) {
      setStep("main");
      form.reset(
        item
          ? valuesFromItem(item)
          : emptyValues(categories[0]?.inventory_category_id ?? 0),
      );
    }
  }, [open, item, categories, form]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      if (isEdit && item) {
        await updateInventoryItem(item.inventory_id, {
          name: values.name,
          description: values.description || undefined,
          inventory_category_id: values.inventory_category_id,
          amount: values.amount,
          ...buildUpdateExtendedFields(values),
        });
        toast.success(t("toasts.item_updated"));
      } else {
        await createInventoryItem(clubId, {
          name: values.name,
          description: values.description || undefined,
          inventory_category_id: values.inventory_category_id,
          amount: values.amount,
          ...buildCreateExtendedFields(values),
          instanceType,
        });
        toast.success(t("toasts.item_created"));
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("errors.save_item_failed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Jump to the step holding the first invalid field so the error is visible.
  const onInvalid = (errors: FieldErrors<FormValues>) => {
    const hasMainError = MAIN_FIELDS.some((name) => errors[name]);
    const hasDetailError = DETAIL_FIELDS.some((name) => errors[name]);
    if (hasMainError) setStep("main");
    else if (hasDetailError) setStep("details");
  };

  const handleNext = async () => {
    const valid = await form.trigger([...MAIN_FIELDS]);
    if (valid) setStep("details");
  };

  const submitLabel = isSubmitting
    ? isEdit
      ? "Guardando..."
      : "Creando..."
    : isEdit
      ? "Guardar cambios"
      : "Crear ítem";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar ítem" : "Nuevo ítem de inventario"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos del ítem de inventario."
              : "Completa el formulario para agregar un nuevo ítem al inventario del club."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
            className="space-y-4"
            noValidate
          >
            <p
              className="text-xs font-medium text-muted-foreground"
              aria-live="polite"
            >
              {t("form.step_indicator", {
                current: step === "main" ? 1 : 2,
                total: TOTAL_STEPS,
              })}
              {" · "}
              <span className="text-foreground">
                {step === "main" ? t("form.step_main") : t("form.step_details")}
              </span>
            </p>

            {/* Paso 1: datos del ítem (los pasos inactivos permanecen montados para conservar el estado) */}
            <div className="space-y-4" hidden={step !== "main"}>
              {/* Nombre */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nombre{" "}
                      <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        aria-required="true"
                        placeholder={t("placeholders.name")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descripción */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("placeholders.description")}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Categoría */}
              <FormField
                control={form.control}
                name="inventory_category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Categoría{" "}
                      <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(val) => field.onChange(Number(val))}
                    >
                      <FormControl>
                        <SelectTrigger aria-required="true">
                          <SelectValue placeholder={t("placeholders.selectCategory")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.length > 0 ? (
                          categories.map((cat) => (
                            <SelectItem
                              key={cat.inventory_category_id}
                              value={String(cat.inventory_category_id)}
                            >
                              {cat.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="0" disabled>
                            No hay categorías disponibles
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cantidad */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Cantidad{" "}
                      <span aria-hidden="true" className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        aria-required="true"
                        placeholder={t("placeholders.quantity")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Condición */}
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.condition")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INVENTORY_CONDITIONS.map((condition) => (
                          <SelectItem key={condition} value={condition}>
                            {t(`condition.${condition}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tipo de instancia (solo al crear, informativo) */}
              {!isEdit && (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                  Se agregará al inventario de{" "}
                  <span className="font-medium text-foreground">
                    {INSTANCE_TYPE_LABELS[instanceType]}
                  </span>
                </div>
              )}
            </div>

            {/* Paso 2: detalles adicionales (todos opcionales) */}
            <div className="space-y-4" hidden={step !== "details"}>
              <p className="text-sm text-muted-foreground">
                {t("form.step_details_hint")}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailTextField
                  control={form.control}
                  name="serial_number"
                  label={t("form.serial_number")}
                  placeholder={t("placeholders.serial_number")}
                />
                <DetailTextField
                  control={form.control}
                  name="purchase_date"
                  type="date"
                  label={t("form.purchase_date")}
                />
                <DetailTextField
                  control={form.control}
                  name="estimated_value"
                  type="number"
                  label={t("form.estimated_value")}
                  placeholder={t("placeholders.estimated_value")}
                />
                <DetailTextField
                  control={form.control}
                  name="assigned_to"
                  label={t("form.assigned_to")}
                  placeholder={t("placeholders.assigned_to")}
                />
                <DetailTextField
                  control={form.control}
                  name="location"
                  label={t("form.location")}
                  placeholder={t("placeholders.location")}
                  className="sm:col-span-2"
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.notes")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("placeholders.notes")}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
              {step === "main" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNext}
                    disabled={isSubmitting}
                  >
                    {t("form.next")}
                    <ArrowRight className="size-4" />
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("main")}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="size-4" />
                  {t("form.back")}
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
