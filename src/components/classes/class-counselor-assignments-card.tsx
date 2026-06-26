"use client";

import { useActionState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, Loader2, Save, Trash2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listClasses, type ProgressiveClass } from "@/lib/api/classes";
import {
  listClassCounselorAssignments,
  listNormalizedClubSectionMembers,
  type ClassCounselorAssignment,
} from "@/lib/api/clubs";
import {
  createClassCounselorAssignmentAction,
  revokeClassCounselorAssignmentAction,
  updateClassCounselorAssignmentAction,
  type ClubActionState,
} from "@/lib/clubs/actions";

import {
  assignmentUserName,
  responsibilityLabel,
  toAssignableClassCounselorOptions,
  type AssignableCounselorOption,
} from "@/components/clubs/class-counselor-shared";

export { toAssignableClassCounselorOptions };

interface ClassCounselorAssignmentsCardProps {
  clubId: number;
  sectionId: number;
  clubTypeId: number;
  sectionName: string;
}

function unwrapClasses(payload: unknown): ProgressiveClass[] {
  if (Array.isArray(payload)) return payload as ProgressiveClass[];
  if (!payload || typeof payload !== "object") return [];

  const data = (payload as { data?: unknown }).data;
  if (Array.isArray(data)) return data as ProgressiveClass[];

  return [];
}

function SubmitButton({
  children,
  disabled,
  icon,
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={disabled || pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </Button>
  );
}

function RevalidateOnSuccess({
  state,
  clubId,
  sectionId,
}: {
  state: ClubActionState;
  clubId: number;
  sectionId: number;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!state.success) return;

    void queryClient.invalidateQueries({
      queryKey: ["class-counselor-assignments", clubId, sectionId],
    });
    router.refresh();
  }, [clubId, queryClient, router, sectionId, state.success]);

  if (state.error) {
    return (
      <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="rounded-md bg-success/10 px-3 py-2 text-xs text-success">
        {state.success}
      </p>
    );
  }

  return null;
}

