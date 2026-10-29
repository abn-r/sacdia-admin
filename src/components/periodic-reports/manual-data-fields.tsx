"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface FieldProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  control: Control<T>;
  disabled?: boolean;
}

/** Whole-number input. The value stays a string so a blank field means "not set". */
export function ManualNumberField<T extends FieldValues>({
  label,
  name,
  control,
  disabled,
}: FieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="text-sm font-medium">{label}</FormLabel>
          <FormControl>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              disabled={disabled}
              className="h-8 tabular-nums"
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ManualTextareaField<T extends FieldValues>({
  label,
  name,
  control,
  disabled,
  rows = 4,
}: FieldProps<T> & { rows?: number }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="text-sm font-medium">{label}</FormLabel>
          <FormControl>
            <Textarea
              rows={rows}
              disabled={disabled}
              className="resize-none text-sm"
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ManualSwitchField<T extends FieldValues>({
  label,
  name,
  control,
  disabled,
}: FieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
          <FormLabel className="text-sm font-medium">{label}</FormLabel>
          <FormControl>
            <Switch
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

/** Blank → undefined (leave unchanged), otherwise the integer. */
export function parseOptionalInt(value: string | undefined): number | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? undefined : Number(trimmed);
}

/** Integer in 0..999999, or blank. */
export const WHOLE_NUMBER_PATTERN = /^\d{1,6}$/;
