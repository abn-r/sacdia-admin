"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  createCategory,
  updateCategory,
} from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";
import type { MaterialCategoryAdmin } from "@/lib/types/materials";

const createSchema = z.object({
  slug: z
    .string()
    .min(1, "El slug es requerido")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Sólo minúsculas, dígitos y guiones"),
  label: z.string().min(1, "El nombre es requerido").max(200),
  icon: z.string().max(100).optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const editSchema = z.object({
  label: z.string().min(1, "El nombre es requerido").max(200),
  icon: z.string().max(100).optional(),
  sort_order: z.coerce.number().int().min(0),
  active: z.boolean(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

interface CategoryFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  categoria?: MaterialCategoryAdmin | null;
}

function CreateForm({ onSuccess }: { onSuccess: () => void }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema) as unknown as Resolver<CreateFormValues>,
    defaultValues: {
      slug: "",
      label: "",
      icon: "",
      sort_order: 0,
      active: true,
    },
  });

  async function onSubmit(values: CreateFormValues) {
    try {
      await createCategory({
        slug: values.slug,
        label: values.label,
        icon: values.icon || null,
        sort_order: values.sort_order ?? 0,
        active: values.active ?? true,
      });
      toast.success("Categoría creada.");
      form.reset();
      startTransition(() => onSuccess());
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        form.setError("slug", { message: "Este slug ya existe." });
      } else {
        toast.error(
          err instanceof ApiError ? err.message : "Error al crear la categoría.",
        );
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input placeholder="ej. uniforme, insumos, libros" {...field} />
              </FormControl>
              <FormDescription>
                Identificador URL-safe. Usá minúsculas y guiones.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="ej. Uniformes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Ícono{" "}
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="ej. shirt, book, pin" {...field} />
              </FormControl>
              <FormDescription>
                Nombre del ícono lucide-react (en kebab-case).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sort_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Orden</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  {...field}
                  value={field.value ?? 0}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SheetFooter className="pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Crear categoría
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

function EditForm({
  categoria,
  onSuccess,
}: {
  categoria: MaterialCategoryAdmin;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema) as unknown as Resolver<EditFormValues>,
    defaultValues: {
      label: categoria.label,
      icon: categoria.icon ?? "",
      sort_order: categoria.sort_order,
      active: categoria.active,
    },
  });

  useEffect(() => {
    form.reset({
      label: categoria.label,
      icon: categoria.icon ?? "",
      sort_order: categoria.sort_order,
      active: categoria.active,
    });
  }, [categoria.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: EditFormValues) {
    try {
      await updateCategory(categoria.id, {
        label: values.label,
        icon: values.icon || null,
        sort_order: values.sort_order,
        active: values.active,
      });
      toast.success("Categoría actualizada.");
      startTransition(() => onSuccess());
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Error al actualizar la categoría.";
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <FormLabel>Slug</FormLabel>
          <p className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm text-muted-foreground">
            {categoria.slug}
          </p>
          <p className="text-xs text-muted-foreground">
            El slug no se puede modificar una vez creada la categoría.
          </p>
        </div>

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Ícono{" "}
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="ej. shirt, book, pin" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sort_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Orden</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Activa</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Las categorías inactivas no aparecen para los directores.
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <SheetFooter className="pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Guardar cambios
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

export function CategoryFormSheet({
  open,
  onOpenChange,
  mode,
  categoria,
}: CategoryFormSheetProps) {
  const router = useRouter();

  function handleSuccess() {
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>
            {mode === "create" ? "Nueva categoría" : "Editar categoría"}
          </SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Definí una categoría de materiales reutilizable por todos los campos."
              : "Modificá el nombre, ícono, orden y estado de la categoría."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-2 px-6 pb-6">
          {mode === "create" ? (
            <CreateForm onSuccess={handleSuccess} />
          ) : categoria ? (
            <EditForm categoria={categoria} onSuccess={handleSuccess} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
