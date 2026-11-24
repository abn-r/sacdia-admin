"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/users/user-avatar";
import { useDetailAction } from "@/components/clubs/detail/use-detail-action";
import { getAssignableRoles, type ClubSectionMember } from "@/lib/api/clubs";
import {
  assignClassCounselorAction,
  assignClubRoleAction,
} from "@/lib/clubs/detail-actions";
import {
  eligibilityForRole,
  mapWithConcurrency,
  type MemberEligibility,
} from "@/lib/clubs/detail-eligibility";
import type { PositionKey } from "@/lib/clubs/detail-positions";
import { cn } from "@/lib/utils";

const ELIGIBILITY_CONCURRENCY = 5;
const GM_SECTION_CODE = "CLUB_ROLE_MEMBER_REQUIRES_GUIDE_MAJOR_SECTION";

export interface AssignPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: number;
  sectionId: number;
  sectionName: string;
  positionKey: PositionKey;
  positionLabel: string;
  /** Catalog role of the position; null for counselors (they use a class assignment). */
  roleId: string | null;
  yearId: number;
  yearLabel: string | null;
  members: ClubSectionMember[];
  /** People who already hold this position (not offered again). */
  excludeUserIds: string[];
  classes: Array<{ class_id: number; name: string }>;
}

type EligibilityState = { key: string; byUser: Record<string, MemberEligibility>; done: boolean };

export function AssignPositionDialog({
  open,
  onOpenChange,
  clubId,
  sectionId,
  sectionName,
  positionKey,
  positionLabel,
  roleId,
  yearId,
  yearLabel,
  members,
  excludeUserIds,
  classes,
}: AssignPositionDialogProps) {
  const t = useTranslations("people.clubDetail.assign");
  const tRoles = useTranslations("clubs.detail.roles");
  const run = useDetailAction();
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [classId, setClassId] = useState("");
  const [responsibility, setResponsibility] = useState("primary");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityState | null>(null);

  const isCounselor = positionKey === "counselor";
  const candidates = useMemo(() => {
    const seen = new Set<string>(excludeUserIds);
    const rows: ClubSectionMember[] = [];
    for (const member of members) {
      if (seen.has(member.user_id)) continue;
      seen.add(member.user_id);
      rows.push(member);
    }
    return rows;
  }, [members, excludeUserIds]);

  const eligibilityKey = `${sectionId}:${roleId ?? ""}`;
  const checkEligibility = open && !isCounselor && roleId != null;

  useEffect(() => {
    if (!checkEligibility || !roleId) return;
    let cancelled = false;
    void mapWithConcurrency(candidates, ELIGIBILITY_CONCURRENCY, async (member) => {
      try {
        const payload = await getAssignableRoles(clubId, sectionId, member.user_id);
        return [member.user_id, eligibilityForRole(payload.roles, roleId)] as const;
      } catch {
        // The server still enforces the rules on submit.
        return [member.user_id, { status: "unknown" } as MemberEligibility] as const;
      }
    }).then((entries) => {
      if (cancelled) return;
      setEligibility({ key: eligibilityKey, byUser: Object.fromEntries(entries), done: true });
    });
    return () => {
      cancelled = true;
    };
  }, [checkEligibility, candidates, clubId, sectionId, roleId, eligibilityKey]);

  const current = eligibility?.key === eligibilityKey ? eligibility : null;

  function stateOf(member: ClubSectionMember): MemberEligibility | "checking" {
    if (!checkEligibility) return { status: "ok" };
    return current?.byUser[member.user_id] ?? "checking";
  }

  function reasonOf(code: string | null) {
    return code === GM_SECTION_CODE
      ? tRoles("roleBlockedMemberInGmSection")
      : tRoles("roleBlockedGuideMajorRequired");
  }

  const needle = search.trim().toLowerCase();
  const visible = candidates.filter((member) => !needle || member.name.toLowerCase().includes(needle));
  const selected = candidates.find((member) => member.user_id === userId);
  const selectedState = selected ? stateOf(selected) : null;
  const selectedBlocked = selectedState !== null && selectedState !== "checking" && selectedState.status === "blocked";
  const ready =
    Boolean(userId) && !selectedBlocked && (isCounselor ? Boolean(classId) : roleId != null);

  async function submit() {
    if (!ready) return;
    setPending(true);
    setError(null);
    try {
      await run(() => {
        const formData = new FormData();
        formData.set("club_id", String(clubId));
        formData.set("section_id", String(sectionId));
        formData.set("user_id", userId);
        formData.set("ecclesiastical_year_id", String(yearId));
        if (isCounselor) {
          formData.set("class_id", classId);
          formData.set("responsibility_type", responsibility);
          return assignClassCounselorAction({}, formData);
        }
        formData.set("role_id", roleId ?? "");
        formData.set("start_date", new Date().toISOString().slice(0, 10));
        return assignClubRoleAction({}, formData);
      });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("failed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) {
          setSearch("");
          setUserId("");
          setClassId("");
          setResponsibility("primary");
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title", { position: positionLabel })}</DialogTitle>
          <DialogDescription>
            {yearLabel
              ? t("context", { section: sectionName, year: yearLabel })
              : sectionName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assign-position-search">{t("person")}</Label>
            <Input
              id="assign-position-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder", { count: candidates.length })}
              autoComplete="off"
            />
            {candidates.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("noCandidates")}</p>
            ) : (
              <RadioGroup
                value={userId}
                onValueChange={setUserId}
                aria-label={t("person")}
                className="max-h-64 gap-1 overflow-y-auto"
              >
                {visible.map((member) => {
                  const state = stateOf(member);
                  const blocked = state !== "checking" && state.status === "blocked";
                  const id = `assign-position-${member.user_id}`;
                  return (
                    <div
                      key={member.user_id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2 py-1.5 has-[[data-state=checked]]:bg-primary/10",
                        blocked && "opacity-60",
                      )}
                    >
                      <RadioGroupItem
                        id={id}
                        value={member.user_id}
                        disabled={blocked}
                        aria-describedby={blocked ? `${id}-why` : undefined}
                      />
                      <Label htmlFor={id} className="flex min-w-0 flex-1 items-center gap-2.5 font-normal">
                        <UserAvatar src={member.picture_url} name={member.name} size={28} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{member.name}</span>
                          {member.current_class_name ? (
                            <span className="block truncate text-muted-foreground text-xs">
                              {member.current_class_name}
                            </span>
                          ) : null}
                        </span>
                      </Label>
                      {blocked && state.status === "blocked" ? (
                        <span id={`${id}-why`} className="max-w-[45%] text-right text-muted-foreground text-xs">
                          {reasonOf(state.code)}
                        </span>
                      ) : state === "checking" ? (
                        <span className="text-muted-foreground text-xs">{t("checking")}</span>
                      ) : null}
                    </div>
                  );
                })}
              </RadioGroup>
            )}
          </div>

          {isCounselor ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="assign-position-class">{tRoles("classLabel")}</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger id="assign-position-class" className="w-full">
                    <SelectValue placeholder={t("classPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((row) => (
                      <SelectItem key={row.class_id} value={String(row.class_id)}>
                        {row.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-position-responsibility">{tRoles("responsibilityLabel")}</Label>
                <Select value={responsibility} onValueChange={setResponsibility}>
                  <SelectTrigger id="assign-position-responsibility" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">{tRoles("responsibilityPrimary")}</SelectItem>
                    <SelectItem value="assistant">{tRoles("responsibilityAssistant")}</SelectItem>
                    <SelectItem value="substitute">{tRoles("responsibilitySubstitute")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void submit()} loading={pending} disabled={!ready}>
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
