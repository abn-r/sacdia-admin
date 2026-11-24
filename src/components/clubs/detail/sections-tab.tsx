"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { LayoutGrid } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { Segmented } from "@/components/shared/segmented";
import { Button } from "@/components/ui/button";
import { AssignPositionDialog } from "@/components/clubs/detail/assign-position-dialog";
import type { ClubDetailYearLabels } from "@/components/clubs/detail/club-detail-view";
import { ContinuationsSheet } from "@/components/clubs/detail/continuations-sheet";
import { DesignateDirectorDialog } from "@/components/clubs/detail/designate-director-dialog";
import { SectionBlock } from "@/components/clubs/detail/section-block";
import { SectionPositions } from "@/components/clubs/detail/section-positions";
import { SucceedDirectorDialog } from "@/components/clubs/detail/succeed-director-dialog";
import { useContinuations } from "@/components/clubs/detail/use-continuations";
import { useDetailAction } from "@/components/clubs/detail/use-detail-action";
import { useToastError } from "@/lib/feedback/toast-retry";
import { listClasses } from "@/lib/api/classes";
import { listClassCounselorAssignments, type ClassCounselorAssignment } from "@/lib/api/clubs";
import { useRoleLabel } from "@/lib/auth/role-labels";
import { isMasterGuidesClubType } from "@/lib/clubs/club-type";
import {
  createClubSectionAction,
  revokeClassCounselorAction,
  revokeClubRoleAction,
  toggleClubSectionActiveAction,
} from "@/lib/clubs/detail-actions";
import { uniqueMemberCount, uniqueMembers } from "@/lib/clubs/detail-members";
import {
  buildPositionRows,
  counselorHolders,
  findRoleForPosition,
  isKnownDesignationBlockCode,
  pickInitialSectionId,
  POSITION_KEYS,
  type PositionHolder,
  type PositionKey,
} from "@/lib/clubs/detail-positions";
import {
  findSectionDirectorMember,
  isClubSectionActive,
  type ClubDetailPayload,
  type SectionMembersGroup,
} from "@/lib/clubs/types";
import { formatDateTime } from "@/lib/format-locale";

interface SectionsTabProps {
  data: ClubDetailPayload;
  yearLabels: ClubDetailYearLabels;
  /** clubs:revoke_roles. Defaults to the manage_roles capability. */
  canRevokeRoles?: boolean;
}

type ClassOption = { class_id: number; name: string };

function formData(entries: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.set(key, value);
  return form;
}

export function SectionsTab({ data, yearLabels, canRevokeRoles }: SectionsTabProps) {
  const t = useTranslations("people.clubDetail.sections");
  const tSections = useTranslations("clubs.detail.sections");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const run = useDetailAction();
  const toastError = useToastError();

  const groups = data.sectionMemberGroups;
  const selectedId = pickInitialSectionId(groups, searchParams.get("section"));
  const group = groups.find((row) => row.sectionId === selectedId) ?? null;
  const missingTypes = data.clubTypes.filter(
    (type) => !groups.some((row) => row.clubTypeId === type.club_type_id),
  );

  function select(sectionId: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "sections");
    params.set("section", String(sectionId));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function enableMissing(clubTypeId: number) {
    try {
      await run(() => createClubSectionAction(data.clubId, {}, formData({ club_type_id: String(clubTypeId) })));
    } catch (error) {
      toastError({
        title: t("enableFailed"),
        description: error instanceof Error ? error.message : undefined,
        onRetry: () => void enableMissing(clubTypeId),
      });
    }
  }

  if (groups.length === 0 && missingTypes.length === 0) {
    return <EmptyState icon={LayoutGrid} title={t("empty")} />;
  }

  return (
    <div className="space-y-6">
      {groups.length > 0 ? (
        <Segmented<number>
          label={t("pickerLabel")}
          options={groups.map((row) => ({ value: row.sectionId, label: row.sectionName }))}
          value={selectedId ?? groups[0]!.sectionId}
          onChange={select}
          className="flex-wrap"
        />
      ) : null}

      {group ? (
        <SectionPanel
          key={group.sectionId}
          data={data}
          group={group}
          yearLabels={yearLabels}
          canRevokeRoles={canRevokeRoles ?? data.canManageRoles}
        />
      ) : null}

      {missingTypes.length > 0 ? (
        <SectionBlock title={t("missingHeading")}>
          <ul className="divide-y rounded-xl bg-card shadow-card">
            {missingTypes.map((type) => (
              <li key={type.club_type_id} className="flex items-center gap-4 px-4 py-3">
                <span className="flex-1">
                  <span className="font-medium">{type.name}</span>
                  <span className="text-muted-foreground text-sm"> · {tSections("notCreated")}</span>
                </span>
                {data.canCreateSections ? (
                  <Button variant="outline" size="sm" onClick={() => void enableMissing(type.club_type_id)}>
                    {tSections("enableMissing")}
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-xs">{tSections("noPermission")}</span>
                )}
              </li>
            ))}
          </ul>
        </SectionBlock>
      ) : null}
    </div>
  );
}

