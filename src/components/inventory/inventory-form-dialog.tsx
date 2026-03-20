"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  createInventoryItem,
  updateInventoryItem,
  INSTANCE_TYPE_LABELS,
} from "@/lib/api/inventory";
import type { InventoryItem, InventoryCategory, InstanceType } from "@/lib/api/inventory";

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede superar 100 caracteres"),
  description: z.string().max(500, "La descripción no puede superar 500 caracteres").optional(),
  inventory_category_id: z.coerce
    .number()
    .int()
    .positive("Selecciona una categoría"),
  amount: z.coerce.number().int().min(0, "La cantidad no puede ser negativa"),
});

type FormValues = z.infer<typeof formSchema>;

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        reset({
          name: item.name,
          description: item.description ?? "",
          inventory_category_id: item.inventory_category_id,
          amount: item.amount,
        });
      } else {
        reset({
          name: "",
          description: "",
          inventory_category_id: categories[0]?.inventory_category_id ?? 0,
          amount: 0,
        });
      }
    }
  }, [open, item, categories, reset]);

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
        toast.success("Ítem actualizado correctamente");
      } else {
        await createInventoryItem(clubId, {
          name: values.name,
          description: values.description || undefined,
          inventory_category_id: values.inventory_category_id,
          amount: values.amount,
          instanceType,
        });
        toast.success("Ítem creado correctamente");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al guardar el ítem";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryId = watch("inventory_category_id");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar ítem" : "Nuevo ítem de inventario"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Ej. Carpas 4 personas"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Descripción opcional del ítem"
              rows={3}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <Label>Categoría *</Label>
            <Select
              value={String(selectedCategoryId)}
              onValueChange={(val) =>
                setValue("inventory_category_id", Number(val))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
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
            {errors.inventory_category_id && (
              <p className="text-xs text-destructive">
                {errors.inventory_category_id.message}
              </p>
            )}
          </div>

          {/* Cantidad */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Cantidad *</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              {...register("amount")}
              placeholder="0"
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

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
      </DialogContent>
    </Dialog>
  );
}
