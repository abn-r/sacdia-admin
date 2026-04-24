"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { updateSystemConfig, type SystemConfig } from "@/lib/api/system-config";
import { ApiError } from "@/lib/api/client";

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  config_value: z.string().min(1, "El valor no puede estar vacío"),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemConfigEditDialogProps {
  open: boolean;
  config: SystemConfig | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SystemConfigEditDialog({
  open,
  config,
  onOpenChange,
  onSuccess,
}: SystemConfigEditDialogProps) {
  const t = useTranslations("system_config");
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { config_value: config?.config_value ?? "" },
  });

  // Sync form when config changes
  useEffect(() => {
    if (config) {
      form.reset({ config_value: config.config_value });
    }
  }, [config, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!config) return;
    setIsPending(true);
    try {
      await updateSystemConfig(config.key, { config_value: values.config_value });
      toast.success(`Configuración "${config.key}" actualizada`);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("errors.unexpected");
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  });

  function handleClose(isOpen: boolean) {
    if (!isPending) {
      form.reset();
      onOpenChange(isOpen);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4" />
            Editar configuración
          </DialogTitle>
          <DialogDescription>
            {config?.key && (
              <>
                Modificá el valor de <code className="rounded bg-muted px-1 py-0.5 text-xs">{config.key}</code>.
                {config.description && (
                  <span className="mt-1 block text-muted-foreground">{config.description}</span>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="config_value">Valor *</Label>
            <Input
              id="config_value"
              {...form.register("config_value")}
              disabled={isPending}
              aria-describedby={
                form.formState.errors.config_value ? "value-error" : undefined
              }
            />
            {form.formState.errors.config_value && (
              <p id="value-error" className="text-xs text-destructive">
                {form.formState.errors.config_value.message}
              </p>
            )}
            {config?.value_type && (
              <p className="text-xs text-muted-foreground">
                Tipo esperado: <span className="font-medium">{config.value_type}</span>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
