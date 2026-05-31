"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, Loader2 } from "lucide-react";
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
  succeedClubSectionDirectorAction,
  type ClubActionState,
} from "@/lib/clubs/actions";
import { usePermissions } from "@/lib/auth/use-permissions";

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

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={disabled || pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ArrowRightLeft className="size-4" />
      )}
      Cambiar director
    </Button>
  );
}

export function SectionDirectorSuccessionCard({
  clubId,
  sectionId,
  sectionName,
}: SectionDirectorSuccessionCardProps) {
  const router = useRouter();
  const { hasRole } = usePermissions();
  const canUseSuccession = hasRole("director-lf") || hasRole("assistant-lf");
  const boundAction = succeedClubSectionDirectorAction.bind(null, clubId, sectionId);
  const [state, action] = useActionState(boundAction, {} as ClubActionState);

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
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  const members = membersQuery.data ?? [];
  const currentDirector = useMemo(
    () => members.find((member) => normalizeRole(member) === "director") ?? null,
    [members],
  );
  const successorCandidates = useMemo(
    () =>
      dedupeMembers(members).filter(
        (member) => member.user_id !== currentDirector?.user_id,
      ),
    [currentDirector?.user_id, members],
  );

  const years = yearsQuery.data ?? [];
  const defaultYear = years.find((year) => year.active) ?? years[0] ?? null;
  const defaultStartDate =
    defaultYear?.start_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  if (!canUseSuccession) {
    return null;
  }

  const isLoading = membersQuery.isLoading || yearsQuery.isLoading;
  const isDisabled =
    isLoading ||
    !currentDirector?.assignment_id ||
    successorCandidates.length === 0 ||
    !defaultYear;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Sucesión anual de director</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Cierra al director actual de {sectionName} y crea el nuevo director
          para el año eclesiástico seleccionado. Historial sí; dos activos no.
        </p>

        {state.error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="rounded-md bg-success/10 px-3 py-2 text-xs text-success">
            {state.success}
          </p>
        )}

        {!isLoading && !currentDirector && (
          <p className="text-xs text-muted-foreground">
            Esta sección todavía no tiene un director activo para cerrar.
          </p>
        )}

        <form action={action} className="grid gap-3 sm:grid-cols-2" noValidate>
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
            <Select name="successor_user_id" disabled={isDisabled}>
              <SelectTrigger id={`successor-${sectionId}`}>
                <SelectValue placeholder="Seleccioná miembro" />
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
              disabled={isDisabled}
            >
              <SelectTrigger id={`year-${sectionId}`}>
                <SelectValue placeholder="Seleccioná año" />
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
              disabled={isDisabled}
            />
          </div>

          <div className="flex items-end justify-end">
            <SubmitButton disabled={isDisabled} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
