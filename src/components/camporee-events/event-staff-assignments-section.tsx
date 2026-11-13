"use client";

/**
 * EventStaffAssignmentsSection — assigns camporee roster members to an event
 * (responsible / assistant / evaluator / support) via
 * `PUT /camporee-events/:id/staff-assignments` (replaces all active assignments).
 *
 * Publishing an event needs an active `responsible`; this editor is where that
 * gets fixed. It talks to the API directly (not through the surrounding <form>
 * server action), so every control is `type="button"` and nameless. Only
 * rendered for existing events inside the edit form, which already requires
 * `camporee_events:update`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  CAMPOREE_EVENT_ASSIGNMENT_FUNCTIONS,
  getCamporeeStaffDisplayName,
  getCamporeeStaffErrorCode,
  listCamporeeEventStaffAssignments,
  listCamporeeStaff,
  replaceCamporeeEventStaffAssignments,
  type CamporeeEventAssignmentRole,
  type CamporeeEventStaffAssignment,
  type CamporeeStaffKind,
  type CamporeeStaffMember,
} from "@/lib/api/camporee-staff";

type DraftRow = {
  memberId: string;
  role: CamporeeEventAssignmentRole;
};

export interface EventStaffAssignmentsSectionProps {
  eventId: number;
  camporeeId: number;
  camporeeType: CamporeeStaffKind;
  initialAssignments?: CamporeeEventStaffAssignment[];
}

const ERROR_KEY_BY_CODE: Record<string, string> = {
  CAMPOREE_EVENT_RESPONSIBLE_REQUIRED: "responsibleRequired",
  CAMPOREE_STAFF_SCOPE_MISMATCH: "scopeMismatch",
  CAMPOREE_STAFF_MEMBER_NOT_FOUND: "memberNotFound",
};

function toDraft(assignments: CamporeeEventStaffAssignment[]): DraftRow[] {
  return assignments
    .filter((assignment) => assignment.active !== false)
    .map((assignment) => ({
      memberId: assignment.camporee_staff_member_id,
      role: assignment.assignment_role,
    }));
}

function sameDraft(a: DraftRow[], b: DraftRow[]): boolean {
  return (
    a.length === b.length &&
    a.every((row, i) => row.memberId === b[i].memberId && row.role === b[i].role)
  );
}

export function EventStaffAssignmentsSection({
  eventId,
  camporeeId,
  camporeeType,
  initialAssignments,
}: EventStaffAssignmentsSectionProps) {
  const t = useTranslations("camporees.eventInstanceForm.staffAssignments");
  // Keep `load` stable even if `t` changes identity between renders.
  const tRef = useRef(t);
  tRef.current = t;

  const [roster, setRoster] = useState<CamporeeStaffMember[]>([]);
  const [rows, setRows] = useState<DraftRow[]>(() =>
    initialAssignments ? toDraft(initialAssignments) : [],
  );
  const [saved, setSaved] = useState<DraftRow[]>(() =>
    initialAssignments ? toDraft(initialAssignments) : [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickMemberId, setPickMemberId] = useState("");
  const [pickRole, setPickRole] = useState<CamporeeEventAssignmentRole>("responsible");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [members, assignments] = await Promise.all([
        listCamporeeStaff(camporeeType, camporeeId),
        listCamporeeEventStaffAssignments(eventId),
      ]);
      const draft = toDraft(assignments);
      setRoster(members);
      setRows(draft);
      setSaved(draft);
    } catch {
      toast.error(tRef.current("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [camporeeId, camporeeType, eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const memberById = useMemo(
    () => new Map(roster.map((member) => [member.camporee_staff_member_id, member])),
    [roster],
  );
  const assignedIds = useMemo(() => new Set(rows.map((row) => row.memberId)), [rows]);
  const availableMembers = roster.filter(
    (member) => !assignedIds.has(member.camporee_staff_member_id),
  );

  const dirty = !sameDraft(rows, saved);
  const hasResponsible = rows.some((row) => row.role === "responsible");

  function addRow() {
    if (!pickMemberId) return;
    setRows((prev) => [...prev, { memberId: pickMemberId, role: pickRole }]);
    setPickMemberId("");
    setError(null);
  }

  function changeRole(memberId: string, role: CamporeeEventAssignmentRole) {
    setRows((prev) => prev.map((row) => (row.memberId === memberId ? { ...row, role } : row)));
  }

  function removeRow(memberId: string) {
    setRows((prev) => prev.filter((row) => row.memberId !== memberId));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const result = await replaceCamporeeEventStaffAssignments(
        eventId,
        rows.map((row, index) => ({
          camporee_staff_member_id: row.memberId,
          assignment_role: row.role,
          display_order: index,
        })),
      );
      const draft = toDraft(result);
      setRows(draft);
      setSaved(draft);
      toast.success(t("saved"));
    } catch (err) {
      const code = getCamporeeStaffErrorCode(err);
      const key = code ? ERROR_KEY_BY_CODE[code] : undefined;
      const message = key ? t(`errors.${key}` as "errors.responsibleRequired") : t("saveFailed");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const rosterHref = `${
    camporeeType === "union"
      ? `/dashboard/campamentos/union/${camporeeId}`
      : `/dashboard/campamentos/${camporeeId}`
  }?tab=staff`;

  return (
    <section className="space-y-3" aria-labelledby="event-staff-assignments-title">
      <div>
        <h3 id="event-staff-assignments-title" className="text-sm font-medium">
          {t("title")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {!loading && (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            intent={hasResponsible ? "success" : "warning"}
            size="sm"
            label={hasResponsible ? t("hasResponsible") : t("noResponsible")}
          />
        </div>
      )}

      {!loading && roster.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed p-4">
          <p className="text-sm text-muted-foreground">{t("rosterEmpty")}</p>
          <Button asChild type="button" variant="outline" size="sm">
            <Link href={rosterHref}>{t("rosterLink")}</Link>
          </Button>
        </div>
      ) : (
        <>
          {rows.length === 0 ? (
            !loading && <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-lg border">
              {rows.map((row) => {
                const member = memberById.get(row.memberId);
                const name = member ? getCamporeeStaffDisplayName(member) : row.memberId;
                return (
                  <li key={row.memberId} className="flex items-center gap-2 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                    <Select
                      value={row.role}
                      onValueChange={(value) =>
                        changeRole(row.memberId, value as CamporeeEventAssignmentRole)
                      }
                    >
                      <SelectTrigger className="w-40" aria-label={`${t("roleLabel")}: ${name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPOREE_EVENT_ASSIGNMENT_FUNCTIONS.map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`roles.${role}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("removeAria", { name })}
                      onClick={() => removeRow(row.memberId)}
                      disabled={saving}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          {availableMembers.length > 0 && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-48 flex-1 space-y-1">
                <Label>{t("memberLabel")}</Label>
                <Select value={pickMemberId} onValueChange={setPickMemberId}>
                  <SelectTrigger className="w-full" aria-label={t("memberLabel")}>
                    <SelectValue placeholder={t("memberPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => (
                      <SelectItem
                        key={member.camporee_staff_member_id}
                        value={member.camporee_staff_member_id}
                      >
                        {getCamporeeStaffDisplayName(member)}
                        {member.role_label ? ` · ${member.role_label}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40 space-y-1">
                <Label>{t("roleLabel")}</Label>
                <Select
                  value={pickRole}
                  onValueChange={(value) => setPickRole(value as CamporeeEventAssignmentRole)}
                >
                  <SelectTrigger className="w-full" aria-label={t("roleLabel")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPOREE_EVENT_ASSIGNMENT_FUNCTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(`roles.${role}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addRow}
                disabled={!pickMemberId || saving}
              >
                <Plus className="size-4" aria-hidden />
                {t("add")}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              loading={saving}
              disabled={!dirty}
              onClick={() => void save()}
            >
              {saving ? t("saving") : t("save")}
            </Button>
            {dirty && !saving && (
              <span className="text-xs text-muted-foreground">{t("unsaved")}</span>
            )}
          </div>
        </>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
