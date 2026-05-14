"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PriceInput } from "./price-input";
import { createProduct, updateProduct } from "@/lib/api/materiales";
import { ApiError } from "@/lib/api/client";
import type { MaterialProduct, MaterialCategory } from "@/lib/types/materiales";

// ─── TODO: Replace hardcoded club_type_id options with API call when
// a dedicated programas endpoint is available in the admin context. For v1,
// these values match club_types seed data (1=Aventureros, 2=Conquistadores,
// 3=Guías Mayores). ─────────────────────────────────────────────────────────
const CLUB_TYPES = [
  { id: 1, label: "Aventureros" },
  { id: 2, label: "Conquistadores" },
  { id: 3, label: "Guías Mayores" },
] as const;

// ─── Schemas ──────────────────────────────────────────────────────────────────

// z.coerce.number() splits input/output types → needs resolver cast (same pattern
// as weights-form.tsx). See that file for the full explanation.
const createSchema = z.object({
  sku: z.string().min(1, "El SKU es requerido").max(64),
  title: z.string().min(1, "El nombre es requerido").max(200),
  description: z.string().optional(),
  club_type_id: z.coerce.number().int().min(1, "Seleccioná un programa"),
  material_category_id: z.string().min(1, "Seleccioná una categoría"),
  price_centavos: z.number().int().min(1, "El precio debe ser mayor a 0"),
  stock: z.coerce.number().int().min(0).optional(),
});

const editSchema = z.object({
  title: z.string().min(1, "El nombre es requerido").max(200),
  description: z.string().optional(),
  price_centavos: z.number().int().min(1, "El precio debe ser mayor a 0"),
  active: z.boolean(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  product?: MaterialProduct | null;
  categories: MaterialCategory[];
}

// ─── Create Form ──────────────────────────────────────────────────────────────

function CreateForm({
  categories,
  onSuccess,
}: {
  categories: MaterialCategory[];
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema) as unknown as Resolver<CreateFormValues>,
    defaultValues: {
      sku: "",
      title: "",
      description: "",
      club_type_id: undefined,
      material_category_id: "",
      price_centavos: 0,
      stock: 0,
    },
  });

  async function onSubmit(values: CreateFormValues) {
    try {
      await createProduct({
        sku: values.sku,
        title: values.title,
        description: values.description || undefined,
        club_type_id: values.club_type_id,
        material_category_id: values.material_category_id,
        price_centavos: values.price_centavos,
        stock: values.stock ?? 0,
      });
      toast.success("Producto creado correctamente.");
      form.reset();
      startTransition(() => onSuccess());
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        form.setError("sku", {
          message: "Este SKU ya está en uso. Usá uno diferente.",
        });
      } else {
        const message =
          err instanceof ApiError ? err.message : "Error al crear el producto.";
        toast.error(message);
      }
    }
  }

  return (
    <Form {...form}>
      <form
        id="product-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* SKU */}
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl>
                <Input placeholder="ej. PAÑUELO-CON-001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del producto</FormLabel>
              <FormControl>
                <Input placeholder="ej. Pañuelo Conquistadores" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Descripción{" "}
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descripción del producto..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Programa */}
        <FormField
          control={form.control}
          name="club_type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Programa</FormLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(v)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná un programa" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CLUB_TYPES.map((ct) => (
                    <SelectItem key={ct.id} value={String(ct.id)}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="material_category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Price */}
        <Controller
          control={form.control}
          name="price_centavos"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <Label htmlFor="price_centavos">Precio</Label>
              <PriceInput
                id="price_centavos"
                valueCentavos={field.value}
                onChange={field.onChange}
                disabled={isPending}
              />
              {fieldState.error && (
                <p className="text-sm font-medium text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Stock (create only) */}
        <FormField
          control={form.control}
          name="stock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Stock inicial{" "}
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  {...field}
                  value={field.value ?? 0}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SheetFooter className="pt-2">
          <Button type="submit" disabled={isPending} form="product-form">
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Crear producto
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

// ─── Edit Form ────────────────────────────────────────────────────────────────

function EditForm({
  product,
  onSuccess,
}: {
  product: MaterialProduct;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema) as unknown as Resolver<EditFormValues>,
    defaultValues: {
      title: product.title,
      description: product.description ?? "",
      price_centavos: product.price_centavos,
      active: product.active,
    },
  });

  // Sync form when product changes (sheet re-opened with different product)
  useEffect(() => {
    form.reset({
      title: product.title,
      description: product.description ?? "",
      price_centavos: product.price_centavos,
      active: product.active,
    });
  }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: EditFormValues) {
    try {
      await updateProduct(product.id, {
        title: values.title,
        description: values.description || undefined,
        price_centavos: values.price_centavos,
        active: values.active,
      });
      toast.success("Producto actualizado correctamente.");
      startTransition(() => onSuccess());
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Error al actualizar el producto.";
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form
        id="product-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* SKU — read-only in edit mode */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">SKU</Label>
          <p className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm text-muted-foreground">
            {product.sku}
          </p>
        </div>

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del producto</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Descripción{" "}
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Price */}
        <Controller
          control={form.control}
          name="price_centavos"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <Label htmlFor="edit_price_centavos">Precio</Label>
              <PriceInput
                id="edit_price_centavos"
                valueCentavos={field.value}
                onChange={field.onChange}
                disabled={isPending}
              />
              {fieldState.error && (
                <p className="text-sm font-medium text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Active (edit only) */}
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Activo</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Los productos inactivos no aparecen en el catálogo.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <SheetFooter className="pt-2">
          <Button type="submit" disabled={isPending} form="product-form">
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Guardar cambios
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function ProductFormSheet({
  open,
  onOpenChange,
  mode,
  product,
  categories,
}: ProductFormSheetProps) {
  const router = useRouter();

  function handleSuccess() {
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? "Nuevo producto" : "Editar producto"}
          </SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Completá los datos para agregar un nuevo producto al inventario."
              : "Modificá los campos del producto. El SKU no puede cambiarse."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {mode === "create" ? (
            <CreateForm categories={categories} onSuccess={handleSuccess} />
          ) : product ? (
            <EditForm product={product} onSuccess={handleSuccess} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
