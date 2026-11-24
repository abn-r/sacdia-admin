"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/shared/error-state";
import { getActionErrorMessage } from "@/lib/api/action-error";
import type { AdminUser } from "@/lib/api/admin-users";
import { listClubSections, type ClubSection } from "@/lib/api/clubs";
import {
  buildCoordinatorAssignmentPayload,
  createCoordinatorAssignment,
  extractCoordinationConflictReason,
  type CoordinationZone,
  type CoordinatorAssignmentType,
} from "@/lib/api/coordination";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import { Segmented } from "@/components/shared/segmented";
import {
  coordinationErrorMessage,
  formatCoordinatorName,
} from "@/components/coordination/coordination-labels";

export type CoordinatorCandidatesState = {
  status: "idle" | "loading" | "ready" | "error";
  users: AdminUser[];
};

type CoordinationAssignmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localFieldId: number;
  localFieldName: string;
  zones: CoordinationZone[];
  clubTypes: AdminClubType[];
  clubs: Array<{ club_id: number; name: string }>;
  candidates: CoordinatorCandidatesState;
  onRetryCandidates: () => void;
  onCreated: () => Promise<void>;
};

export function CoordinationAssignmentDialog({
  open,
  onOpenChange,
  localFieldId,
  localFieldName,
  zones,
  clubTypes,
  clubs,
  candidates,
  onRetryCandidates,
  onCreated,
}: CoordinationAssignmentDialogProps) {
  const t = useTranslations("coordinationAdmin");
  const tc = useTranslations("people.community.coordination");
  const scopeLabelId = useId();
  const [userId, setUserId] = useState("");
  const [assignmentType, setAssignmentType] = useState<CoordinatorAssignmentType>("GENERAL");
  const [zoneId, setZoneId] = useState("");
  const [clubTypeId, setClubTypeId] = useState("");
  const [clubId, setClubId] = useState("");
  const [clubSectionId, setClubSectionId] = useState("");
  const [sections, setSections] = useState<ClubSection[]>([]);
  const [sectionsError, setSectionsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeZones = zones.filter((zone) => zone.active);
  const activeClubTypes = clubTypes.filter((clubType) => clubType.active);

  useEffect(() => {
    if (!clubId) {
      setSections([]);
      setClubSectionId("");
      setSectionsError(false);
      return;
    }
    let cancelled = false;
    setSectionsError(false);
    listClubSections(Number(clubId))
      .then((payload) => {
        if (cancelled) return;
        const rows = extractItems(payload) as ClubSection[];
        setSections(rows.filter((row) => row.active !== false));
      })
      .catch(() => {
        if (cancelled) return;
        setSections([]);
        setSectionsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  function reset() {
    setUserId("");
    setAssignmentType("GENERAL");
    setZoneId("");
    setClubTypeId("");
    setClubId("");
    setClubSectionId("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (saving) return;
    if (!next) reset();
    onOpenChange(next);
  }

  function changeType(next: CoordinatorAssignmentType) {
    setAssignmentType(next);
    setZoneId("");
    setClubTypeId("");
    setClubId("");
    setClubSectionId("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return setError(t("errors.coordinatorRequired"));
    if (assignmentType === "ZONE" && (!zoneId || !clubTypeId)) {
      return setError(t("errors.assignmentScopeRequired"));
    }
    if (assignmentType === "SECTION" && !clubSectionId) {
      return setError(t("errors.assignmentScopeRequired"));
    }

    setSaving(true);
    setError(null);
    try {
      await createCoordinatorAssignment(
        localFieldId,
        buildCoordinatorAssignmentPayload({
          userId,
          assignmentType,
          zoneId: zoneId ? Number(zoneId) : undefined,
          clubTypeId: clubTypeId ? Number(clubTypeId) : undefined,
          clubSectionId: clubSectionId ? Number(clubSectionId) : undefined,
        }),
      );
      toast.success(t("success.assignmentCreated"));
      reset();
      onOpenChange(false);
      await onCreated();
    } catch (err) {
      setError(
        coordinationErrorMessage(
          extractCoordinationConflictReason(err),
          getActionErrorMessage(err, t("errors.generic")),
          t as unknown as (key: string) => string,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{tc("assignmentDialog.title")}</DialogTitle>
            <DialogDescription>{localFieldName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="assignment-coordinator">{t("fields.coordinator")}</Label>
            {candidates.status === "error" ? (
              <ErrorState
                variant="inline"
                title={tc("assignmentDialog.candidatesError")}
                onRetry={onRetryCandidates}
              />
            ) : (
              <Select
                value={userId || undefined}
                onValueChange={setUserId}
                disabled={candidates.status !== "ready"}
              >
                <SelectTrigger id="assignment-coordinator" className="w-full">
                  <SelectValue placeholder={t("fields.selectUser")} />
                </SelectTrigger>
                <SelectContent>
                  {candidates.users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {formatCoordinatorName(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {candidates.status === "ready" && candidates.users.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                {t("assignments.usersEmpty")}{" "}
                <Link
                  href="/dashboard/users/new"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {t("assignments.usersEmptyLink")}
                </Link>
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <span id={scopeLabelId} className="font-medium text-sm leading-none">
              {t("fields.scope")}
            </span>
            <Segmented<CoordinatorAssignmentType>
              fill
              labelledBy={scopeLabelId}
              value={assignmentType}
              onChange={changeType}
              options={[
                { value: "GENERAL", label: tc("assignmentDialog.scopeGeneral") },
                { value: "ZONE", label: tc("assignmentDialog.scopeZone") },
                { value: "SECTION", label: tc("assignmentDialog.scopeSection") },
              ]}
            />
          </div>

          {assignmentType === "ZONE" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assignment-zone">{t("fields.zone")}</Label>
                <Select value={zoneId || undefined} onValueChange={setZoneId}>
                  <SelectTrigger id="assignment-zone" className="w-full">
                    <SelectValue placeholder={t("fields.selectZone")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeZones.map((zone) => (
                      <SelectItem key={zone.zone_id} value={String(zone.zone_id)}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-club-type">{t("fields.clubType")}</Label>
                <Select value={clubTypeId || undefined} onValueChange={setClubTypeId}>
                  <SelectTrigger id="assignment-club-type" className="w-full">
                    <SelectValue placeholder={t("fields.selectClubType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeClubTypes.map((clubType) => (
                      <SelectItem
                        key={clubType.club_type_id}
                        value={String(clubType.club_type_id)}
                      >
                        {clubType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {assignmentType === "SECTION" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assignment-club">{t("fields.club")}</Label>
                <Select
                  value={clubId || undefined}
                  onValueChange={(value) => {
                    setClubId(value);
                    setClubSectionId("");
                  }}
                >
                  <SelectTrigger id="assignment-club" className="w-full">
                    <SelectValue placeholder={t("fields.selectClub")} />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((club) => (
                      <SelectItem key={club.club_id} value={String(club.club_id)}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-section">{t("fields.section")}</Label>
                <Select
                  value={clubSectionId || undefined}
                  onValueChange={setClubSectionId}
                  disabled={!clubId}
                >
                  <SelectTrigger id="assignment-section" className="w-full">
                    <SelectValue placeholder={t("fields.selectSection")} />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem
                        key={section.club_section_id}
                        value={String(section.club_section_id)}
                      >
                        {section.club_type?.name ?? section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sectionsError ? (
                  <p role="alert" className="text-destructive text-xs">
                    {tc("assignmentDialog.sectionsError")}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground text-sm">
            {t("assignments.directorConflictRule")}
          </p>

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => handleOpenChange(false)}
            >
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" loading={saving}>
              {t("actions.createAssignment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
