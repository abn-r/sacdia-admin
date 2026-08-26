"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { MemberRow } from "@/components/clubs/detail/member-row";
import { clubLocationName } from "@/components/clubs/detail/location";
import {
  DetailSection,
  DetailField,
  DetailCols2,
} from "@/components/users/detail/section";
import type { ClubDetailPayload } from "@/lib/clubs/types";

interface GeneralTabProps {
  data: ClubDetailPayload;
}

function padNum(n: number) {
  return String(n).padStart(2, "0");
}

export function GeneralTab({ data }: GeneralTabProps) {
  const t = useTranslations("clubs.detail.general");
  const { club, sectionMemberGroups } = data;
  const localField = clubLocationName(club.local_field, club.local_fields);
  const district = clubLocationName(club.district, club.districts);
  const church = clubLocationName(club.church, club.churches);
  const address = club.address?.trim() || undefined;

  return (
    <div className="space-y-3.5">
      <DetailSection num="01" title={t("clubInfoTitle")}>
        <DetailCols2>
          <div>
            <DetailField k={t("labelName")} v={club.name} />
            <DetailField
              k={t("labelStatus")}
              v={
                <Badge variant={club.active !== false ? "soft" : "outline"}>
                  {club.active !== false ? t("statusActive") : t("statusInactive")}
                </Badge>
              }
            />
            <DetailField k={t("labelAddress")} v={address} muted={!address} />
          </div>
          <div>
            <DetailField k={t("labelLocalField")} v={localField} muted={!localField} />
            <DetailField k={t("labelDistrict")} v={district} muted={!district} />
            <DetailField k={t("labelChurch")} v={church} muted={!church} />
          </div>
        </DetailCols2>
      </DetailSection>

      {sectionMemberGroups.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">{t("noSections")}</p>
        </div>
      ) : (
        sectionMemberGroups.map((group, index) => (
          <DetailSection
            key={group.sectionId}
            num={padNum(index + 2)}
            title={group.sectionName}
          >
            <DetailCols2 className="sm:grid-cols-3">
              <DetailField k={t("labelSoulsTarget")} v={group.soulsTarget} />
              <DetailField k={t("labelFee")} v={group.fee} />
              <DetailField
                k={t("labelMembers")}
                v={group.members.length}
              />
            </DetailCols2>

            <div className="mt-4 grid gap-2.5">
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
            </div>
          </DetailSection>
        ))
      )}
    </div>
  );
}
