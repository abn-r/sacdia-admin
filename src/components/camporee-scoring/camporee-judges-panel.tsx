"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, ChevronsUpDown, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/users/user-avatar";
import {
  addCamporeeJudgeAction,
  type CamporeeScoringActionState,
} from "@/lib/camporee-scoring/actions";
import type {
  CamporeeJudge,
  CamporeeJudgeCandidate,
  CamporeeJudgeEligibilityReason,
} from "@/lib/api/camporee-scoring";
import { cn } from "@/lib/utils";

export interface CamporeeJudgesPanelProps {
  camporeeId: number;
  isUnionCamporee?: boolean;
  judges: CamporeeJudge[];
  judgeCandidates?: CamporeeJudgeCandidate[];
  judgeCandidatesError?: string | null;
  canEdit?: boolean;
}

const CLUB_ROLE_NAMES = new Set([
  "director",
  "deputy-director",
  "secretary",
  "treasurer",
  "secretary-treasurer",
  "counselor",
  "instructor",
  "member",
]);

const ROLE_LABELS: Record<string, string> = {
  "super-admin": "Super Admin",
  admin: "Admin",
  coordinator: "Coordinador",
  "zone-coordinator": "Coordinador de zona",
  "general-coordinator": "Coordinador general",
  pastor: "Pastor",
  "assistant-lf": "Asistente campo local",
  "director-lf": "Director campo local",
  "assistant-union": "Asistente unión",
  "director-union": "Director unión",
  "assistant-dia": "Asistente DIA",
  "director-dia": "Director DIA",
  director: "Director",
  "deputy-director": "Subdirector",
  secretary: "Secretario",
  treasurer: "Tesorero",
  "secretary-treasurer": "Secretario-tesorero",
  counselor: "Consejero",
  instructor: "Instructor",
  member: "Miembro",
  user: "Usuario",
};

const ELIGIBILITY_LABELS: Record<CamporeeJudgeEligibilityReason, string> = {
  adult: "18+",
  pastor_role: "Pastor",
  invested_master_guide: "GM investido",
};

function getUserName(user: CamporeeJudgeCandidate) {
  return (
    user.full_name ||
    [user.name, user.paternal_last_name, user.maternal_last_name]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ") ||
    user.email ||
    "Usuario sin nombre"
  );
}

