"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { listClubMembers } from "@/lib/api/clubs";
import type { ClubSectionMember } from "@/lib/api/clubs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MemberComboboxProps {
  /** Club to scope the member list to */
  clubId: number;
  /** Currently selected user_id (controlled) */
  value: string;
  /** Called with the selected user_id, or empty string when cleared */
  onChange: (userId: string) => void;
  /** Placeholder text shown when nothing is selected */
  placeholder?: string;
  /** Whether the combobox is disabled */
  disabled?: boolean;
  /** user_ids to exclude from the list */
  excludeUserIds?: string[];
  /** Shared member list — pass it in to avoid redundant fetches across multiple instances */
  members?: ClubSectionMember[];
  /** Called when members finish loading (so parent can share the list) */
  onMembersLoaded?: (members: ClubSectionMember[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MemberCombobox({
  clubId,
  value,
  onChange,
  placeholder = "Seleccionar miembro...",
  disabled = false,
  excludeUserIds,
  members: externalMembers,
  onMembersLoaded,
}: MemberComboboxProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<ClubSectionMember[]>(externalMembers ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Load members once when the popover is opened for the first time,
  // unless the parent already provided the list via the `members` prop.
  const loadMembers = useCallback(async () => {
    if (externalMembers !== undefined || hasFetched.current) return;
    hasFetched.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await listClubMembers(clubId);
      setMembers(data);
      onMembersLoaded?.(data);
    } catch {
      setError("No se pudieron cargar los miembros");
    } finally {
      setLoading(false);
    }
  }, [clubId, externalMembers, onMembersLoaded]);

  // Sync if parent provides / updates the external list
  useEffect(() => {
    if (externalMembers !== undefined) {
      setMembers(externalMembers);
    }
  }, [externalMembers]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) loadMembers();
  }

  const filteredMembers = excludeUserIds?.length
    ? members.filter((m) => !excludeUserIds.includes(m.user_id))
    : members;

  const selected = members.find((m) => m.user_id === value) ?? null;

  function handleSelect(memberId: string) {
    onChange(memberId === value ? "" : memberId);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar size="sm">
                {selected.picture_url && (
                  <AvatarImage src={selected.picture_url} alt={selected.name} />
                )}
                <AvatarFallback className="text-[10px]">
                  {getInitials(selected.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">{selected.name}</span>
            </span>
          ) : (
            <span className="truncate text-sm">{placeholder}</span>
          )}

          <span className="ml-2 flex shrink-0 items-center gap-0.5">
            {selected && !disabled && (
              <span
                role="button"
                aria-label="Limpiar seleccion"
                onClick={handleClear}
                className="rounded p-0.5 hover:bg-muted"
              >
                <X className="size-3.5 text-muted-foreground" />
              </span>
            )}
            <ChevronsUpDown className="size-3.5 text-muted-foreground opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar por nombre..." />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Cargando miembros...
              </div>
            )}

            {!loading && error && (
              <div className="py-6 text-center text-sm text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && filteredMembers.length === 0 && (
              <CommandEmpty>Sin miembros disponibles.</CommandEmpty>
            )}

            {!loading && !error && filteredMembers.length > 0 && (
              <CommandGroup>
                {filteredMembers.map((member) => (
                  <CommandItem
                    key={member.user_id}
                    value={`${member.name} ${member.user_id}`}
                    onSelect={() => handleSelect(member.user_id)}
                  >
                    <Avatar size="sm">
                      {member.picture_url && (
                        <AvatarImage
                          src={member.picture_url}
                          alt={member.name}
                        />
                      )}
                      <AvatarFallback className="text-[10px]">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>

                    <span className="truncate">{member.name}</span>

                    <Check
                      className={cn(
                        "ml-auto size-3.5 shrink-0",
                        value === member.user_id ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
