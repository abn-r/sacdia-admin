"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { listAdminHonorsCatalog } from "@/lib/api/admin-honors-catalog";
import type { CamporeeEventHonor } from "@/lib/api/camporee-events";
import type { AdminHonor } from "@/lib/catalogs/honors/types";

const MAX_EVENT_HONORS = 20;

function toOption(honor: AdminHonor): CamporeeEventHonor {
  return {
    honor_id: honor.honor_id,
    name: honor.name,
    honor_image: honor.honor_image,
    material_url: honor.material_url,
    honors_category_id: honor.honors_category_id,
    skill_level: honor.skill_level,
    active: honor.active,
  };
}

type EventHonorsPickerProps = {
  value: CamporeeEventHonor[];
  onChange: (next: CamporeeEventHonor[]) => void;
};

export function EventHonorsPicker({ value, onChange }: EventHonorsPickerProps) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<CamporeeEventHonor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAdminHonorsCatalog()
      .then((rows) => {
        if (cancelled) return;
        setCatalog(
          rows
            .filter((row) => row.active !== false)
            .map(toOption)
            .sort((a, b) => a.name.localeCompare(b.name, "es")),
        );
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar el catálogo de especialidades.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  const selectedIds = useMemo(
    () => new Set(value.map((item) => item.honor_id)),
    [value],
  );

  function addHonor(honor: CamporeeEventHonor) {
    if (selectedIds.has(honor.honor_id)) return;
    if (value.length >= MAX_EVENT_HONORS) return;
    onChange([...value, honor]);
    setOpen(false);
  }

  function removeHonor(honorId: number) {
    onChange(value.filter((item) => item.honor_id !== honorId));
  }

  const available = catalog.filter((honor) => !selectedIds.has(honor.honor_id));

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name="honor_ids"
        value={JSON.stringify(value.map((item) => item.honor_id))}
      />

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((honor) => (
            <li
              key={honor.honor_id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2"
            >
              {honor.honor_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={honor.honor_image}
                  alt=""
                  className="size-8 shrink-0 object-contain"
                />
              ) : (
                <span className="size-8 shrink-0 rounded-md border bg-muted" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {honor.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => removeHonor(honor.honor_id)}
                aria-label={`Quitar ${honor.name}`}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={value.length >= MAX_EVENT_HONORS}
            className="w-full justify-between font-normal"
          >
            {value.length >= MAX_EVENT_HONORS
              ? "Límite de 20 especialidades"
              : "Buscar especialidad"}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Nombre de la especialidad" />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Cargando catálogo
                </div>
              ) : error ? (
                <p className="px-3 py-6 text-sm text-destructive">{error}</p>
              ) : (
                <>
                  <CommandEmpty>No hay especialidades con ese nombre.</CommandEmpty>
                  <CommandGroup>
                    {available.map((honor) => (
                      <CommandItem
                        key={honor.honor_id}
                        value={`${honor.name} ${honor.honor_id}`}
                        onSelect={() => addHonor(honor)}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            selectedIds.has(honor.honor_id)
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        {honor.honor_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={honor.honor_image}
                            alt=""
                            className="mr-2 size-6 object-contain"
                          />
                        ) : null}
                        <span className="truncate">{honor.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        Opcional. Los participantes podrán consultar el PDF de cada especialidad
        en la app. No se inscribe ni se exige aprobación.
      </p>
    </div>
  );
}
