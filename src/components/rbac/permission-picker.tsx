"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, AlertTriangle, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  getPermissionLabel,
  permissionMatchesQuery,
} from "@/lib/auth/permissions";
import {
  getScreenGroupTitle,
  type NavTranslator,
} from "@/lib/auth/screen-catalog/screen-title";
import type { ScreenSurface } from "@/lib/auth/screen-catalog";
import type { Permission } from "@/lib/rbac/types";
import {
  buildPickerGroups,
  isDestructivePermission,
  safeItemsInGroup,
  type PickerBucketId,
  type PickerPermissionRow,
  type PickerScreenGroup,
  type PickerSurfaceFilter,
} from "@/lib/rbac/permission-picker-groups";

const SURFACE_FILTERS: {
  id: PickerSurfaceFilter;
  labelKey:
    | "surfaceAll"
    | "surfaceAdmin"
    | "surfaceApp"
    | "surfaceShared";
}[] = [
  { id: "all", labelKey: "surfaceAll" },
  { id: "admin", labelKey: "surfaceAdmin" },
  { id: "app", labelKey: "surfaceApp" },
  { id: "shared", labelKey: "surfaceShared" },
];

const BUCKET_LABEL: Record<
  PickerBucketId,
  | "bucketView"
  | "bucketRoutes"
  | "bucketActions"
  | "bucketSensitive"
  | "bucketDestructive"
> = {
  view: "bucketView",
  routes: "bucketRoutes",
  actions: "bucketActions",
  sensitive: "bucketSensitive",
  destructive: "bucketDestructive",
};

export interface PermissionPickerProps {
  permissions: Permission[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** Screen ids to expand on first paint. Groups with selected perms also open. */
  defaultOpenGroups?: Set<string>;
}

function triState(selectedCount: number, total: number): boolean | "indeterminate" {
  if (total === 0 || selectedCount === 0) return false;
  if (selectedCount === total) return true;
  return "indeterminate";
}

function SurfaceChips({ surfaces }: { surfaces: ScreenSurface[] }) {
  const t = useTranslations("rbac.permissionPicker");
  if (surfaces.length < 2) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {surfaces.includes("admin") ? (
        <Badge variant="outline">{t("surfaceAdmin")}</Badge>
      ) : null}
      {surfaces.includes("app") ? (
        <Badge variant="outline">{t("surfaceApp")}</Badge>
      ) : null}
    </span>
  );
}