function SectionPanel({
  data,
  group,
  yearLabels,
  canRevokeRoles,
}: {
  data: ClubDetailPayload;
  group: SectionMembersGroup;
  yearLabels: ClubDetailYearLabels;
  canRevokeRoles: boolean;
}) {
  const t = useTranslations("people.clubDetail.sections");
  const tSections = useTranslations("clubs.detail.sections");
  const tPositions = useTranslations("people.clubDetail.positions");
  const locale = useLocale();
  const format = useFormatter();
  const run = useDetailAction();
  const toastError = useToastError();
  const translateRole = useRoleLabel();

  const sectionId = group.sectionId;
  const sectionRaw = data.sections.find((row) => row.club_section_id === sectionId);
  const active = isClubSectionActive(group);
  const lockedActive =
    active &&
    isMasterGuidesClubType({
      name: group.clubTypeName,
      slug: sectionRaw?.club_type?.slug,
    });
  const people = useMemo(() => uniqueMembers(group.members), [group.members]);
  const director = findSectionDirectorMember(group.members);
  const designation = data.designationsBySectionId[sectionId] ?? null;
  const canDesignate = data.canDesignateNextDirector && data.nextYearId != null;
  const canSucceed =
    data.canSucceedDirector && data.currentYearId != null && Boolean(director?.assignment_id);
  const nextYear = yearLabels.next;

  const [assignKey, setAssignKey] = useState<PositionKey | null>(null);
  const [revoke, setRevoke] = useState<{ key: PositionKey; holder: PositionHolder } | null>(null);
  const [designateOpen, setDesignateOpen] = useState(false);
  const [succeedOpen, setSucceedOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [counselors, setCounselors] = useState<{
    loading: boolean;
    failed: boolean;
    items: ClassCounselorAssignment[];
  }>({ loading: true, failed: false, items: [] });
  const [classes, setClasses] = useState<ClassOption[]>([]);

  const requestCounselors = useCallback(async () => {
    const payload = await listClassCounselorAssignments(data.clubId, sectionId, { active: true });
    return Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown }).data)
        ? (payload as unknown as { data: ClassCounselorAssignment[] }).data
        : [];
  }, [data.clubId, sectionId]);

  /** Retry / reload after a change: shows the loading row first. */
  const loadCounselors = useCallback(() => {
    setCounselors((current) => ({ ...current, loading: true, failed: false }));
    requestCounselors()
      .then((items) => setCounselors({ loading: false, failed: false, items }))
      .catch(() => setCounselors((current) => ({ ...current, loading: false, failed: true })));
  }, [requestCounselors]);

  useEffect(() => {
    // The first load starts from the initial `loading: true` state.
    let cancelled = false;
    requestCounselors()
      .then((items) => {
        if (!cancelled) setCounselors({ loading: false, failed: false, items });
      })
      .catch(() => {
        if (!cancelled) setCounselors((current) => ({ ...current, loading: false, failed: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [requestCounselors]);

  useEffect(() => {
    let cancelled = false;
    listClasses({ clubTypeId: group.clubTypeId, limit: 100 })
      .then((payload) => {
        const rows = Array.isArray(payload)
          ? payload
          : ((payload as { data?: ClassOption[] }).data ?? []);
        if (!cancelled) {
          setClasses(rows.map((row) => ({ class_id: row.class_id, name: row.name })));
        }
      })
      .catch(() => {
        // Without names the sheet says "class pending"; the counselor dialog lists none.
      });
    return () => {
      cancelled = true;
    };
  }, [group.clubTypeId]);

  const continuations = useContinuations(sectionId, data.canEnrollAnnualContinuations);

  const rows = useMemo(() => {
    const base = buildPositionRows(group.members, data.leadership, group.sectionName);
    return base.map((row) =>
      row.key === "counselor" ? { ...row, holders: counselorHolders(counselors.items) } : row,
    );
  }, [group.members, group.sectionName, data.leadership, counselors.items]);

  const assignable = useMemo(
    () =>
      Object.fromEntries(
        POSITION_KEYS.map((key) => [
          key,
          key === "counselor" || findRoleForPosition(data.clubRoles, key) != null,
        ]),
      ) as Record<PositionKey, boolean>,
    [data.clubRoles],
  );

  function positionLabel(key: PositionKey) {
    return key === "counselor" ? tSections("counselorsLabel") : translateRole(key);
  }

  const canAssign = data.canManageRoles && data.currentYearId != null;
  const sectionYear = yearLabels.current;
  const yearFallback = t("yearFallback");

  async function setActive(next: boolean) {
    await run(() =>
      toggleClubSectionActiveAction(data.clubId, sectionId, {}, formData({ active: String(next) })),
    );
  }

  async function enableSection() {
    try {
      await setActive(true);
    } catch (error) {
      toastError({
        title: t("enableFailed"),
        description: error instanceof Error ? error.message : undefined,
        onRetry: () => void enableSection(),
      });
    }
  }

  async function confirmRevoke() {
    if (!revoke || !revoke.holder.assignmentId) return;
    const { key, holder } = revoke;
    const assignmentId = holder.assignmentId as string;
    await run(() => {
      const form = formData({ club_id: String(data.clubId), assignment_id: assignmentId });
      return key === "counselor" ? revokeClassCounselorAction({}, form) : revokeClubRoleAction({}, form);
    });
    if (key === "counselor") loadCounselors();
  }

  const designatedMember = designation
    ? people.find((member) => member.user_id === designation.user_id)
    : null;
  const blockCode = designation?.block_code ?? null;
  const assignRole = assignKey && assignKey !== "counselor" ? findRoleForPosition(data.clubRoles, assignKey) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-xl tracking-tight">{group.sectionName}</h2>
          <ExceptionStatus<"active" | "inactive">
            value={active ? "active" : "inactive"}
            normal={["active"]}
            labels={{ active: tSections("active"), inactive: tSections("inactive") }}
            intents={{ inactive: "neutral" }}
          />
        </div>
        {data.canCreateSections && sectionRaw?.club_section_id ? (
          lockedActive ? (
            <span className="text-muted-foreground text-sm">{tSections("masterGuidesLockedHint")}</span>
          ) : active ? (
            <Button variant="ghost" size="sm" onClick={() => setDisableOpen(true)}>
              {t("disable")}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => void enableSection()}>
              {t("enable")}
            </Button>
          )
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="space-y-6">
          <SectionBlock title={sectionYear ? t("positionsHeading", { year: sectionYear }) : t("positionsHeadingNoYear")}>
            <SectionPositions
              rows={rows}
              canAssign={canAssign}
              canRevoke={canRevokeRoles}
              counselorsLoading={counselors.loading}
              counselorsFailed={counselors.failed}
              onRetryCounselors={() => loadCounselors()}
              assignable={assignable}
              onAssign={setAssignKey}
              onRevoke={(key, holder) => setRevoke({ key, holder })}
            />
          </SectionBlock>

          {canDesignate ? (
            <SectionBlock
              title={nextYear ? t("designationHeading", { year: nextYear }) : t("designationHeadingNoYear")}
              action={
                <Button variant="outline" size="sm" onClick={() => setDesignateOpen(true)}>
                  {designation ? t("designationChange") : t("designationDesignate")}
                </Button>
              }
            >
              <div className="space-y-2 text-sm">
                {designation ? (
                  <p>
                    <span className="font-medium">{designatedMember?.name ?? t("unknownPerson")}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {nextYear ? t("designationWillBe", { year: nextYear }) : t("designationWillBeNoYear")}
                    </span>
                  </p>
                ) : (
                  <p className="text-muted-foreground">{tSections("noDesignation")}</p>
                )}
                <p className="text-muted-foreground">
                  {tSections("designateWindowHint")} {tSections("designateHint")}
                </p>
                {blockCode ? (
                  <p role="status" className="font-medium text-warning-foreground dark:text-warning">
                    {isKnownDesignationBlockCode(blockCode)
                      ? tSections(`designationBlock.${blockCode}`)
                      : blockCode}
                    {designation?.last_attempt_at ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        {tSections("lastAttempt", {
                          date: formatDateTime(designation.last_attempt_at, locale),
                        })}
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </SectionBlock>
          ) : null}
        </div>

        <aside className="h-fit space-y-5 rounded-xl bg-card p-5 shadow-card">
          <dl className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{tSections("labelSoulsTarget")}</dt>
              <dd className="font-medium tabular-nums">{group.soulsTarget ?? "—"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{t("members")}</dt>
              <dd className="font-medium tabular-nums">{uniqueMemberCount(group.members)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{tSections("labelFee")}</dt>
              <dd className="font-medium tabular-nums">
                {group.fee != null ? format.number(group.fee) : "—"}
              </dd>
            </div>
            {data.canEnrollAnnualContinuations ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">
                  {nextYear ? t("toEnroll", { year: nextYear }) : t("toEnrollNoYear")}
                </dt>
                <dd className="font-medium tabular-nums">
                  {continuations.loading || continuations.failed ? "—" : continuations.items.length}
                </dd>
              </div>
            ) : null}
          </dl>
          {data.canEnrollAnnualContinuations || canSucceed ? (
            <div className="flex flex-col gap-2">
              {data.canEnrollAnnualContinuations ? (
                <Button variant="outline" onClick={() => setSheetOpen(true)}>
                  {t("annualEnrollment")}
                </Button>
              ) : null}
              {canSucceed ? (
                <Button variant="ghost" onClick={() => setSucceedOpen(true)}>
                  {t("succeedNow")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>

      {assignKey && data.currentYearId != null ? (
        <AssignPositionDialog
          open
          onOpenChange={(open) => {
            if (open) return;
            if (assignKey === "counselor") loadCounselors();
            setAssignKey(null);
          }}
          clubId={data.clubId}
          sectionId={sectionId}
          sectionName={group.sectionName}
          positionKey={assignKey}
          positionLabel={positionLabel(assignKey)}
          roleId={assignRole?.role_id ?? null}
          yearId={data.currentYearId}
          yearLabel={sectionYear}
          members={people}
          excludeUserIds={
            assignKey === "counselor"
              ? []
              : (rows.find((row) => row.key === assignKey)?.holders ?? []).map((holder) => holder.userId)
          }
          classes={classes}
        />
      ) : null}

      <ConfirmDialog
        open={revoke != null}
        onOpenChange={(open) => {
          if (!open) setRevoke(null);
        }}
        tone="destructive"
        title={
          revoke
            ? tPositions("revokeTitle", {
                name: revoke.holder.name,
                position: positionLabel(revoke.key).toLowerCase(),
              })
            : ""
        }
        description={
          revoke
            ? sectionYear
              ? tPositions("revokeDescription", {
                  position: positionLabel(revoke.key).toLowerCase(),
                  section: group.sectionName,
                  year: sectionYear,
                })
              : tPositions("revokeDescriptionNoYear", {
                  position: positionLabel(revoke.key).toLowerCase(),
                  section: group.sectionName,
                })
            : ""
        }
        confirmLabel={tPositions("revokeConfirm")}
        onConfirm={confirmRevoke}
      />

      <ConfirmDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        tone="destructive"
        title={t("disableTitle", { section: group.sectionName })}
        description={t("disableDescription", {
          count: uniqueMemberCount(group.members),
          year: nextYear ?? yearFallback,
        })}
        confirmLabel={t("disableConfirm")}
        onConfirm={() => setActive(false)}
      />

      {canDesignate && data.nextYearId != null ? (
        <DesignateDirectorDialog
          key={designateOpen ? "designate-open" : "designate-closed"}
          open={designateOpen}
          onOpenChange={setDesignateOpen}
          clubId={data.clubId}
          sectionId={sectionId}
          sectionName={group.sectionName}
          nextYearId={data.nextYearId}
          nextYearLabel={nextYear}
          currentDirectorName={director?.name ?? null}
          members={people}
          existing={
            designation
              ? {
                  userId: designation.user_id,
                  successionId: designation.succession_id ?? null,
                  version: designation.version ?? null,
                }
              : null
          }
        />
      ) : null}

      {canSucceed && director?.assignment_id && data.currentYearId != null ? (
        <SucceedDirectorDialog
          key={succeedOpen ? "succeed-open" : "succeed-closed"}
          open={succeedOpen}
          onOpenChange={setSucceedOpen}
          clubId={data.clubId}
          sectionId={sectionId}
          currentYearId={data.currentYearId}
          currentYearLabel={sectionYear}
          currentAssignmentId={director.assignment_id}
          currentDirectorName={director.name}
          members={people.filter((member) => member.user_id !== director.user_id)}
        />
      ) : null}

      {data.canEnrollAnnualContinuations ? (
        <ContinuationsSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          sectionId={sectionId}
          sectionName={group.sectionName}
          yearLabel={nextYear}
          continuations={continuations}
          classes={classes}
        />
      ) : null}
    </div>
  );
}