function formatRole(role: string) {
  return (
    ROLE_LABELS[role] ??
    role
      .split(/[-_]/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function splitRoleAndPositionLabels(user: CamporeeJudgeCandidate) {
  const roles = [...new Set(user.roles ?? [])];
  const positions = roles.filter((role) => CLUB_ROLE_NAMES.has(role));
  const globalRoles = roles.filter((role) => !CLUB_ROLE_NAMES.has(role));

  return {
    roleLabels: (globalRoles.length > 0 ? globalRoles : roles).map(formatRole),
    positionLabels: positions.map(formatRole),
  };
}

function getEligibilityReasons(user: CamporeeJudgeCandidate) {
  return user.camporee_judge_eligibility_reasons ?? [];
}

function isCamporeeJudgeEligible(user: CamporeeJudgeCandidate) {
  return user.camporee_judge_eligible === true || getEligibilityReasons(user).length > 0;
}

function buildSearchText(user: CamporeeJudgeCandidate) {
  const { roleLabels, positionLabels } = splitRoleAndPositionLabels(user);
  return [
    user.user_id,
    user.email,
    getUserName(user),
    ...(user.roles ?? []),
    ...roleLabels,
    ...positionLabels,
    ...getEligibilityReasons(user).map((reason) => ELIGIBILITY_LABELS[reason]),
    user.local_field?.name,
    user.union?.name,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

function JudgeCandidateBadges({
  roleLabels,
  positionLabels,
  eligibilityReasons,
}: {
  roleLabels: string[];
  positionLabels: string[];
  eligibilityReasons: CamporeeJudgeEligibilityReason[];
}) {
  const cargoLabel = positionLabels.length > 0 ? positionLabels.join(", ") : "Sin cargo activo";

  return (
    <div className="mt-1 flex min-w-0 flex-wrap gap-1">
      {eligibilityReasons.map((reason) => (
        <Badge key={reason} variant="secondary" className="max-w-full truncate text-[10px]">
          {ELIGIBILITY_LABELS[reason]}
        </Badge>
      ))}
      {roleLabels.slice(0, 2).map((role) => (
        <Badge key={role} variant="secondary" className="max-w-full truncate text-[10px]">
          Rol: {role}
        </Badge>
      ))}
      <Badge
        variant={positionLabels.length > 0 ? "outline" : "secondary"}
        className="max-w-full truncate text-[10px]"
      >
        Cargo: {cargoLabel}
      </Badge>
    </div>
  );
}

function JudgeCandidateOption({ user }: { user: CamporeeJudgeCandidate }) {
  const name = getUserName(user);
  const { roleLabels, positionLabels } = splitRoleAndPositionLabels(user);
  const eligibilityReasons = getEligibilityReasons(user);

  return (
    <div className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden">
      <UserAvatar src={user.user_image} name={name} email={user.email} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email ?? "Sin correo"}</p>
        <JudgeCandidateBadges
          roleLabels={roleLabels}
          positionLabels={positionLabels}
          eligibilityReasons={eligibilityReasons}
        />
      </div>
    </div>
  );
}

function JudgeCandidateTriggerLabel({ user }: { user: CamporeeJudgeCandidate }) {
  const name = getUserName(user);
  const { roleLabels, positionLabels } = splitRoleAndPositionLabels(user);
  const eligibilityLabel = getEligibilityReasons(user)
    .map((reason) => ELIGIBILITY_LABELS[reason])
    .join(" · ");
  const detail = [
    user.email ?? null,
    roleLabels[0] ? `Rol: ${roleLabels[0]}` : null,
    positionLabels[0] ? `Cargo: ${positionLabels[0]}` : null,
    eligibilityLabel || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
      <UserAvatar src={user.user_image} name={name} email={user.email} size={28} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
    </span>
  );
}

export function CamporeeJudgesPanel({
  camporeeId,
  isUnionCamporee = false,
  judges,
  judgeCandidates = [],
  judgeCandidatesError = null,
  canEdit = false,
}: CamporeeJudgesPanelProps) {
  const [state, formAction] = useActionState<CamporeeScoringActionState, FormData>(
    addCamporeeJudgeAction,
    {},
  );
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [search, setSearch] = useState("");

  const activeJudgeUserIds = useMemo(
    () =>
      new Set(
        judges
          .filter((judge) => judge.active)
          .map((judge) => judge.user_id),
      ),
    [judges],
  );

  const availableCandidates = useMemo(
    () =>
      judgeCandidates.filter(
        (candidate) =>
          isCamporeeJudgeEligible(candidate) &&
          !activeJudgeUserIds.has(candidate.user_id),
      ),
    [activeJudgeUserIds, judgeCandidates],
  );

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return availableCandidates.slice(0, 25);
    }

    return availableCandidates
      .filter((candidate) => buildSearchText(candidate).includes(normalizedSearch))
      .slice(0, 25);
  }, [availableCandidates, search]);

  const selectedUser = useMemo(
    () => availableCandidates.find((candidate) => candidate.user_id === selectedUserId) ?? null,
    [availableCandidates, selectedUserId],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="size-4" />
          Jueces del camporee
          <Badge variant="secondary">{judges.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {judges.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay jueces en el roster.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {judges.map((judge) => (
              <div key={judge.camporee_judge_id} className="rounded-lg border p-3">
                <div className="font-medium">{judge.name || judge.user_id}</div>
                <div className="mt-1 text-xs text-muted-foreground">{judge.user_id}</div>
                <Badge className="mt-2" variant={judge.active ? "secondary" : "outline"}>
                  {judge.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {canEdit && (
          <form action={formAction} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]">
            <input type="hidden" name="camporee_id" value={camporeeId} />
            <input type="hidden" name="is_union" value={isUnionCamporee ? "true" : "false"} />
            <input type="hidden" name="user_id" value={selectedUserId} />
            <div className="space-y-2">
              <Label>Usuario juez</Label>
              <p className="text-xs text-muted-foreground">
                Sólo se listan pastores, usuarios mayores de 18 años o Guías Mayores investidos.
              </p>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-label="Usuario juez"
                    aria-expanded={open}
                    className="h-auto min-h-10 w-full justify-between gap-2 overflow-hidden px-3 py-2 text-left font-normal"
                    disabled={availableCandidates.length === 0}
                  >
                    {selectedUser ? (
                      <JudgeCandidateTriggerLabel user={selectedUser} />
                    ) : (
                      <span className="min-w-0 truncate text-muted-foreground">
                        Seleccionar usuario por nombre, rol o cargo
                      </span>
                    )}
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      value={search}
                      onValueChange={setSearch}
                      placeholder="Buscar por nombre, correo, rol o cargo..."
                    />
                    <CommandList className="max-h-80">
                      <CommandEmpty>No encontramos usuarios con esa búsqueda.</CommandEmpty>
                      <CommandGroup>
                        {filteredCandidates.map((candidate) => (
                          <CommandItem
                            key={candidate.user_id}
                            value={candidate.user_id}
                            onSelect={() => {
                              setSelectedUserId(candidate.user_id);
                              setOpen(false);
                            }}
                            className="min-w-0 items-start gap-2 py-2"
                          >
                            <Check
                              className={cn(
                                "mt-2 size-4 shrink-0",
                                selectedUserId === candidate.user_id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <JudgeCandidateOption user={candidate} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {judgeCandidatesError ? (
                <p className="text-xs text-destructive">{judgeCandidatesError}</p>
              ) : availableCandidates.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No hay usuarios disponibles para agregar al roster.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="judge-notes">Notas</Label>
              <Input id="judge-notes" name="notes" placeholder="Opcional" />
            </div>
            <Button type="submit" className="self-end" disabled={!selectedUserId}>
              Agregar juez
            </Button>
            {state.error && <p className="text-sm text-destructive md:col-span-3">{state.error}</p>}
            {state.success && <p className="text-sm text-emerald-700 md:col-span-3">{state.success}</p>}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
