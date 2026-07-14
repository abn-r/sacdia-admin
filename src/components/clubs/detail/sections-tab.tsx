"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { LayoutGrid, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRoleLabel } from "@/lib/auth/role-labels";
import {
  createClubSectionAction,
  type DetailActionState,
} from "@/lib/clubs/detail-actions";
import {
  formatLeaderName,
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

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      {label}
    </Button>
  );
}

function CreateSectionSlot({
  clubId,
  clubTypeId,
  typeName,
  canCreate,
}: {
  clubId: number;
  clubTypeId: number;
  typeName: string;
  canCreate: boolean;
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
            <p className="text-sm font-medium text-muted-foreground">{typeName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("notCreated")}</p>
          </div>
        </div>

        {canCreate ? (
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
            <div className="space-y-1">
              <Label htmlFor={`section-name-${clubTypeId}`}>{t("labelName")}</Label>
              <Input
                id={`section-name-${clubTypeId}`}
                name="name"
                placeholder={t("placeholderName", { type: typeName })}
                defaultValue={typeName}
              />
              {state.fieldErrors?.name ? (
                <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`section-souls-${clubTypeId}`}>{t("labelSoulsTarget")}</Label>
                <Input
                  id={`section-souls-${clubTypeId}`}
                  name="souls_target"
                  type="number"
                  min="0"
                  defaultValue="0"
                />
                {state.fieldErrors?.souls_target ? (
                  <p className="text-xs text-destructive">{state.fieldErrors.souls_target}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`section-fee-${clubTypeId}`}>{t("labelFee")}</Label>
                <Input
                  id={`section-fee-${clubTypeId}`}
                  name="fee"
                  type="number"
                  min="0"
                  defaultValue="0"
                />
                {state.fieldErrors?.fee ? (
                  <p className="text-xs text-destructive">{state.fieldErrors.fee}</p>
                ) : null}
              </div>
            </div>
            <SubmitButton label={t("createButton")} />
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

function SectionCard({
  section,
  typeName,
  directorName,
  directorImage,
}: {
  section: ClubSectionRaw;
  typeName: string;
  directorName: string | null;
  directorImage: string | null;
}) {
  const t = useTranslations("clubs.detail.sections");
  const translateRole = useRoleLabel();

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {typeName}
            </p>
            <h3 className="text-lg font-semibold">{section.name ?? typeName}</h3>
          </div>
          <Badge variant={section.active !== false ? "default" : "outline"}>
            {section.active !== false ? t("active") : t("inactive")}
          </Badge>
        </div>

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
            <CreateSectionSlot
              key={clubType.club_type_id}
              clubId={data.clubId}
              clubTypeId={clubType.club_type_id}
              typeName={clubType.name}
              canCreate={data.canCreateSections}
            />
          );
        }

        const director = getSectionDirector(
          data.leadership,
          section.name ?? clubType.name,
        );

        return (
          <SectionCard
            key={clubType.club_type_id}
            section={section}
            typeName={clubType.name}
            directorName={director ? formatLeaderName(director) : null}
            directorImage={director?.user_image ?? null}
          />
        );
      })}
    </div>
  );
}
