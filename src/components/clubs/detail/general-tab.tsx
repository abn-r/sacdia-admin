"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { clubLocationName } from "@/components/clubs/detail/location";
import { FactList, SectionBlock } from "@/components/clubs/detail/section-block";
import { findSectionDirectorMember } from "@/lib/clubs/types";
import { uniqueMemberCount } from "@/lib/clubs/detail-members";
import { isClubSectionActive, type ClubDetailPayload } from "@/lib/clubs/types";

interface GeneralTabProps {
  data: ClubDetailPayload;
}

/**
 * Club data plus one row per section. Members have their own tab: this tab no
 * longer lists them section by section.
 */
export function GeneralTab({ data }: GeneralTabProps) {
  const t = useTranslations("clubs.detail.general");
  const tNew = useTranslations("people.clubDetail");
  const { club, sectionMemberGroups } = data;
  const groups = [...sectionMemberGroups].sort(
    (left, right) => Number(isClubSectionActive(right)) - Number(isClubSectionActive(left)),
  );
  const localField = clubLocationName(club.local_field, club.local_fields);
  const district = clubLocationName(club.district, club.districts);
  const church = clubLocationName(club.church, club.churches);
  const address = club.address?.trim() || undefined;
  const description = club.description?.trim() || undefined;

  return (
    <div className="space-y-6">
      <SectionBlock title={t("clubInfoTitle")}>
        <div className="rounded-xl bg-card p-5 shadow-card">
          <FactList
            items={[
              { label: t("labelName"), value: club.name ?? "—" },
              { label: t("labelLocalField"), value: localField ?? "—", muted: !localField },
              { label: t("labelAddress"), value: address ?? "—", muted: !address },
              { label: t("labelDistrict"), value: district ?? "—", muted: !district },
              { label: t("labelDescription"), value: description ?? "—", muted: !description },
              { label: t("labelChurch"), value: church ?? "—", muted: !church },
            ]}
          />
        </div>
      </SectionBlock>

      <SectionBlock title={tNew("general.sectionsHeading")}>
        {groups.length === 0 ? (
          <EmptyState icon={LayoutGrid} title={t("noSections")} />
        ) : (
          <ul className="divide-y rounded-xl bg-card shadow-card">
            {groups.map((group) => {
              const active = isClubSectionActive(group);
              const director = findSectionDirectorMember(group.members);
              return (
                <li
                  key={group.sectionId}
                  className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3"
                >
                  <span className="flex min-w-40 items-center gap-2 font-medium">
                    {group.sectionName}
                    <ExceptionStatus<"active" | "inactive">
                      value={active ? "active" : "inactive"}
                      normal={["active"]}
                      labels={{
                        active: tNew("general.sectionActive"),
                        inactive: tNew("general.sectionInactive"),
                      }}
                      intents={{ inactive: "neutral" }}
                    />
                  </span>
                  <dl className="flex flex-1 flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex gap-1.5">
                      <dt>{tNew("general.director")}</dt>
                      <dd className="font-medium text-foreground">
                        {director?.name ?? tNew("general.noDirector")}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt>{t("labelMembers")}</dt>
                      <dd className="font-medium text-foreground tabular-nums">
                        {uniqueMemberCount(group.members)}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt>{t("labelFee")}</dt>
                      <dd className="font-medium text-foreground tabular-nums">
                        {group.fee ?? "—"}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt>{t("labelSoulsTarget")}</dt>
                      <dd className="font-medium text-foreground tabular-nums">
                        {group.soulsTarget ?? "—"}
                      </dd>
                    </div>
                  </dl>
                  <Link
                    href={`/dashboard/clubs/${data.clubId}?tab=sections&section=${group.sectionId}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {tNew("general.viewSection")}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SectionBlock>
    </div>
  );
}
