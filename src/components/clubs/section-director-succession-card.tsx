"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listEcclesiasticalYears } from "@/lib/api/catalogs";
import {
  listNormalizedClubSectionMembers,
  type ClubSectionMember,
} from "@/lib/api/clubs";
import {
  assignInitialClubSectionDirectorAction,
  succeedClubSectionDirectorAction,
  type ClubActionState,
} from "@/lib/clubs/actions";
import { usePermissions } from "@/lib/auth/use-permissions";
import { canUseDirectorSuccession } from "@/lib/auth/director-succession";
import { listAdminUsers, type AdminUser } from "@/lib/api/admin-users";
import { getAdminUserDisplayName } from "@/lib/admin-users/display";

interface SectionDirectorSuccessionCardProps {
  clubId: number;
  sectionId: number;
  sectionName: string;
}

function normalizeRole(member: ClubSectionMember) {
  return (member.role ?? member.role_display_name ?? "").trim().toLowerCase();
}

function dedupeMembers(members: ClubSectionMember[]) {
  const byUser = new Map<string, ClubSectionMember>();
  for (const member of members) {
    if (!byUser.has(member.user_id)) {
      byUser.set(member.user_id, member);
    }
  }
  return Array.from(byUser.values());
}

type DirectorCandidate = {
  user_id: string;
  name: string;
  description?: string | null;
};

function toMemberCandidate(member: ClubSectionMember): DirectorCandidate {
  return {
    user_id: member.user_id,
    name: member.name,
    description: member.role_display_name ?? member.role ?? null,
  };
}

function toAdminUserCandidate(user: AdminUser): DirectorCandidate {
  return {
    user_id: user.user_id,
    name: getAdminUserDisplayName(user, {
      deletedAccount: "Cuenta eliminada",
      fallback: user.email ?? user.user_id,
    }),
    description: user.email ?? null,
  };
}

