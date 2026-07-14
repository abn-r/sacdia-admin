"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { LocalFieldOption } from "@/lib/types/materials";

interface LocalFieldPickerProps {
  currentLocalFieldId: number | null;
  localFields: LocalFieldOption[];
  label?: string;
  placeholder?: string;
}

export function LocalFieldPicker({
  currentLocalFieldId,
  localFields,
  label = "Campo local",
  placeholder = "Seleccioná un campo local",
}: LocalFieldPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const onChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("local_field_id", value);
      } else {
        params.delete("local_field_id");
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
        <Select
          value={currentLocalFieldId != null ? String(currentLocalFieldId) : ""}
          onValueChange={onChange}
        >
          <SelectTrigger className="h-9 w-[280px]">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {localFields.map((lf) => (
              <SelectItem
                key={lf.local_field_id}
                value={String(lf.local_field_id)}
              >
                {lf.abbreviation ? `${lf.name} (${lf.abbreviation})` : lf.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
