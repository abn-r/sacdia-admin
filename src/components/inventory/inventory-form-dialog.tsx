"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
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
import { useTranslations } from "next-intl";
import {
  createInventoryItem,
  updateInventoryItem,
  INSTANCE_TYPE_LABELS,
} from "@/lib/api/inventory";
import type { InventoryItem, InventoryCategory, InstanceType } from "@/lib/api/inventory";

// ─── Schema factory ───────────────────────────────────────────────────────────

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
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

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
  const schema = useMemo(() => buildSchema(tVal), [tVal]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      name: "",
      description: "",
      inventory_category_id: categories[0]?.inventory_category_id ?? 0,
      amount: 0,
    },
  });

  // Populate form when editing or reset when creating
  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          name: item.name,
          description: item.description ?? "",
          inventory_category_id: item.inventory_category_id,
          amount: item.amount,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          inventory_category_id: categories[0]?.inventory_category_id ?? 0,
          amount: 0,
        });
      }
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
        });
        toast.success(t("toasts.item_updated"));
      } else {
        await createInventoryItem(clubId, {
          name: values.name,
          description: values.description || undefined,
          inventory_category_id: values.inventory_category_id,
          amount: values.amount,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar ítem" : "Nuevo ítem de inventario"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modificá los datos del ítem de inventario."
              : "Completá el formulario para agregar un nuevo ítem al inventario del club."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

            {/* Tipo de instancia (solo al crear, informativo) */}
            {!isEdit && (
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                Se agregará al inventario de{" "}
                <span className="font-medium text-foreground">
                  {INSTANCE_TYPE_LABELS[instanceType]}
                </span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isEdit
                    ? "Guardando..."
                    : "Creando..."
                  : isEdit
                    ? "Guardar cambios"
                    : "Crear ítem"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
