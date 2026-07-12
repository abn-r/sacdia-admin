"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Save, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  assignmentUserName,
  responsibilityLabel,
  toAssignableClassCounselorOptions,
} from "@/components/clubs/class-counselor-shared";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
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

type SectionOption = {
  club_section_id: number;
  club_type_id: number;
  name: string;
  typeName: string;
};

type EnrichedAssignment = ClassCounselorAssignment & {
  sectionName: string;
  sectionTypeName: string;
};

interface ResponsablesTabProps {
  clubId: number;
  sections: SectionOption[];
  defaultSectionId?: number;
  initialAssignOpen?: boolean;
  onAssignOpenConsumed?: () => void;
}

function useResponsibilityLabels() {
  const t = useTranslations("clubs.sections.workspace");
  return useMemo(
    () => ({
      primary: t("responsibilityPrimary"),
      assistant: t("responsibilityAssistant"),
      substitute: t("responsibilitySubstitute"),
      fallback: t("responsibilityFallback"),
    }),
    [t],
  );
}

function ResponsibilitySelectItems() {
  const labels = useResponsibilityLabels();
  return (
    <>
      <SelectItem value="primary">{labels.primary}</SelectItem>
      <SelectItem value="substitute">{labels.substitute}</SelectItem>
      <SelectItem value="assistant">{labels.assistant}</SelectItem>
    </>
  );
}

function responsibilityBadgeVariant(
  type: string,
): "soft-success" | "soft-warning" | "secondary" {
  if (type === "primary") return "soft-success";
  if (type === "substitute") return "soft-warning";
  return "secondary";
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
  className,
  variant,
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: React.ReactNode;
  className?: string;
  variant?: "default" | "ghost" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={variant}
      disabled={disabled || pending}
      className={className}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </Button>
  );
}

function RevalidateOnSuccess({
  state,
  clubId,
  onSuccess,
}: {
  state: ClubActionState;
  clubId: number;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!state.success) return;
    void queryClient.invalidateQueries({
      queryKey: ["club-section-counselor-assignments", clubId],
    });
    router.refresh();
    onSuccess();
  }, [clubId, onSuccess, queryClient, router, state.success]);

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

