"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Trash2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/clubs/class-counselor-shared";

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
}: {
  clubId: number;
  sections: SectionOption[];
  defaultSectionId?: number;
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
    if (!state.success) return;
    setFormError(null);
    setResetKey((value) => value + 1);
  }, [state.success]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("assignFormTitle")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("assignFormLead")}</p>
      </CardHeader>
      <CardContent>
        {formError && (
          <p
            role="alert"
            className="mb-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm"
          >
            {formError}
          </p>
        )}
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
      </CardContent>
    </Card>
  );
}

function AssignmentEditRow({
  assignment,
  clubId,
  sectionId,
}: {
  assignment: ClassCounselorAssignment;
  clubId: number;
  sectionId: number;
}) {
  const t = useTranslations("clubs.sections.workspace");
  const responsibilityLabels = useResponsibilityLabels();
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
  <>
      <RevalidateOnSuccess state={updateState} clubId={clubId} onSuccess={() => {}} />
      <RevalidateOnSuccess state={revokeState} clubId={clubId} onSuccess={() => {}} />
      <form action={submitUpdate} className="flex flex-wrap items-center justify-end gap-2" noValidate>
        <Select
          name="responsibility_type"
          defaultValue={assignment.responsibility_type}
        >
          <SelectTrigger className="h-8 w-[130px]" aria-label={t("labelResponsibility")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <ResponsibilitySelectItems />
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs">
          <Checkbox
            name="exceptional"
            value="true"
            defaultChecked={assignment.exceptional}
          />
          {t("labelExceptionalShort")}
        </label>
        <Input
          name="exception_reason"
          defaultValue={assignment.exception_reason ?? ""}
          placeholder={t("placeholderJustification")}
          className="h-8 min-w-[140px] flex-1"
        />
        <SubmitButton icon={<Save className="size-3.5" />}>{t("saveAssignment")}</SubmitButton>
      </form>
      <form action={submitRevoke}>
        <SubmitButton variant="ghost" icon={<Trash2 className="size-3.5" />}>
          {t("revokeAssignment")}
        </SubmitButton>
      </form>
    </>
  );
}

interface ClubSectionResponsablesPanelProps {
  clubId: number;
  sections: SectionOption[];
  defaultSectionId?: number;
}

export function ClubSectionResponsablesPanel({
  clubId,
  sections,
  defaultSectionId,
}: ClubSectionResponsablesPanelProps) {
  const t = useTranslations("clubs.sections.workspace");
  const responsibilityLabels = useResponsibilityLabels();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");

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
  }, [assignments, search, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_220px_auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="assignmentSearch">{t("searchAssignments")}</Label>
          <Input
            id="assignmentSearch"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchAssignmentsPlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clubTypeFilter">{t("filterClubType")}</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger id="clubTypeFilter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">{t("filterAll")}</SelectItem>
              {clubTypes.map((typeName) => (
                <SelectItem key={typeName} value={typeName}>
                  {typeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSearch("");
            setTypeFilter("todos");
          }}
        >
          {t("clearFilters")}
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)] xl:items-start">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">
              {t("responsablesTitle")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("responsablesLead")}</p>
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground">{t("loadingAssignments")}</p>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
              {t("emptyAssignments")}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border">
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
                    <TableCell>{item.sectionName}</TableCell>
                    <TableCell>{item.classes?.name ?? item.class_id}</TableCell>
                    <TableCell>{assignmentUserName(item)}</TableCell>
                    <TableCell>{responsibilityLabel(item.responsibility_type, responsibilityLabels)}</TableCell>
                    <TableCell>{item.exception_reason?.trim() || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-2">
                        <AssignmentEditRow
                          assignment={item}
                          clubId={clubId}
                          sectionId={item.club_section_id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <AssignForm
          clubId={clubId}
          sections={sections}
          defaultSectionId={defaultSectionId}
        />
      </div>
    </div>
  );
}
