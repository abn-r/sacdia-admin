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
import type { MaterialCategory } from "@/lib/types/materiales";

interface InventarioFiltersProps {
  currentQ: string;
  currentCat: string;
  categories: MaterialCategory[];
}

export function InventarioFilters({
  currentQ,
  currentCat,
  categories,
}: InventarioFiltersProps) {
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
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  function handleCatChange(value: string) {
    updateParam("cat", value);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.trim();
    updateParam("q", value || undefined);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Category filter */}
      <Select value={currentCat || "all"} onValueChange={handleCatChange}>
        <SelectTrigger className="h-9 w-[200px]">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las categorías</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.slug}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 w-[240px] pl-8"
          placeholder="Buscar por nombre o SKU..."
          defaultValue={currentQ}
          onChange={handleSearchChange}
        />
      </div>
    </div>
  );
}
