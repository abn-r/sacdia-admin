"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus, PenLine, Check, AlertCircle } from "lucide-react";
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

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="default" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Guardando...
        </>
      ) : (
        <>
          {isEdit ? <Check className="size-4" /> : <Plus className="size-4" />}
          {isEdit ? "Guardar cambios" : "Crear"}
        </>
      )}
    </Button>
  );
}

type SelectOption = { label: string; value: number };

interface CatalogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  singularTitle?: string;
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
  singularTitle,
  description,
  fields,
  initialValues,
  selectOptions = {},
  formAction,
}: CatalogFormDialogProps) {
  const isEdit = !!initialValues;
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              {isEdit
                ? <PenLine className="size-5 text-muted-foreground" />
                : <Plus className="size-5 text-muted-foreground" />
              }
              {singularTitle
                ? (isEdit ? `Editar ${singularTitle}` : `Crear ${singularTitle}`)
                : title
              }
            </span>
          </DialogTitle>
          <DialogDescription>
            {description ?? (isEdit ? "Modificá los campos necesarios" : "Completá los campos requeridos")}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-5">
          {state.error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 flex items-start gap-2">
              <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
              <span className="text-sm text-destructive">{state.error}</span>
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
              // Filter out entries with null/undefined/NaN values to prevent duplicate key warnings
              const validOptions = options.filter(
                (opt) => opt.value != null && Number.isFinite(opt.value) && opt.value > 0,
              );
              return (
                <div key={field.name} className="space-y-1.5">
                  <Label htmlFor={field.name} className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive/70 ml-0.5">*</span>}
                  </Label>
                  <Select
                    name={field.name}
                    defaultValue={defaultValue != null && String(defaultValue) !== "0" ? String(defaultValue) : undefined}
                    required={field.required}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Seleccionar ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {validOptions.map((opt, idx) => (
                        <SelectItem key={`${opt.value}-${idx}`} value={String(opt.value)}>
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
                <div key={field.name} className="space-y-1.5">
                  <Label htmlFor={field.name} className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive/70 ml-0.5">*</span>}
                  </Label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    defaultValue={typeof defaultValue === "string" ? defaultValue : ""}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={3}
                    className="min-h-[80px] resize-none"
                  />
                </div>
              );
            }

            return (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive/70 ml-0.5">*</span>}
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton isEdit={isEdit} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
