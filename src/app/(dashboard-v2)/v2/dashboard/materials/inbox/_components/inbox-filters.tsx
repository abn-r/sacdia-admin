"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MaterialEstado } from "@/lib/types/materials";

const ESTADO_OPTIONS: { value: MaterialEstado | "all"; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "en_revision", label: "En revisión" },
  { value: "aprobada", label: "Aprobada" },
  { value: "pagada", label: "Pagada" },
  { value: "entregada", label: "Entregada" },
  { value: "cancelada", label: "Cancelada" },
];

interface InboxFiltersProps {
  currentEstado: MaterialEstado | "all";
  currentQ: string;
}

export function InboxFilters({ currentEstado, currentQ }: InboxFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 on filter change
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  function handleEstadoChange(value: string) {
    updateParam("estado", value);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.trim();
    updateParam("q", value || undefined);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Estado filter */}
      <Select
        value={currentEstado}
        onValueChange={handleEstadoChange}
      >
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          {ESTADO_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 w-[220px] pl-8"
          placeholder="Buscar folio o director..."
          defaultValue={currentQ}
          onChange={handleSearchChange}
        />
      </div>
    </div>
  );
}