function PermissionRow({
  row,
  selected,
  onToggleOne,
}: {
  row: PickerPermissionRow;
  selected: Set<string>;
  onToggleOne: (id: string) => void;
}) {
  const t = useTranslations("rbac");
  const tPicker = useTranslations("rbac.permissionPicker");
  const name = row.permission.permission_name;
  const destructive = isDestructivePermission(name);
  const label = getPermissionLabel(t, name);

  return (
    <div className="flex items-start gap-2.5 py-1">
      <Checkbox
        id={`perm-${row.permission.permission_id}`}
        checked={selected.has(row.permission.permission_id)}
        onCheckedChange={() => onToggleOne(row.permission.permission_id)}
        className="mt-0.5 shrink-0"
      />
      <label
        htmlFor={`perm-${row.permission.permission_id}`}
        className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-sm leading-relaxed cursor-pointer"
      >
        {destructive ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle
                className="size-3.5 shrink-0 text-destructive"
                aria-label={tPicker("destructiveAction")}
              />
            </TooltipTrigger>
            <TooltipContent>{tPicker("destructiveAction")}</TooltipContent>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm text-foreground">{label}</span>
          </TooltipTrigger>
          <TooltipContent>
            {tPicker("permissionKey", { key: name })}
          </TooltipContent>
        </Tooltip>
        <SurfaceChips surfaces={row.surfaces} />
      </label>
    </div>
  );
}

function PickerAccordion({
  group,
  title,
  selected,
  onToggleIds,
  onToggleOne,
  defaultOpen,
  searchQuery,
}: {
  group: PickerScreenGroup;
  title: string;
  selected: Set<string>;
  onToggleIds: (ids: string[], checked: boolean) => void;
  onToggleOne: (id: string) => void;
  defaultOpen?: boolean;
  searchQuery: string;
}) {
  const t = useTranslations("rbac");
  const tPicker = useTranslations("rbac.permissionPicker");
  const [open, setOpen] = useState(defaultOpen ?? false);
  const query = searchQuery.trim();

  const visibleBuckets = useMemo(() => {
    if (!query) return group.buckets;
    return group.buckets
      .map((bucket) => ({
        ...bucket,
        items: bucket.items.filter((row) =>
          permissionMatchesQuery(t, row.permission, query),
        ),
      }))
      .filter((bucket) => bucket.items.length > 0);
  }, [group.buckets, query, t]);

  const visibleItems = useMemo(
    () => visibleBuckets.flatMap((bucket) => bucket.items),
    [visibleBuckets],
  );

  const safe = safeItemsInGroup({
    ...group,
    items: visibleItems,
    buckets: visibleBuckets,
  });
  const safeSelected = safe.filter((row) =>
    selected.has(row.permission.permission_id),
  );
  const selectedInGroup = visibleItems.filter((row) =>
    selected.has(row.permission.permission_id),
  );
  const hasMatch = query.length > 0 && visibleItems.length > 0;
  const isOpen = open || hasMatch;

  if (query && visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="flex w-full items-center gap-3 px-4 py-2.5 transition-colors duration-150 ease-out hover:bg-muted/40">
        {safe.length > 0 ? (
          <Checkbox
            id={`group-${group.screenId}`}
            checked={triState(safeSelected.length, safe.length)}
            onCheckedChange={(checked) =>
              onToggleIds(
                safe.map((row) => row.permission.permission_id),
                checked === true,
              )
            }
            aria-label={tPicker("selectAllInGroup", { resource: title })}
            className="shrink-0"
          />
        ) : (
          <span className="size-4 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={isOpen}
          aria-controls={`group-${group.screenId}-content`}
        >
          <span className="flex-1 text-sm font-medium text-foreground">
            {title}
          </span>
          {group.requiredRoles.length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle
                  className="size-3.5 shrink-0 text-warning"
                  aria-label={tPicker("requiresRoles", {
                    roles: group.requiredRoles.join(", "),
                  })}
                />
              </TooltipTrigger>
              <TooltipContent>
                {tPicker("requiresRoles", {
                  roles: group.requiredRoles.join(", "),
                })}
              </TooltipContent>
            </Tooltip>
          ) : null}
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {tPicker("countLabel", {
              selected: selectedInGroup.length,
              total: visibleItems.length || group.items.length,
            })}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </div>

      {isOpen ? (
        <div
          id={`group-${group.screenId}-content`}
          className="space-y-3 border-t border-border/60 bg-muted/20 px-4 py-3"
        >
          {visibleBuckets.map((bucket) => {
            const bucketSelected = bucket.items.filter((row) =>
              selected.has(row.permission.permission_id),
            );
            return (
              <div key={bucket.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`bucket-${group.screenId}-${bucket.id}`}
                    checked={triState(
                      bucketSelected.length,
                      bucket.items.length,
                    )}
                    onCheckedChange={(checked) =>
                      onToggleIds(
                        bucket.items.map((row) => row.permission.permission_id),
                        checked === true,
                      )
                    }
                    aria-label={tPicker("selectAllInBucket", {
                      bucket: tPicker(BUCKET_LABEL[bucket.id]),
                      resource: title,
                    })}
                    className="shrink-0"
                  />
                  <label
                    htmlFor={`bucket-${group.screenId}-${bucket.id}`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {tPicker(BUCKET_LABEL[bucket.id])}
                  </label>
                </div>
                <div className="pl-6">
                  {bucket.items.map((row) => (
                    <PermissionRow
                      key={row.permission.permission_id}
                      row={row}
                      selected={selected}
                      onToggleOne={onToggleOne}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function PermissionPicker({
  permissions,
  selected,
  onChange,
  defaultOpenGroups,
}: PermissionPickerProps) {
  const t = useTranslations("rbac");
  const tPicker = useTranslations("rbac.permissionPicker");
  const tNav = useTranslations("nav.items") as unknown as NavTranslator;
  const [search, setSearch] = useState("");
  const [surface, setSurface] = useState<PickerSurfaceFilter>("all");

  const activePermissions = useMemo(
    () => permissions.filter((permission) => permission.active !== false),
    [permissions],
  );

  const otherLabel = tPicker("otherGroup");
  const groups = useMemo(
    () => buildPickerGroups(activePermissions, surface),
    [activePermissions, surface],
  );

  const handleToggleOne = useCallback(
    (id: string) => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange(next);
    },
    [selected, onChange],
  );

  const handleToggleIds = useCallback(
    (ids: string[], checked: boolean) => {
      const next = new Set(selected);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      onChange(next);
    },
    [selected, onChange],
  );

  const hasSearchMatches = useMemo(() => {
    if (!search.trim()) return groups.length > 0;
    const q = search.toLowerCase();
    return groups.some((group) =>
      group.items.some((row) => permissionMatchesQuery(t, row.permission, q)),
    );
  }, [search, groups, t]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tPicker("searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-8"
            />
          </div>
          <p className="shrink-0 text-sm text-muted-foreground">
            <span className="font-medium tabular-nums text-foreground">
              {selected.size}
            </span>{" "}
            {tPicker("ofLabel")}{" "}
            <span className="font-medium tabular-nums text-foreground">
              {activePermissions.length}
            </span>{" "}
            {tPicker("selectedLabel")}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">
            {tPicker("surfaceFilterLabel")}
          </p>
          <ToggleGroup
            type="single"
            value={surface}
            onValueChange={(value) => {
              if (value) setSurface(value as PickerSurfaceFilter);
            }}
            variant="outline"
            size="sm"
            spacing={0}
            className="bg-background"
            aria-label={tPicker("surfaceFilterLabel")}
          >
            {SURFACE_FILTERS.map((item) => (
              <ToggleGroupItem key={item.id} value={item.id}>
                {tPicker(item.labelKey)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">{tPicker("surfaceHint")}</p>
        </div>
      </div>

      {!hasSearchMatches ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {search.trim()
              ? tPicker("noMatches", { query: search })
              : tPicker("noSurfaceMatches")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const title = getScreenGroupTitle(
              tNav,
              {
                screenId: group.screenId,
                screen: group.screen,
                requiredRoles: group.requiredRoles,
                items: group.items,
              },
              otherLabel,
            );
            const hasSelected = group.items.some((row) =>
              selected.has(row.permission.permission_id),
            );
            return (
              <PickerAccordion
                key={group.screenId}
                group={group}
                title={title}
                selected={selected}
                onToggleIds={handleToggleIds}
                onToggleOne={handleToggleOne}
                defaultOpen={
                  defaultOpenGroups?.has(group.screenId) || hasSelected
                }
                searchQuery={search}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
