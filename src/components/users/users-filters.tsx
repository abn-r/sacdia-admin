"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScopeMeta } from "@/lib/api/admin-users";

interface UsersFiltersProps {
  scope?: ScopeMeta | null;
}

export function UsersFilters({ scope }: UsersFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => updateParam("search", value), 400);
    },
    [updateParam],
  );

  const currentRole = searchParams.get("role") ?? "all";
  const currentActive = searchParams.get("active") ?? "all";

  const isScopeLocked = scope?.type === "UNION" || scope?.type === "LOCAL_FIELD";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          defaultValue={searchParams.get("search") ?? ""}
          className="pl-9"
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <Select value={currentRole} onValueChange={(v) => updateParam("role", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Rol" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los roles</SelectItem>
          <SelectItem value="super_admin">Super Admin</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="coordinator">Coordinator</SelectItem>
        </SelectContent>
      </Select>

      <Select value={currentActive} onValueChange={(v) => updateParam("active", v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="true">Activos</SelectItem>
          <SelectItem value="false">Inactivos</SelectItem>
        </SelectContent>
      </Select>

      {isScopeLocked && (
        <div className="text-xs text-muted-foreground">
          Alcance: <span className="font-medium">{scope?.type}</span>
        </div>
      )}
    </div>
  );
}
