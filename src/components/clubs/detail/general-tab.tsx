"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberRow } from "@/components/clubs/detail/member-row";
import type { ClubDetailPayload } from "@/lib/clubs/types";

interface GeneralTabProps {
  data: ClubDetailPayload;
}

function locationName(
  primary?: { name?: string | null } | null,
  fallback?: { name?: string | null } | null,
) {
  return primary?.name ?? fallback?.name ?? "—";
}

export function GeneralTab({ data }: GeneralTabProps) {
  const t = useTranslations("clubs.detail.general");
  const { club, sectionMemberGroups } = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("clubInfoTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{t("labelName")}</p>
            <p className="text-sm font-medium">{club.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("labelStatus")}</p>
            <Badge variant={club.active !== false ? "default" : "outline"}>
              {club.active !== false ? t("statusActive") : t("statusInactive")}
            </Badge>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">{t("labelAddress")}</p>
            <p className="text-sm">{club.address?.trim() || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("labelLocalField")}</p>
            <p className="text-sm">
              {locationName(club.local_field, club.local_fields)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("labelDistrict")}</p>
            <p className="text-sm">{locationName(club.district, club.districts)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("labelChurch")}</p>
            <p className="text-sm">{locationName(club.church, club.churches)}</p>
          </div>
        </CardContent>
      </Card>

      {sectionMemberGroups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("noSections")}
          </CardContent>
        </Card>
      ) : (
        sectionMemberGroups.map((group) => (
          <Card key={group.sectionId}>
            <CardHeader className="space-y-1">
              <CardTitle>{group.sectionName}</CardTitle>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>
                  {t("labelSoulsTarget")}:{" "}
                  <strong className="text-foreground">
                    {group.soulsTarget ?? "—"}
                  </strong>
                </span>
                <span>
                  {t("labelFee")}:{" "}
                  <strong className="text-foreground">{group.fee ?? "—"}</strong>
                </span>
                <span>
                  {t("membersCount", { count: group.members.length })}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noMembers")}</p>
              ) : (
                group.members.map((member) => (
                  <MemberRow
                    key={`${group.sectionId}-${member.user_id}-${member.assignment_id ?? member.role ?? "member"}`}
                    member={member}
                  />
                ))
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