function AssignForm({
  clubId,
  sections,
  defaultSectionId,
  onAssigned,
}: {
  clubId: number;
  sections: SectionOption[];
  defaultSectionId?: number;
  onAssigned?: () => void;
}) {
  const t = useTranslations("clubs.sections.workspace");
  const responsibilityLabels = useResponsibilityLabels();
  const [sectionId, setSectionId] = useState(
    String(defaultSectionId ?? sections[0]?.club_section_id ?? ""),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const selectedSection = sections.find(
    (section) => String(section.club_section_id) === sectionId,
  );

  const membersQuery = useQueries({
    queries: sections.map((section) => ({
      queryKey: ["club-section-members", clubId, section.club_section_id, "class-counselors"],
      queryFn: () =>
        listNormalizedClubSectionMembers(clubId, section.club_section_id, { active: true }),
      staleTime: 30_000,
      enabled: section.club_section_id === Number(sectionId),
    })),
  });

  const classesQuery = useQuery({
    queryKey: ["classes", "club-type", selectedSection?.club_type_id, "class-counselors-form"],
    queryFn: () =>
      listClasses({ clubTypeId: selectedSection!.club_type_id, limit: 100 }),
    staleTime: 60_000,
    enabled: selectedSection != null,
  });

  const boundAction = createClassCounselorAssignmentAction.bind(
    null,
    clubId,
    Number(sectionId),
  );
  const [state, action] = useActionState(boundAction, {} as ClubActionState);

  const assignableMembers = useMemo(() => {
    const activeQuery = membersQuery.find(
      (_, index) => sections[index]?.club_section_id === Number(sectionId),
    );
    return toAssignableClassCounselorOptions(activeQuery?.data ?? []);
  }, [membersQuery, sectionId, sections]);

  const classes = useMemo(() => unwrapClasses(classesQuery.data), [classesQuery.data]);
  const disabled =
    sections.length === 0 ||
    classes.length === 0 ||
    assignableMembers.length === 0 ||
    !sectionId;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const person = String(formData.get("user_id") ?? "");
    const className = String(formData.get("class_id") ?? "");
    const role = String(formData.get("responsibility_type") ?? "primary");
    const justification = String(formData.get("exception_reason") ?? "").trim();
    const exceptional = formData.get("exceptional") === "true";

    if (!person || !className) {
      setFormError(t("formErrorRequired"));
      return;
    }

    if ((role === "substitute" || exceptional) && !justification) {
      setFormError(t("formErrorJustification"));
      return;
    }

    void action(formData);
  }

  useEffect(() => {
    if (defaultSectionId != null) {
      setSectionId(String(defaultSectionId));
    }
  }, [defaultSectionId]);

  useEffect(() => {
    if (!state.success) return;
    setFormError(null);
    setResetKey((value) => value + 1);
    onAssigned?.();
  }, [onAssigned, state.success]);

  return (
    <>
      {formError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <RevalidateOnSuccess
        state={state}
        clubId={clubId}
        onSuccess={() => setFormError(null)}
      />
      <form
        key={`${sectionId}-${resetKey}`}
        onSubmit={handleSubmit}
        className="grid gap-3 sm:grid-cols-2"
        noValidate
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sectionSelect">{t("labelSection")}</Label>
          <Select
            value={sectionId}
            onValueChange={setSectionId}
            disabled={sections.length === 0}
          >
            <SelectTrigger id="sectionSelect">
              <SelectValue placeholder={t("placeholderSection")} />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem
                  key={section.club_section_id}
                  value={String(section.club_section_id)}
                >
                  {section.name} · {section.typeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="personSelect">{t("labelResponsible")}</Label>
          <Select name="user_id" disabled={disabled}>
            <SelectTrigger id="personSelect">
              <SelectValue placeholder={t("placeholderResponsible")} />
            </SelectTrigger>
            <SelectContent>
              {assignableMembers.map((member) => (
                <SelectItem key={member.value} value={member.value}>
                  {member.label} · {responsibilityLabel(member.role, responsibilityLabels)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="classSelect">{t("labelClass")}</Label>
          <Select name="class_id" disabled={disabled}>
            <SelectTrigger id="classSelect">
              <SelectValue placeholder={t("placeholderClass")} />
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
          <Label htmlFor="roleSelect">{t("labelResponsibility")}</Label>
          <Select name="responsibility_type" defaultValue="primary" disabled={disabled}>
            <SelectTrigger id="roleSelect">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <ResponsibilitySelectItems />
            </SelectContent>
          </Select>
        </div>

        <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
          <Checkbox name="exceptional" value="true" />
          {t("labelExceptional")}
        </label>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="justificationInput">{t("labelJustification")}</Label>
          <Input
            id="justificationInput"
            name="exception_reason"
            placeholder={t("placeholderJustification")}
            disabled={disabled}
          />
        </div>

        <SubmitButton
          disabled={disabled}
          icon={<UserPlus className="size-4" />}
          className="sm:col-span-2"
        >
          {t("assignButton")}
        </SubmitButton>
      </form>
    </>
  );
}

function AssignResponsableDialog({
  open,
  onOpenChange,
  clubId,
  sections,
  defaultSectionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  sections: SectionOption[];
  defaultSectionId?: number;
}) {
  const t = useTranslations("clubs.sections.workspace");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-normal">{t("assignFormTitle")}</DialogTitle>
          <DialogDescription>{t("assignFormLead")}</DialogDescription>
        </DialogHeader>
        <AssignForm
          clubId={clubId}
          sections={sections}
          defaultSectionId={defaultSectionId}
          onAssigned={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AssignmentEditActions({
  assignment,
  clubId,
  sectionId,
}: {
  assignment: ClassCounselorAssignment;
  clubId: number;
  sectionId: number;
}) {
  const t = useTranslations("clubs.sections.workspace");
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
  const [updateState, submitUpdate] = useActionState(updateAction, {} as ClubActionState);
  const [revokeState, submitRevoke] = useActionState(revokeAction, {} as ClubActionState);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5">
          <Pencil className="size-3.5" />
          {t("editAssignment")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-3 text-sm font-medium">{t("editAssignmentTitle")}</p>
        <div className="grid gap-3">
          <RevalidateOnSuccess state={updateState} clubId={clubId} onSuccess={() => {}} />
          <RevalidateOnSuccess state={revokeState} clubId={clubId} onSuccess={() => {}} />
          <form action={submitUpdate} className="grid gap-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor={`role-${assignment.assignment_id}`}>
                {t("labelResponsibility")}
              </Label>
              <Select
                name="responsibility_type"
                defaultValue={assignment.responsibility_type}
              >
                <SelectTrigger id={`role-${assignment.assignment_id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <ResponsibilitySelectItems />
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                name="exceptional"
                value="true"
                defaultChecked={assignment.exceptional}
              />
              {t("labelExceptional")}
            </label>
            <div className="space-y-1.5">
              <Label htmlFor={`justification-${assignment.assignment_id}`}>
                {t("labelJustification")}
              </Label>
              <Input
                id={`justification-${assignment.assignment_id}`}
                name="exception_reason"
                defaultValue={assignment.exception_reason ?? ""}
                placeholder={t("placeholderJustification")}
              />
            </div>
            <SubmitButton icon={<Save className="size-3.5" />}>{t("saveAssignment")}</SubmitButton>
          </form>
          <form action={submitRevoke}>
            <SubmitButton variant="outline" icon={<Trash2 className="size-3.5" />}>
              {t("revokeAssignment")}
            </SubmitButton>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ClubResponsablesTab({
  clubId,
  sections,
  defaultSectionId,
  initialAssignOpen = false,
  onAssignOpenConsumed,
}: ResponsablesTabProps) {
  const t = useTranslations("clubs.sections.workspace");
  const tDetail = useTranslations("clubs.pages.v2.detail");
  const responsibilityLabels = useResponsibilityLabels();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [assignOpen, setAssignOpen] = useState(initialAssignOpen);

  useEffect(() => {
    if (!initialAssignOpen) return;
    setAssignOpen(true);
    onAssignOpenConsumed?.();
  }, [initialAssignOpen, onAssignOpenConsumed]);

  const assignmentQueries = useQueries({
    queries: sections.map((section) => ({
      queryKey: [
        "club-section-counselor-assignments",
        clubId,
        section.club_section_id,
      ],
      queryFn: () =>
        listClassCounselorAssignments(clubId, section.club_section_id, {
          active: true,
        }),
      staleTime: 30_000,
    })),
  });

  const isLoading = assignmentQueries.some((query) => query.isLoading);

  const assignments = useMemo(() => {
    const items: EnrichedAssignment[] = [];
    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index];
      const rows = assignmentQueries[index]?.data;
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        items.push({
          ...row,
          sectionName: section.name,
          sectionTypeName: section.typeName,
        });
      }
    }
    return items;
  }, [assignmentQueries, sections]);

  const clubTypes = useMemo(
    () => Array.from(new Set(sections.map((section) => section.typeName))),
    [sections],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return assignments.filter((item) => {
      const matchesType =
        typeFilter === "todos" || item.sectionTypeName === typeFilter;
      const haystack = [
        item.sectionName,
        item.sectionTypeName,
        assignmentUserName(item),
        item.classes?.name,
        responsibilityLabel(item.responsibility_type, responsibilityLabels),
        item.exception_reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesType && haystack.includes(needle);
    });
  }, [assignments, responsibilityLabels, search, typeFilter]);

  const hasActiveFilters = search.trim() !== "" || typeFilter !== "todos";

  if (sections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-normal leading-none">
            {tDetail("tabResponsables")}
          </CardTitle>
          <CardDescription>{tDetail("noSectionsForResponsables")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl font-normal leading-none">
            {tDetail("tabResponsables")}
          </CardTitle>
          <CardDescription className="max-w-prose leading-snug">
            {t("responsablesLead")}
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-8 w-full md:w-72">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                id="assignmentSearch"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchAssignmentsPlaceholder")}
                aria-label={t("searchAssignments")}
              />
            </InputGroup>
            <Button type="button" size="sm" onClick={() => setAssignOpen(true)}>
              <UserPlus className="size-4" />
              {t("assignResponsible")}
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger size="sm" className="w-[220px]" id="clubTypeFilter">
                <span className="text-muted-foreground">{t("filterClubType")}:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  <SelectItem value="todos">{t("filterAll")}</SelectItem>
                  {clubTypes.map((typeName) => (
                    <SelectItem key={typeName} value={typeName}>
                      {typeName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("todos");
                }}
              >
                <X className="size-3.5" aria-hidden="true" />
                {t("clearFilters")}
              </Button>
            ) : null}
          </div>

          <div className="px-4">
            <p className="text-sm text-muted-foreground tabular-nums">
              {filtered.length !== assignments.length
                ? t("assignmentsFilteredSummary", {
                    shown: filtered.length,
                    total: assignments.length,
                  })
                : t("assignmentsSummary", { count: filtered.length })}
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-2 px-4 pb-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full rounded-md" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 pb-2">
              <EmptyState
                icon={hasActiveFilters ? Search : Users}
                variant={hasActiveFilters ? "no-results" : "default"}
                title={
                  hasActiveFilters ? t("emptyFilteredTitle") : t("emptyAssignmentsTitle")
                }
                description={
                  hasActiveFilters
                    ? t("emptyFilteredDescription")
                    : t("emptyAssignmentsDescription")
                }
              >
                <Button type="button" size="sm" onClick={() => setAssignOpen(true)}>
                  <UserPlus className="size-4" />
                  {t("assignResponsible")}
                </Button>
              </EmptyState>
            </div>
          ) : (
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colSection")}</TableHead>
                    <TableHead>{t("colClass")}</TableHead>
                    <TableHead>{t("colResponsible")}</TableHead>
                    <TableHead>{t("colRole")}</TableHead>
                    <TableHead>{t("colJustification")}</TableHead>
                    <TableHead className="text-right">{t("colAction")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={`row-${item.assignment_id}`}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.sectionName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.sectionTypeName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.classes?.name ?? item.class_id}
                      </TableCell>
                      <TableCell className="text-sm">
                        {assignmentUserName(item)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={responsibilityBadgeVariant(item.responsibility_type)}>
                          {responsibilityLabel(
                            item.responsibility_type,
                            responsibilityLabels,
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {item.exception_reason?.trim() || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <AssignmentEditActions
                          assignment={item}
                          clubId={clubId}
                          sectionId={item.club_section_id}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>
          )}
        </CardContent>
      </Card>

      <AssignResponsableDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        clubId={clubId}
        sections={sections}
        defaultSectionId={defaultSectionId}
      />
    </>
  );
}
