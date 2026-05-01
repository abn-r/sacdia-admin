"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, AlertTriangle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/rbac/types";

const DESTRUCTIVE_KEYWORDS = ["delete", "destroy", "purge", "remove"];

function isDestructivePermission(name: string): boolean {
  return DESTRUCTIVE_KEYWORDS.some((kw) => name.toLowerCase().includes(kw));
}

// ─── Group type ──────────────────────────────────────────────────────────────
type PermissionGroup = {
  resource: string;
  permissions: Permission[];
};

function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const map = new Map<string, Permission[]>();

  for (const p of permissions) {
    const resource = p.permission_name.split(":")[0] ?? "other";
    if (!map.has(resource)) map.set(resource, []);
    map.get(resource)!.push(p);
  }

  return Array.from(map.entries())
    .map(([resource, perms]) => ({ resource, permissions: perms }))
    .sort((a, b) => a.resource.localeCompare(b.resource));
}

// ─── Accordion group row ─────────────────────────────────────────────────────
interface AccordionGroupProps {
  group: PermissionGroup;
  selected: Set<string>;
  onToggleAll: (resource: string, ids: string[], checked: boolean) => void;
  onToggleOne: (id: string) => void;
  defaultOpen?: boolean;
  searchQuery: string;
}

function AccordionGroup({
  group,
  selected,
  onToggleAll,
  onToggleOne,
  defaultOpen,
  searchQuery,
}: AccordionGroupProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  // Filter by search query
  const visiblePerms = useMemo(() => {
    if (!searchQuery.trim()) return group.permissions;
    const q = searchQuery.toLowerCase();
    return group.permissions.filter(
      (p) =>
        p.permission_name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false),
    );
  }, [group.permissions, searchQuery]);

  // Auto-open when there is a search match
  const hasMatch = visiblePerms.length > 0 && searchQuery.trim().length > 0;

  // Determine tri-state
  const selectedInGroup = group.permissions.filter((p) => selected.has(p.permission_id));
  const allSelected = selectedInGroup.length === group.permissions.length;
  const someSelected = selectedInGroup.length > 0 && !allSelected;

  const handleGroupCheck = (checked: boolean | "indeterminate") => {
    const ids = group.permissions.map((p) => p.permission_id);
    onToggleAll(group.resource, ids, checked === true);
  };

  const isOpen = open || hasMatch;

  if (searchQuery.trim() && visiblePerms.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      {/* Trigger — checkbox and toggle are siblings, NOT nested buttons */}
      <div className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
        {/* Tri-state checkbox for bulk toggle — standalone button */}
        <Checkbox
          id={`group-${group.resource}`}
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={handleGroupCheck}
          aria-label={`Seleccionar todos los permisos de ${group.resource}`}
          className="shrink-0"
        />

        {/* Toggle button — only this portion opens/closes the accordion */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={isOpen}
          aria-controls={`group-${group.resource}-content`}
        >
          <span className="flex-1 text-sm font-semibold uppercase tracking-wider text-foreground">
            {group.resource}
          </span>

          <span className="shrink-0 text-xs text-muted-foreground font-mono">
            [{selectedInGroup.length}/{group.permissions.length}]
          </span>

          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Content */}
      {isOpen && (
        <div
          id={`group-${group.resource}-content`}
          className="border-t border-border/60 bg-muted/20 px-4 py-2 space-y-1"
        >
          {visiblePerms.map((perm) => {
            const destructive = isDestructivePermission(perm.permission_name);
            return (
              <div key={perm.permission_id} className="flex items-start gap-2.5 py-1">
                <Checkbox
                  id={`perm-${perm.permission_id}`}
                  checked={selected.has(perm.permission_id)}
                  onCheckedChange={() => onToggleOne(perm.permission_id)}
                  className="mt-0.5 shrink-0"
                />
                <label
                  htmlFor={`perm-${perm.permission_id}`}
                  className="flex flex-1 flex-wrap items-center gap-1.5 cursor-pointer text-sm leading-relaxed"
                >
                  {destructive && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle
                          className="size-3.5 shrink-0 text-destructive"
                          aria-label="Acción destructiva"
                        />
                      </TooltipTrigger>
                      <TooltipContent>Acción destructiva</TooltipContent>
                    </Tooltip>
                  )}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                    {perm.permission_name}
                  </code>
                  {perm.description && (
                    <span className="text-xs text-muted-foreground">{perm.description}</span>
                  )}
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────
export interface PermissionPickerProps {
  permissions: Permission[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** Groups pre-expanded by default (used in edit mode: groups with selected perms) */
  defaultOpenGroups?: Set<string>;
}

export function PermissionPicker({
  permissions,
  selected,
  onChange,
  defaultOpenGroups,
}: PermissionPickerProps) {
  const [search, setSearch] = useState("");

  const activePermissions = useMemo(
    () => permissions.filter((p) => p.active !== false),
    [permissions],
  );

  const groups = useMemo(() => groupPermissions(activePermissions), [activePermissions]);

  const handleToggleOne = useCallback(
    (id: string) => {
      const next = new Set(selected);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onChange(next);
    },
    [selected, onChange],
  );

  const handleToggleAll = useCallback(
    (_resource: string, ids: string[], checked: boolean) => {
      const next = new Set(selected);
      for (const id of ids) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      onChange(next);
    },
    [selected, onChange],
  );

  const hasSearchMatches = useMemo(() => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return groups.some((g) =>
      g.permissions.some(
        (p) =>
          p.permission_name.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false),
      ),
    );
  }, [search, groups]);

  return (
    <div className="space-y-3">
      {/* Search + counter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar permisos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <p className="text-sm text-muted-foreground shrink-0">
          <span className="font-medium tabular-nums text-foreground">{selected.size}</span> de{" "}
          <span className="font-medium tabular-nums text-foreground">{activePermissions.length}</span> permisos seleccionados
        </p>
      </div>

      {/* Groups */}
      {!hasSearchMatches ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Sin permisos que coincidan con «{search}»
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const hasSelected = group.permissions.some((p) => selected.has(p.permission_id));
            const isDefaultOpen = defaultOpenGroups?.has(group.resource) || hasSelected;
            return (
              <AccordionGroup
                key={group.resource}
                group={group}
                selected={selected}
                onToggleAll={handleToggleAll}
                onToggleOne={handleToggleOne}
                defaultOpen={isDefaultOpen}
                searchQuery={search}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
