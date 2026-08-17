"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { LayoutGrid, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useRoleLabel } from "@/lib/auth/role-labels";
import {
  createClubSectionAction,
  toggleClubSectionActiveAction,
  type DetailActionState,
} from "@/lib/clubs/detail-actions";
import {
  formatLeaderName,
  findSectionDirectorMember,
  getSectionDirector,
  type ClubDetailPayload,
  type ClubSectionRaw,
} from "@/lib/clubs/types";

interface SectionsTabProps {
  data: ClubDetailPayload;
}

const MAX_SECTION_SLOTS = 3;

function findSectionForType(
  sections: ClubSectionRaw[],
  clubTypeId: number,
): ClubSectionRaw | undefined {
  return sections.find(
    (section) =>
      section.club_type_id === clubTypeId ||
      section.club_types?.club_type_id === clubTypeId,
  );
}

function EnableMissingButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function EnableMissingSectionSlot({
  clubId,
  clubTypeId,
  typeName,
  canManage,
}: {
  clubId: number;
  clubTypeId: number;
  typeName: string;
  canManage: boolean;
}) {
  const t = useTranslations("clubs.detail.sections");
  const router = useRouter();
  const boundAction = createClubSectionAction.bind(null, clubId);
  const [state, action] = useActionState(boundAction, {} as DetailActionState);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <Card className="border-dashed bg-muted/10">
      <CardContent className="space-y-4 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-full border border-dashed bg-muted/30 text-muted-foreground">
            <LayoutGrid className="size-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold">{typeName}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("notCreated")}</p>
          </div>
        </div>

        {canManage ? (
          <form action={action} className="space-y-3 border-t pt-4">
            <input type="hidden" name="club_type_id" value={clubTypeId} />
            {state.error ? (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {state.error}
              </p>
            ) : null}
            {state.success ? (
              <p className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                {state.success}
              </p>
            ) : null}
            <EnableMissingButton label={t("enableMissing")} />
          </form>
        ) : (
          <p className="border-t pt-4 text-center text-xs text-muted-foreground">
            {t("noPermission")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SectionActiveToggle({
  clubId,
  sectionId,
  active,
  disabled,
}: {
  clubId: number;
  sectionId: number;
  active: boolean;
  disabled: boolean;
}) {
  const t = useTranslations("clubs.detail.sections");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const boundAction = toggleClubSectionActiveAction.bind(null, clubId, sectionId);
  const [state, action, pending] = useActionState(
    boundAction,
    {} as DetailActionState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">
          {active ? t("disableLabel") : t("enableLabel")}
        </span>
        <Switch
          type="button"
          checked={active}
          disabled={disabled || pending}
          onCheckedChange={() => formRef.current?.requestSubmit()}
          aria-label={active ? t("disableLabel") : t("enableLabel")}
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function SectionCard({
  clubId,
  section,
  typeName,
  directorName,
  directorImage,
  canManage,
}: {
  clubId: number;
  section: ClubSectionRaw;
  typeName: string;
  directorName: string | null;
  directorImage: string | null;
  canManage: boolean;
}) {
  const t = useTranslations("clubs.detail.sections");
  const translateRole = useRoleLabel();
  const isActive = section.active !== false;

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("typeEyebrow")}
            </p>
            <h3 className="text-lg font-semibold">{typeName}</h3>
          </div>
          <Badge variant={isActive ? "default" : "outline"}>
            {isActive ? t("active") : t("inactive")}
          </Badge>
        </div>

        {canManage && section.club_section_id ? (
          <SectionActiveToggle
            clubId={clubId}
            sectionId={section.club_section_id}
            active={isActive}
            disabled={!canManage}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{t("labelSoulsTarget")}</p>
            <p className="font-medium">{section.souls_target ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("labelFee")}</p>
            <p className="font-medium">{section.fee ?? "—"}</p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">{t("directorLabel")}</p>
          {directorName ? (
            <div className="mt-2 flex items-center gap-3">
              <Avatar size="sm">
                {directorImage ? (
                  <AvatarImage src={directorImage} alt={directorName} />
                ) : null}
                <AvatarFallback>
                  {directorName
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{directorName}</p>
                <p className="text-xs text-muted-foreground">
                  {translateRole("director")}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("noDirector")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionsTab({ data }: SectionsTabProps) {
  const slotTypes = data.clubTypes.slice(0, MAX_SECTION_SLOTS);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {slotTypes.map((clubType) => {
        const section = findSectionForType(data.sections, clubType.club_type_id);
        if (!section?.club_section_id) {
          return (
            <EnableMissingSectionSlot
              key={clubType.club_type_id}
              clubId={data.clubId}
              clubTypeId={clubType.club_type_id}
              typeName={clubType.name}
              canManage={data.canCreateSections}
            />
          );
        }

        const memberGroup = data.sectionMemberGroups.find(
          (group) => group.sectionId === section.club_section_id,
        );
        const directorFromMembers = memberGroup
          ? findSectionDirectorMember(memberGroup.members)
          : null;
        const directorFromLeadership = getSectionDirector(
          data.leadership,
          clubType.name,
        );

        return (
          <SectionCard
            key={clubType.club_type_id}
            clubId={data.clubId}
            section={section}
            typeName={clubType.name}
            canManage={data.canCreateSections}
            directorName={
              directorFromMembers?.name ??
              (directorFromLeadership ? formatLeaderName(directorFromLeadership) : null)
            }
            directorImage={
              directorFromMembers?.picture_url ??
              directorFromLeadership?.user_image ??
              null
            }
          />
        );
      })}
    </div>
  );
}
