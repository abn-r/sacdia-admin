"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { clearUsersFilterParams } from "@/lib/users/list-filters";
import type { ScopeMeta } from "@/lib/api/admin-users";
import { useRoleLabel } from "@/lib/auth/role-labels";
import {
  withCurrentRoleFilterOption,
  type UsersRoleFilterOption,
} from "@/lib/admin-users/role-filter-options";
import { usersScopeTypeMessageKey } from "@/lib/admin-users/scope-type-label";

interface UsersFiltersProps {
  scope?: ScopeMeta | null;
  roles: UsersRoleFilterOption[];
}

function sortByTranslatedLabel(
  options: UsersRoleFilterOption[],
  translateRole: (roleName: string) => string,
): UsersRoleFilterOption[] {
  return [...options].sort((a, b) =>
    translateRole(a.value).localeCompare(translateRole(b.value), undefined, {
      sensitivity: "base",
    }),
  );
}

export function UsersFilters({ scope, roles }: UsersFiltersProps) {
  const t = useTranslations("users");
  const tList = useTranslations("people.users.list");
  const translateRole = useRoleLabel();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const clearFilters = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchInputRef.current) searchInputRef.current.value = "";
    const params = clearUsersFilterParams(new URLSearchParams(searchParams.toString()));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  const currentRole = searchParams.get("role") ?? "all";
  const currentActive = searchParams.get("active") ?? "all";

  const roleOptions = useMemo(
    () => withCurrentRoleFilterOption(roles, currentRole === "all" ? undefined : currentRole),
    [currentRole, roles],
  );

  const globalRoles = useMemo(
    () => sortByTranslatedLabel(
      roleOptions.filter((role) => role.category === "GLOBAL"),
      translateRole,
    ),
    [roleOptions, translateRole],
  );

  const clubRoles = useMemo(
    () => sortByTranslatedLabel(
      roleOptions.filter((role) => role.category === "CLUB"),
      translateRole,
    ),
    [roleOptions, translateRole],
  );

  const hasFilters =
    Boolean(searchParams.get("search")) || currentRole !== "all" || currentActive !== "all";

  const isScopeLocked =
    scope?.type === "UNION" || scope?.type === "LOCAL_FIELD" || scope?.type === "DIVISION";
  const scopeTypeKey = usersScopeTypeMessageKey(scope?.type);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-0 flex-1 basis-56">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={tList("searchLabel")}
          placeholder={t("filters.searchPlaceholder")}
          ref={searchInputRef}
          defaultValue={searchParams.get("search") ?? ""}
          className="pl-9"
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <Select value={currentRole} onValueChange={(v) => updateParam("role", v)}>
        <SelectTrigger className="w-full sm:w-[200px]" aria-label={t("filters.rolePlaceholder")}>
          <SelectValue placeholder={t("filters.rolePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allRoles")}</SelectItem>
          {globalRoles.length > 0 ? (
            <SelectGroup>
              <SelectLabel>{t("filters.roleGroups.global")}</SelectLabel>
              {globalRoles.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {translateRole(role.value)}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
          {clubRoles.length > 0 ? (
            <SelectGroup>
              <SelectLabel>{t("filters.roleGroups.club")}</SelectLabel>
              {clubRoles.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {translateRole(role.value)}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
        </SelectContent>
      </Select>

      <Select value={currentActive} onValueChange={(v) => updateParam("active", v)}>
        <SelectTrigger className="w-full sm:w-[140px]" aria-label={t("filters.statusPlaceholder")}>
          <SelectValue placeholder={t("filters.statusPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.statusAll")}</SelectItem>
          <SelectItem value="true">{t("filters.statusActive")}</SelectItem>
          <SelectItem value="false">{t("filters.statusInactive")}</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
          {tList("clearFilters")}
        </Button>
      ) : null}

      {isScopeLocked && scopeTypeKey ? (
        <div className="text-xs text-muted-foreground">
          {t("filters.scopeLabel")}{" "}
          <span className="font-medium">{t(scopeTypeKey)}</span>
        </div>
      ) : null}
    </div>
  );
}
