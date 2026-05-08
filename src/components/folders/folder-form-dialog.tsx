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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema as z.ZodType<FormValues, FormValues>),
    defaultValues: {
      name: "",
      description: "",
      active: true,
    },
  });

  const activeValue = watch("active");

  useEffect(() => {
    if (open) {
      if (folder) {
        reset({
          name: folder.name,
          description: folder.description ?? "",
          active: folder.active,
        });
      } else {
        reset({
          name: "",
          description: "",
          active: true,
        });
      }
    }
  }, [open, folder, reset]);

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
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">
              Nombre <span aria-hidden="true" className="text-destructive">*</span>
            </Label>
            <Input
              id="folder-name"
              aria-required="true"
              {...register("name")}
              placeholder="Ej. Carpeta Conquistadores 2025"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="folder-description">Descripción</Label>
            <Textarea
              id="folder-description"
              {...register("description")}
              placeholder="Descripción opcional de la carpeta"
              rows={3}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Activa */}
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div className="space-y-0.5">
              <Label
                htmlFor="folder-active"
                className="cursor-pointer text-sm font-medium"
              >
                Carpeta activa
              </Label>
              <p className="text-xs text-muted-foreground">
                Solo las carpetas activas están disponibles para los clubes
              </p>
            </div>
            <Switch
              id="folder-active"
              checked={activeValue}
              onCheckedChange={(checked) => setValue("active", checked)}
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
      </DialogContent>
    </Dialog>
  );
}
