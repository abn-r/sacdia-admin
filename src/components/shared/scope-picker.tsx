"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Check, ChevronDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ScopeOption {
  id: string;
  name: string;
  hint?: string;
  group?: string;
}

export interface ScopePickerProps {
  /** Selected scope; undefined means "all". */
  value?: { id: string; name: string; level?: string };
  options: ScopeOption[];
  /** Receives the chosen id, or null for "all". */
  onChange: (id: string | null) => void;
  allLabel?: string;
  loading?: boolean;
  className?: string;
}

export function ScopePicker({ value, options, onChange, allLabel, loading = false, className }: ScopePickerProps) {
  const t = useTranslations("shared.kit.scope");
  const [open, setOpen] = useState(false);
  const isAll = !value;
  const allText = allLabel ?? t("all");

  const groups = new Map<string, ScopeOption[]>();
  for (const option of options) {
    const key = option.group ?? "";
    groups.set(key, [...(groups.get(key) ?? []), option]);
  }

  const pick = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("change")}
          aria-busy={loading || undefined}
          className={cn(
            "inline-flex h-8 max-w-full items-center gap-2 rounded-full border px-3 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
            isAll
              ? "border-primary/20 bg-primary-soft text-primary-soft-foreground"
              : "bg-background hover:bg-muted",
            className,
          )}
        >
          <Building2 className="size-4 shrink-0" aria-hidden />
          <span className="truncate font-semibold">{value ? value.name : allText}</span>
          {value?.level && <span className="truncate text-muted-foreground">{value.level}</span>}
          <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder={t("search")} />
          <CommandList>
            <CommandEmpty>{t("empty")}</CommandEmpty>
            <CommandGroup>
              <CommandItem value={`__all__ ${allText}`} onSelect={() => pick(null)}>
                <span className="flex-1 truncate">{allText}</span>
                {isAll && <Check className="size-4" aria-hidden />}
              </CommandItem>
            </CommandGroup>
            {[...groups.entries()].map(([group, items]) => (
              <CommandGroup key={group || "_"} heading={group || undefined}>
                {items.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={`${option.name} ${option.hint ?? ""} ${option.id}`}
                    onSelect={() => pick(option.id)}
                  >
                    <span className="flex-1 truncate">{option.name}</span>
                    {option.hint && <span className="text-muted-foreground text-xs">{option.hint}</span>}
                    {value?.id === option.id && <Check className="size-4" aria-hidden />}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