function dedupeCandidates(candidates: DirectorCandidate[]) {
  const byUser = new Map<string, DirectorCandidate>();
  for (const candidate of candidates) {
    if (!byUser.has(candidate.user_id)) {
      byUser.set(candidate.user_id, candidate);
    }
  }
  return Array.from(byUser.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function SubmitButton({
  disabled,
  label,
  mode,
}: {
  disabled: boolean;
  label: string;
  mode: "assign" | "succession";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={disabled || pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : mode === "assign" ? (
        <UserPlus className="size-4" />
      ) : (
        <ArrowRightLeft className="size-4" />
      )}
      {label}
    </Button>
  );
}

export function SectionDirectorSuccessionCard({
  clubId,
  sectionId,
  sectionName,
}: SectionDirectorSuccessionCardProps) {
  const router = useRouter();
  const { roles } = usePermissions();
  const canUseSuccession = canUseDirectorSuccession(roles);
  const boundSuccessionAction = succeedClubSectionDirectorAction.bind(null, clubId, sectionId);
  const boundInitialAction = assignInitialClubSectionDirectorAction.bind(null, clubId, sectionId);
  const [successionState, successionAction] = useActionState(
    boundSuccessionAction,
    {} as ClubActionState,
  );
  const [initialState, initialAction] = useActionState(
    boundInitialAction,
    {} as ClubActionState,
  );

  const membersQuery = useQuery({
    queryKey: ["club-section-members", clubId, sectionId, "director-succession"],
    queryFn: () => listNormalizedClubSectionMembers(clubId, sectionId, { active: true }),
    enabled: canUseSuccession,
    staleTime: 30_000,
  });

  const yearsQuery = useQuery({
    queryKey: ["ecclesiastical-years", "director-succession"],
    queryFn: () => listEcclesiasticalYears(),
    enabled: canUseSuccession,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (initialState.success || successionState.success) {
      router.refresh();
    }
  }, [initialState.success, router, successionState.success]);

  const members = membersQuery.data ?? [];
  const currentDirector = useMemo(
    () => members.find((member) => normalizeRole(member) === "director") ?? null,
    [members],
  );
  const adminUsersQuery = useQuery({
    queryKey: ["admin-users", "director-initial-assignment", clubId, sectionId],
    queryFn: () => listAdminUsers({ active: true, limit: 100, page: 1 }),
    enabled: canUseSuccession && !membersQuery.isLoading && !currentDirector,
    staleTime: 60_000,
  });
  const successorCandidates = useMemo(
    () =>
      dedupeMembers(members).filter(
        (member) => member.user_id !== currentDirector?.user_id,
      ),
    [currentDirector?.user_id, members],
  );
  const initialDirectorCandidates = useMemo(
    () =>
      dedupeCandidates([
        ...dedupeMembers(members).map(toMemberCandidate),
        ...(adminUsersQuery.data?.items ?? []).map(toAdminUserCandidate),
      ]),
    [adminUsersQuery.data?.items, members],
  );

  const years = yearsQuery.data ?? [];
  const defaultYear = years.find((year) => year.active) ?? years[0] ?? null;
  const defaultStartDate =
    defaultYear?.start_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  if (!canUseSuccession) {
    return null;
  }

  const isLoading = membersQuery.isLoading || yearsQuery.isLoading;
  const isInitialAssignment = !isLoading && !currentDirector;
  const activeState = isInitialAssignment ? initialState : successionState;
  const isInitialLoading = isInitialAssignment && adminUsersQuery.isLoading;
  const isInitialDisabled =
    isLoading || isInitialLoading || initialDirectorCandidates.length === 0 || !defaultYear;
  const isSuccessionDisabled =
    isLoading ||
    !currentDirector?.assignment_id ||
    successorCandidates.length === 0 ||
    !defaultYear;
  const title = isInitialAssignment
    ? "Asignar director de sección"
    : "Sucesión anual de director";

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {isInitialAssignment
            ? `Esta sección todavía no tiene director activo. Asigna el primer director de ${sectionName}; después los cambios se hacen por sucesión anual.`
            : `Cierra al director actual de ${sectionName} y crea el nuevo director para el año eclesiástico seleccionado. Historial sí; dos activos no.`}
        </p>

        {activeState.error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {activeState.error}
          </p>
        )}
        {activeState.success && (
          <p className="rounded-md bg-success/10 px-3 py-2 text-xs text-success">
            {activeState.success}
          </p>
        )}

        {!isLoading && !currentDirector && (
          <p className="text-xs text-muted-foreground">
            No hay director activo para cerrar; este formulario crea la primera asignación.
          </p>
        )}

        {isInitialAssignment ? (
          <form action={initialAction} className="grid gap-3 sm:grid-cols-2" noValidate>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Director actual</Label>
              <Input value="Sin director activo" readOnly />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`initial-director-${sectionId}`}>Director</Label>
              <Select name="user_id" disabled={isInitialDisabled}>
                <SelectTrigger id={`initial-director-${sectionId}`}>
                  <SelectValue placeholder="Selecciona usuario" />
                </SelectTrigger>
                <SelectContent>
                  {initialDirectorCandidates.map((candidate) => (
                    <SelectItem key={candidate.user_id} value={candidate.user_id}>
                      {candidate.name}
                      {candidate.description ? ` · ${candidate.description}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isInitialLoading && initialDirectorCandidates.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay usuarios activos disponibles para asignar.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`initial-year-${sectionId}`}>Año eclesiástico</Label>
              <Select
                name="ecclesiastical_year_id"
                defaultValue={defaultYear ? String(defaultYear.ecclesiastical_year_id) : undefined}
                disabled={isInitialDisabled}
              >
                <SelectTrigger id={`initial-year-${sectionId}`}>
                  <SelectValue placeholder="Selecciona año" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem
                      key={year.ecclesiastical_year_id}
                      value={String(year.ecclesiastical_year_id)}
                    >
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`initial-start-date-${sectionId}`}>Fecha de inicio</Label>
              <Input
                id={`initial-start-date-${sectionId}`}
                name="start_date"
                type="date"
                defaultValue={defaultStartDate}
                disabled={isInitialDisabled}
              />
            </div>

            <div className="flex items-end justify-end">
              <SubmitButton
                disabled={isInitialDisabled}
                label="Asignar director"
                mode="assign"
              />
            </div>
          </form>
        ) : (
          <form action={successionAction} className="grid gap-3 sm:grid-cols-2" noValidate>
            <input
              type="hidden"
              name="current_assignment_id"
              value={currentDirector?.assignment_id ?? ""}
            />

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Director actual</Label>
              <Input value={currentDirector?.name ?? "Sin director activo"} readOnly />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`successor-${sectionId}`}>Nuevo director</Label>
              <Select name="successor_user_id" disabled={isSuccessionDisabled}>
                <SelectTrigger id={`successor-${sectionId}`}>
                  <SelectValue placeholder="Selecciona miembro" />
                </SelectTrigger>
                <SelectContent>
                  {successorCandidates.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`year-${sectionId}`}>Año eclesiástico</Label>
              <Select
                name="ecclesiastical_year_id"
                defaultValue={defaultYear ? String(defaultYear.ecclesiastical_year_id) : undefined}
                disabled={isSuccessionDisabled}
              >
                <SelectTrigger id={`year-${sectionId}`}>
                  <SelectValue placeholder="Selecciona año" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem
                      key={year.ecclesiastical_year_id}
                      value={String(year.ecclesiastical_year_id)}
                    >
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`start-date-${sectionId}`}>Fecha de inicio</Label>
              <Input
                id={`start-date-${sectionId}`}
                name="start_date"
                type="date"
                defaultValue={defaultStartDate}
                disabled={isSuccessionDisabled}
              />
            </div>

            <div className="flex items-end justify-end">
              <SubmitButton
                disabled={isSuccessionDisabled}
                label="Cambiar director"
                mode="succession"
              />
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
