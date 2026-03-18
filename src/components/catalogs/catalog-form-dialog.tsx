"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EntityField } from "@/lib/catalogs/entities";
import type { CatalogItem } from "@/lib/catalogs/service";
import { showAppAlert } from "@/lib/ui/app-alerts";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      {label}
    </Button>
  );
}

type SelectOption = { label: string; value: number };

interface CatalogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: EntityField[];
  initialValues?: CatalogItem | null;
  selectOptions?: Record<string, SelectOption[]>;
  formAction: (prevState: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
}

export function CatalogFormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initialValues,
  selectOptions = {},
  formAction,
}: CatalogFormDialogProps) {
  const [state, action] = useActionState(formAction, {});
  const [checkboxValues, setCheckboxValues] = useState<Record<string, boolean>>({});
  const initialCheckboxValues = fields.reduce<Record<string, boolean>>((acc, field) => {
    if (field.type === "checkbox") {
      acc[field.name] = initialValues?.[field.name] === true || initialValues?.[field.name] === undefined;
    }
    return acc;
  }, {});

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCheckboxValues({});
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!state.error) return;

    showAppAlert({
      type: "error",
      title: "No se pudo guardar",
      description: state.error,
    });
  }, [state.error]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form action={action} className="space-y-4">
          {state.error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          )}

          {fields.map((field) => {
            const defaultValue = initialValues?.[field.name];

            if (field.type === "checkbox") {
              return (
                <div key={field.name} className="flex items-center gap-2">
                  <input
                    type="hidden"
                    name={field.name}
                    value={(checkboxValues[field.name] ?? initialCheckboxValues[field.name]) ? "on" : ""}
                  />
                  <Checkbox
                    id={field.name}
                    checked={checkboxValues[field.name] ?? initialCheckboxValues[field.name]}
                    onCheckedChange={(checked) =>
                      setCheckboxValues((prev) => ({ ...prev, [field.name]: !!checked }))
                    }
                  />
                  <Label htmlFor={field.name}>{field.label}</Label>
                </div>
              );
            }

            if (field.type === "select") {
              const options = selectOptions[field.optionsEntityKey ?? ""] ?? [];
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <Select
                    name={field.name}
                    defaultValue={defaultValue != null ? String(defaultValue) : undefined}
                    required={field.required}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Seleccionar ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            if (field.type === "textarea") {
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={3}
                  />
                </div>
              );
            }

            return (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                  defaultValue={defaultValue != null ? String(defaultValue) : ""}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              </div>
            );
          })}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton label={initialValues ? "Guardar cambios" : "Crear"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
