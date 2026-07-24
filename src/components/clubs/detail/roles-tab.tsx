"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useRoleLabel } from "@/lib/auth/role-labels";
import {
  assignClassCounselorAction,
  assignClubRoleAction,
  revokeClassCounselorAction,
  revokeClubRoleAction,
  type DetailActionState,
} from "@/lib/clubs/detail-actions";
import type { ClubDetailPayload } from "@/lib/clubs/types";
import {
  listClassCounselorAssignments,
  type ClassCounselorAssignment,
} from "@/lib/api/clubs";
import { listClasses } from "@/lib/api/classes";

interface RolesTabProps {
  data: ClubDetailPayload;
}

function assignmentUserName(assignment: ClassCounselorAssignment) {
  const user = assignment.users;
  if (!user) return assignment.user_id;
  return [user.name, user.paternal_last_name, user.maternal_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function memberInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function MemberIdentity({
  name,
  pictureUrl,
}: {
  name: string;
  pictureUrl?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="sm">
        {pictureUrl ? <AvatarImage src={pictureUrl} alt={name} /> : null}
        <AvatarFallback>{memberInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="truncate font-medium">{name}</span>
    </div>
  );
}

export function RolesTab({ data }: RolesTabProps) {
  const t = useTranslations("clubs.detail.roles");
  const translateRole = useRoleLabel();
  const router = useRouter();

  const sections = data.sectionMemberGroups;
  const [sectionId, setSectionId] = useState(String(sections[0]?.sectionId ?? ""));
  const [roleUserId, setRoleUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [counselorSectionId, setCounselorSectionId] = useState(
    String(sections[0]?.sectionId ?? ""),
  );
  const [counselorUserId, setCounselorUserId] = useState("");
  const [counselorClassId, setCounselorClassId] = useState("");
  const [responsibilityType, setResponsibilityType] = useState("primary");
  const [counselorAssignments, setCounselorAssignments] = useState<
    ClassCounselorAssignment[]
  >([]);
  const [classes, setClasses] = useState<Array<{ class_id: number; name: string }>>(
    [],
  );
  const [loadingCounselors, setLoadingCounselors] = useState(false);

  const [roleState, roleAction] = useActionState(assignClubRoleAction, {} as DetailActionState);
  const [revokeRoleState, revokeRoleAction] = useActionState(
    revokeClubRoleAction,
    {} as DetailActionState,
  );
  const [counselorState, counselorAction] = useActionState(
    assignClassCounselorAction,
    {} as DetailActionState,
  );
  const [revokeCounselorState, revokeCounselorAction] = useActionState(
    revokeClassCounselorAction,
    {} as DetailActionState,
  );

  const selectedSection = sections.find(
    (section) => String(section.sectionId) === sectionId,
  );
  const counselorSection = sections.find(
    (section) => String(section.sectionId) === counselorSectionId,
  );

  const allAssignments = useMemo(
    () =>
      sections.flatMap((section) =>
        section.members.map((member) => ({
          ...member,
          sectionName: section.sectionName,
          sectionId: section.sectionId,
        })),
      ),
    [sections],
  );

  useEffect(() => {
    if (!roleState.ok && !revokeRoleState.ok && !counselorState.ok && !revokeCounselorState.ok) {
      return;
    }
    router.refresh();
  }, [roleState.ok, revokeRoleState.ok, counselorState.ok, revokeCounselorState.ok, router]);

  useEffect(() => {
    const parsedSectionId = Number(counselorSectionId);
    if (!parsedSectionId) {
      setCounselorAssignments([]);
      setClasses([]);
      return;
    }

    let cancelled = false;
    setLoadingCounselors(true);

    Promise.all([
      listClassCounselorAssignments(data.clubId, parsedSectionId, { active: true }),
      counselorSection
        ? listClasses({ clubTypeId: counselorSection.clubTypeId, limit: 100 })
        : Promise.resolve([]),
    ])
      .then(([assignmentsPayload, classesPayload]) => {
        if (cancelled) return;
        const assignments = Array.isArray(assignmentsPayload)
          ? assignmentsPayload
          : Array.isArray((assignmentsPayload as { data?: unknown }).data)
            ? ((assignmentsPayload as { data: ClassCounselorAssignment[] }).data)
            : [];
        const classRows = Array.isArray(classesPayload)
          ? classesPayload
          : Array.isArray((classesPayload as { data?: unknown }).data)
            ? ((classesPayload as { data: Array<{ class_id: number; name: string }> }).data)
            : [];
        setCounselorAssignments(assignments);
        setClasses(classRows.map((row) => ({ class_id: row.class_id, name: row.name })));
      })
      .finally(() => {
        if (!cancelled) setLoadingCounselors(false);
      });

    return () => {
      cancelled = true;
    };
  }, [counselorSectionId, counselorSection, data.clubId]);

  const actionMessage =
    roleState.error ||
    roleState.success ||
    revokeRoleState.error ||
    revokeRoleState.success ||
    counselorState.error ||
    counselorState.success ||
    revokeCounselorState.error ||
    revokeCounselorState.success;

  return (
    <div className="space-y-6">
      {actionMessage ? (
        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{actionMessage}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("clubRolesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.canManageRoles ? (
            <section
              aria-labelledby="assign-club-role-heading"
              className="space-y-4 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4"
            >
              <div className="space-y-1">
                <h3 id="assign-club-role-heading" className="text-sm font-medium">
                  {t("assignRoleTitle")}
                </h3>
                <CardDescription>{t("assignRoleDescription")}</CardDescription>
              </div>
              <form action={roleAction} className="grid gap-3 md:grid-cols-4">
              <input type="hidden" name="club_id" value={data.clubId} />
              <input
                type="hidden"
                name="ecclesiastical_year_id"
                value={data.currentYearId ?? ""}
              />
              <input
                type="hidden"
                name="start_date"
                value={new Date().toISOString().slice(0, 10)}
              />
              <div className="space-y-1">
                <Label>{t("sectionLabel")}</Label>
                <Select value={sectionId} onValueChange={setSectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("sectionLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.sectionId} value={String(section.sectionId)}>
                        {section.sectionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="section_id" value={sectionId} />
              </div>
              <div className="space-y-1">
                <Label>{t("memberLabel")}</Label>
                <Select value={roleUserId} onValueChange={setRoleUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("memberLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedSection?.members ?? []).map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="user_id" value={roleUserId} />
              </div>
              <div className="space-y-1">
                <Label>{t("roleLabel")}</Label>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("roleLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {data.clubRoles.map((role) => (
                      <SelectItem key={role.role_id} value={role.role_id}>
                        {translateRole(role.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="role_id" value={roleId} />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={!data.currentYearId || !roleUserId || !roleId}>
                  <UserPlus className="size-4" />
                  {t("assignRole")}
                </Button>
              </div>
            </form>
            </section>
          ) : null}

          <section aria-labelledby="club-role-assignments-heading" className="space-y-3">
            <div className="space-y-1">
              <h3 id="club-role-assignments-heading" className="text-sm font-medium">
                {t("assignmentsTitle")}
              </h3>
            </div>
            <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("memberLabel")}</TableHead>
                <TableHead>{t("sectionLabel")}</TableHead>
                <TableHead>{t("roleLabel")}</TableHead>
                {data.canManageRoles ? <TableHead className="w-[80px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={data.canManageRoles ? 4 : 3} className="text-muted-foreground">
                    {t("noAssignments")}
                  </TableCell>
                </TableRow>
              ) : (
                allAssignments.map((member) => (
                  <TableRow key={`${member.sectionId}-${member.user_id}-${member.assignment_id ?? member.role}`}>
                    <TableCell>
                      <MemberIdentity
                        name={member.name}
                        pictureUrl={member.picture_url}
                      />
                    </TableCell>
                    <TableCell>{member.sectionName}</TableCell>
                    <TableCell>
                      {translateRole(member.role ?? member.role_display_name)}
                    </TableCell>
                    {data.canManageRoles && member.assignment_id ? (
                      <TableCell>
                        <form action={revokeRoleAction}>
                          <input type="hidden" name="club_id" value={data.clubId} />
                          <input type="hidden" name="assignment_id" value={member.assignment_id} />
                          <Button type="submit" variant="ghost" size="icon" className="size-8">
                            <Trash2 className="size-4" />
                          </Button>
                        </form>
                      </TableCell>
                    ) : data.canManageRoles ? (
                      <TableCell />
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("counselorsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.canManageRoles ? (
            <section
              aria-labelledby="assign-counselor-heading"
              className="space-y-4 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4"
            >
              <div className="space-y-1">
                <h3 id="assign-counselor-heading" className="text-sm font-medium">
                  {t("assignCounselorTitle")}
                </h3>
                <CardDescription>{t("assignCounselorDescription")}</CardDescription>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("sectionLabel")}</Label>
                  <Select value={counselorSectionId} onValueChange={setCounselorSectionId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("sectionLabel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.sectionId} value={String(section.sectionId)}>
                          {section.sectionName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <form action={counselorAction} className="grid gap-3 md:grid-cols-4">
              <input type="hidden" name="club_id" value={data.clubId} />
              <input type="hidden" name="section_id" value={counselorSectionId} />
              <input
                type="hidden"
                name="ecclesiastical_year_id"
                value={data.currentYearId ?? ""}
              />
              <div className="space-y-1">
                <Label>{t("classLabel")}</Label>
                <Select value={counselorClassId} onValueChange={setCounselorClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("classLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((row) => (
                      <SelectItem key={row.class_id} value={String(row.class_id)}>
                        {row.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="class_id" value={counselorClassId} />
              </div>
              <div className="space-y-1">
                <Label>{t("memberLabel")}</Label>
                <Select value={counselorUserId} onValueChange={setCounselorUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("memberLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(counselorSection?.members ?? []).map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="user_id" value={counselorUserId} />
              </div>
              <div className="space-y-1">
                <Label>{t("responsibilityLabel")}</Label>
                <Select value={responsibilityType} onValueChange={setResponsibilityType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">{t("responsibilityPrimary")}</SelectItem>
                    <SelectItem value="assistant">{t("responsibilityAssistant")}</SelectItem>
                    <SelectItem value="substitute">{t("responsibilitySubstitute")}</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="responsibility_type" value={responsibilityType} />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={!counselorUserId || !counselorClassId}
                >
                  <UserPlus className="size-4" />
                  {t("assignCounselor")}
                </Button>
              </div>
            </form>
            </section>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("sectionLabel")}</Label>
                <Select value={counselorSectionId} onValueChange={setCounselorSectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("sectionLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.sectionId} value={String(section.sectionId)}>
                        {section.sectionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <section aria-labelledby="counselors-list-heading" className="space-y-3">
            <div className="space-y-1">
              <h3 id="counselors-list-heading" className="text-sm font-medium">
                {t("counselorsListTitle")}
              </h3>
            </div>

          {loadingCounselors ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("loadingCounselors")}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("classLabel")}</TableHead>
                  <TableHead>{t("memberLabel")}</TableHead>
                  <TableHead>{t("responsibilityLabel")}</TableHead>
                  {data.canManageRoles ? <TableHead className="w-[80px]" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {counselorAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={data.canManageRoles ? 4 : 3} className="text-muted-foreground">
                      {t("noCounselors")}
                    </TableCell>
                  </TableRow>
                ) : (
                  counselorAssignments.map((assignment) => (
                    <TableRow key={assignment.assignment_id}>
                      <TableCell>{assignment.classes?.name ?? assignment.class_id}</TableCell>
                      <TableCell>
                        <MemberIdentity
                          name={assignmentUserName(assignment)}
                          pictureUrl={assignment.users?.user_image}
                        />
                      </TableCell>
                      <TableCell>
                        {assignment.responsibility_type === "primary"
                          ? t("responsibilityPrimary")
                          : assignment.responsibility_type === "assistant"
                            ? t("responsibilityAssistant")
                            : t("responsibilitySubstitute")}
                      </TableCell>
                      {data.canManageRoles ? (
                        <TableCell>
                          <form action={revokeCounselorAction}>
                            <input type="hidden" name="club_id" value={data.clubId} />
                            <input
                              type="hidden"
                              name="assignment_id"
                              value={assignment.assignment_id}
                            />
                            <Button type="submit" variant="ghost" size="icon" className="size-8">
                              <Trash2 className="size-4" />
                            </Button>
                          </form>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