function CreateAssignmentForm({
  clubId,
  sectionId,
  classes,
  assignableMembers,
  isLoading,
}: {
  clubId: number;
  sectionId: number;
  classes: ProgressiveClass[];
  assignableMembers: AssignableCounselorOption[];
  isLoading: boolean;
}) {
  const boundAction = createClassCounselorAssignmentAction.bind(
    null,
    clubId,
    sectionId,
  );
  const [state, action] = useActionState(boundAction, {} as ClubActionState);
  const disabled = isLoading || classes.length === 0 || assignableMembers.length === 0;

  return (
    <form action={action} className="space-y-3 rounded-lg border bg-background p-3" noValidate>
      <RevalidateOnSuccess state={state} clubId={clubId} sectionId={sectionId} />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Responsable</Label>
          <Select name="user_id" disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar persona" />
            </SelectTrigger>
            <SelectContent>
              {assignableMembers.map((member) => (
                <SelectItem key={member.value} value={member.value}>
                  {member.label} · {responsibilityLabel(member.role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Clase</Label>
          <Select name="class_id" disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar clase" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((klass) => (
                <SelectItem key={klass.class_id} value={String(klass.class_id)}>
                  {klass.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Responsabilidad</Label>
          <Select
            name="responsibility_type"
            defaultValue="primary"
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Principal</SelectItem>
              <SelectItem value="assistant">Apoyo</SelectItem>
              <SelectItem value="substitute">Suplente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-end">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="exceptional" value="true" />
          Asignación excepcional
        </label>
        <div className="space-y-1.5">
          <Label>Justificación</Label>
          <Input
            name="exception_reason"
            placeholder="Requerida si es segunda clase"
            disabled={disabled}
          />
        </div>
        <SubmitButton disabled={disabled} icon={<UserPlus className="size-4" />}>
          Asignar clase
        </SubmitButton>
      </div>
    </form>
  );
}

function AssignmentRow({
  assignment,
  clubId,
  sectionId,
}: {
  assignment: ClassCounselorAssignment;
  clubId: number;
  sectionId: number;
}) {
  const t = useTranslations("classes.counselorAssignments");
  const updateAction = updateClassCounselorAssignmentAction.bind(
    null,
    clubId,
    sectionId,
    assignment.assignment_id,
  );
  const revokeAction = revokeClassCounselorAssignmentAction.bind(
    null,
    clubId,
    sectionId,
    assignment.assignment_id,
  );
  const [updateState, submitUpdate] = useActionState(
    updateAction,
    {} as ClubActionState,
  );
  const [revokeState, submitRevoke] = useActionState(
    revokeAction,
    {} as ClubActionState,
  );

  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{assignmentUserName(assignment)}</p>
          <p className="text-xs text-muted-foreground">
            {assignment.classes?.name ?? `Clase ${assignment.class_id}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={assignment.responsibility_type === "primary" ? "default" : "outline"}>
            {responsibilityLabel(assignment.responsibility_type)}
          </Badge>
          {assignment.exceptional && <Badge variant="secondary">Excepcional</Badge>}
        </div>
      </div>

      <RevalidateOnSuccess state={updateState} clubId={clubId} sectionId={sectionId} />
      <RevalidateOnSuccess state={revokeState} clubId={clubId} sectionId={sectionId} />

      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <form action={submitUpdate} className="grid gap-2 md:grid-cols-[180px_auto_minmax(0,1fr)_auto]" noValidate>
          <Select
            name="responsibility_type"
            defaultValue={assignment.responsibility_type}
          >
            <SelectTrigger aria-label={t("responsibilityAriaLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Principal</SelectItem>
              <SelectItem value="assistant">Apoyo</SelectItem>
              <SelectItem value="substitute">Suplente</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              name="exceptional"
              value="true"
              defaultChecked={assignment.exceptional}
            />
            Excepcional
          </label>
          <Input
            name="exception_reason"
            defaultValue={assignment.exception_reason ?? ""}
            placeholder={t("justificationPlaceholder")}
          />
          <SubmitButton icon={<Save className="size-4" />}>Guardar</SubmitButton>
        </form>

        <form action={submitRevoke}>
          <SubmitButton icon={<Trash2 className="size-4" />}>Revocar</SubmitButton>
        </form>
      </div>
    </div>
  );
}

export function ClassCounselorAssignmentsCard({
  clubId,
  sectionId,
  clubTypeId,
  sectionName,
}: ClassCounselorAssignmentsCardProps) {
  const assignmentsQuery = useQuery({
    queryKey: ["class-counselor-assignments", clubId, sectionId],
    queryFn: () =>
      listClassCounselorAssignments(clubId, sectionId, { active: true }),
    staleTime: 30_000,
  });

  const membersQuery = useQuery({
    queryKey: ["club-section-members", clubId, sectionId, "class-counselors"],
    queryFn: () =>
      listNormalizedClubSectionMembers(clubId, sectionId, { active: true }),
    staleTime: 30_000,
  });

  const classesQuery = useQuery({
    queryKey: ["classes", "club-type", clubTypeId, "class-counselors"],
    queryFn: () => listClasses({ clubTypeId, limit: 100 }),
    staleTime: 60_000,
  });

  const assignments = Array.isArray(assignmentsQuery.data)
    ? assignmentsQuery.data
    : [];
  const classes = useMemo(
    () => unwrapClasses(classesQuery.data),
    [classesQuery.data],
  );
  const assignableMembers = useMemo(
    () => toAssignableClassCounselorOptions(membersQuery.data ?? []),
    [membersQuery.data],
  );
  const isLoading =
    assignmentsQuery.isLoading || membersQuery.isLoading || classesQuery.isLoading;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookOpenCheck className="size-4" />
          Clases asignadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Gestiona qué consejero o secretario acompaña clases progresivas en {sectionName}.
          Instructores no aparecen porque no llevan la trayectoria anual.
        </p>

        {isLoading && (
          <p className="text-xs text-muted-foreground">Cargando asignaciones…</p>
        )}

        {!isLoading && assignments.length === 0 && (
          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            No hay clases asignadas todavía.
          </p>
        )}

        <div className="space-y-2">
          {assignments.map((assignment) => (
            <AssignmentRow
              key={assignment.assignment_id}
              assignment={assignment}
              clubId={clubId}
              sectionId={sectionId}
            />
          ))}
        </div>

        <CreateAssignmentForm
          clubId={clubId}
          sectionId={sectionId}
          classes={classes}
          assignableMembers={assignableMembers}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
