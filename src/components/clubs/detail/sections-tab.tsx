"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { LayoutGrid, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/users/user-avatar";
import {
  DetailSection,
  DetailField,
  DetailCols2,
} from "@/components/users/detail/section";
import { useRoleLabel } from "@/lib/auth/role-labels";
import {
  createClubSectionAction,
  toggleClubSectionActiveAction,
  type DetailActionState,
} from "@/lib/clubs/detail-actions";
import {
  getSectionOfficers,
  type ClubDetailPayload,
  type ClubSectionRaw,
  type SectionOfficerPerson,
  type SectionOfficerRole,
  type SectionOfficers,
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
    <Card className="gap-4 border-dashed bg-muted/10 py-5">
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-xl border border-dashed bg-muted/30 text-muted-foreground">
            <LayoutGrid className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {typeName}
            </h3>
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

function OfficerPersonRow({
  person,
  roleLabel,
}: {
  person: SectionOfficerPerson;
  roleLabel: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-3">
      <UserAvatar src={person.image} name={person.name} size={40} className="rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{person.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{roleLabel}</p>
      </div>
    </div>
  );
}

function OfficerRoleBlock({
  heading,
  people,
  roleLabel,
  emptyLabel,
  compactList = false,
}: {
  heading: string;
  people: SectionOfficerPerson[];
  roleLabel: string;
  emptyLabel: string;
  compactList?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {heading}
      </p>
      {people.length > 0 ? (
        <div
          className={
            compactList
              ? "max-h-36 space-y-1.5 overflow-y-auto pr-0.5"
              : "space-y-1.5"
          }
        >
          {people.map((person) => (
            <OfficerPersonRow
              key={person.userId}
              person={person}
              roleLabel={roleLabel}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

const OFFICER_BLOCK_ORDER: Array<{
  role: SectionOfficerRole;
  headingKey?: "directorLabel" | "counselorsLabel";
  omitWhenEmpty?: boolean;
  compactList?: boolean;
}> = [
  { role: "director", headingKey: "directorLabel" },
  { role: "deputy-director" },
  { role: "secretary" },
  { role: "secretary-treasurer", omitWhenEmpty: true },
  { role: "treasurer" },
  { role: "counselor", headingKey: "counselorsLabel", compactList: true },
];

function SectionCard({
  clubId,
  section,
  typeName,
  officers,
  canManage,
  index,
}: {
  clubId: number;
  section: ClubSectionRaw;
  typeName: string;
  officers: SectionOfficers;
  canManage: boolean;
  index: number;
}) {
  const t = useTranslations("clubs.detail.sections");
  const translateRole = useRoleLabel();
  const isActive = section.active !== false;

  return (
    <DetailSection
      num={String(index + 1).padStart(2, "0")}
      title={typeName}
      action={
        <Badge variant={isActive ? "soft" : "outline"}>
          {isActive ? t("active") : t("inactive")}
        </Badge>
      }
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t("typeEyebrow")}
      </p>

      {canManage && section.club_section_id ? (
        <div className="mb-3">
          <SectionActiveToggle
            clubId={clubId}
            sectionId={section.club_section_id}
            active={isActive}
            disabled={!canManage}
          />
        </div>
      ) : null}

      <DetailCols2>
        <DetailField k={t("labelSoulsTarget")} v={section.souls_target} />
        <DetailField k={t("labelFee")} v={section.fee} />
      </DetailCols2>

      <div className="mt-4 space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
        {OFFICER_BLOCK_ORDER.map((block) => {
          const people = officers[block.role];
          if (block.omitWhenEmpty && people.length === 0) return null;

          const heading =
            block.headingKey === "directorLabel"
              ? t("directorLabel")
              : block.headingKey === "counselorsLabel"
                ? t("counselorsLabel")
                : translateRole(block.role);

          return (
            <OfficerRoleBlock
              key={block.role}
              heading={heading}
              people={people}
              roleLabel={translateRole(block.role)}
              emptyLabel={t("unassigned")}
              compactList={block.compactList}
            />
          );
        })}
      </div>
    </DetailSection>
  );
}

export function SectionsTab({ data }: SectionsTabProps) {
  const slotTypes = data.clubTypes.slice(0, MAX_SECTION_SLOTS);

  return (
    <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
      {slotTypes.map((clubType, index) => {
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

        return (
          <SectionCard
            key={clubType.club_type_id}
            clubId={data.clubId}
            section={section}
            typeName={clubType.name}
            canManage={data.canCreateSections}
            index={index}
            officers={getSectionOfficers(
              memberGroup?.members ?? [],
              data.leadership,
              clubType.name,
            )}
          />
        );
      })}
    </div>
  );
}
