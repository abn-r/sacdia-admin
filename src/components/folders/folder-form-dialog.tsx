"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createFolder, updateFolder } from "@/lib/api/folders";
import type { FolderTemplate } from "@/lib/api/folders";

// ─── Schema factory ───────────────────────────────────────────────────────────

function buildSchema(t: ReturnType<typeof useTranslations<"folders.validation">>) {
  return z.object({
    name: z
      .string()
      .min(3, t("name_min", { min: 3 }))
      .max(100, t("name_max", { max: 100 })),
    description: z
      .string()
      .max(500, t("description_max", { max: 500 }))
      .optional(),
    active: z.boolean(),
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface FolderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: FolderTemplate | null;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FolderFormDialog({
  open,
  onOpenChange,
  folder,
  onSuccess,
}: FolderFormDialogProps) {
  const t = useTranslations("folders");
  const tVal = useTranslations("folders.validation");
  const isEdit = !!folder;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const schema = useMemo(() => buildSchema(tVal), [tVal]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      name: "",
      description: "",
      active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (folder) {
        form.reset({
          name: folder.name,
          description: folder.description ?? "",
          active: folder.active,
        });
      } else {
        form.reset({
          name: "",
          description: "",
          active: true,
        });
      }
    }
  }, [open, folder, form]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: values.name,
        description: values.description || null,
        active: values.active,
      };

      if (isEdit && folder) {
        await updateFolder(folder.folder_id, payload);
        toast.success(t("toasts.updated"));
      } else {
        await createFolder(payload);
        toast.success(t("toasts.created"));
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : isEdit
            ? "Error al actualizar la carpeta"
            : "Error al crear la carpeta";
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
            {isEdit ? "Editar carpeta" : "Nueva carpeta de evidencias"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modificá los datos de la carpeta de evidencias."
              : "Completá el formulario para crear una nueva carpeta de evidencias."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre <span aria-hidden="true" className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      aria-required="true"
                      placeholder="Ej. Carpeta Conquistadores 2025"
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
                      placeholder="Descripción opcional de la carpeta"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Activa */}
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel className="cursor-pointer text-sm font-medium">
                      Carpeta activa
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Solo las carpetas activas están disponibles para los clubes
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
                    : "Crear carpeta"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
