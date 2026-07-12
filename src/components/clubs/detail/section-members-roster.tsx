"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ClubLeadership, LeadershipMember } from "@/lib/api/club-detail";
import type { Unit, UnitUser } from "@/lib/api/units";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionColumn, SectionColumnsGrid } from "./section-column";
import type { SectionView } from "./types";

export type SectionRosterEntry = {
  id: string;
  name: string;
  role: string;
  unitName?: string;
  image?: string | null;
};

type RosterGroup = {
  id: string;
  title: string;
  accent: string;
  entries: SectionRosterEntry[];
  isGeneral?: boolean;
};

interface SectionMembersRosterProps {
  sections: SectionView[];
  units: Unit[];
  leadership?: ClubLeadership;
}

export function SectionMembersRoster({
  sections,
  units,
  leadership,
}: SectionMembersRosterProps) {
  const t = useTranslations("clubs.detail.overview");

  const groups = useMemo(() => {
    const roleLabels = {
      captain: t("roleCaptain"),
      secretary: t("roleSecretary"),
      advisor: t("roleAdvisor"),
      substituteAdvisor: t("roleSubstituteAdvisor"),
      member: t("roleMember"),
    };
    return buildRosterGroups(
      sections,
      units,
      leadership,
      roleLabels,
      t("generalSectionLabel"),
    );
  }, [sections, units, leadership, t]);

  const generalGroup = groups.find((group) => group.isGeneral);
  const sectionGroups = groups.filter((group) => !group.isGeneral);

  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-normal">{t("membersRosterTitle")}</CardTitle>
          <CardDescription>{t("membersRosterSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("noSectionsYet")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">{t("membersRosterTitle")}</CardTitle>
        <CardDescription>{t("membersRosterSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {generalGroup ? (
          <RosterColumn group={generalGroup} emptyLabel={t("membersRosterEmpty")} countLabel={t("membersRosterCount", { count: generalGroup.entries.length })} />
        ) : null}

        <SectionColumnsGrid>
          {sectionGroups.map((group) => (
            <RosterColumn
              key={group.id}
              group={group}
              emptyLabel={t("membersRosterEmpty")}
              countLabel={t("membersRosterCount", { count: group.entries.length })}
            />
          ))}
        </SectionColumnsGrid>
      </CardContent>
    </Card>
  );
}

function RosterColumn({
  group,
  emptyLabel,
  countLabel,
}: {
  group: RosterGroup;
  emptyLabel: string;
  countLabel: string;
}) {
  return (
    <SectionColumn title={group.title} accent={group.accent} countLabel={countLabel}>
      {group.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {group.entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MemberAvatar name={entry.name} image={entry.image} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.name}
                  </p>
                  {entry.unitName ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.unitName}
                    </p>
                  ) : null}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs font-normal">
                {entry.role}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </SectionColumn>
  );
}

function MemberAvatar({
  name,
  image,
}: {
  name: string;
  image?: string | null;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="size-9 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {initials || "—"}
    </span>
  );
}

function buildRosterGroups(
  sections: SectionView[],
  units: Unit[],
  leadership: ClubLeadership | undefined,
  roles: {
    captain: string;
    secretary: string;
    advisor: string;
    substituteAdvisor: string;
    member: string;
  },
  generalSectionLabel: string,
): RosterGroup[] {
  const leadershipBySectionName = groupLeadershipBySectionName(leadership);
  const groups: RosterGroup[] = [];

  const generalLeadership = leadershipBySectionName.get("") ?? [];
  if (generalLeadership.length > 0) {
    groups.push({
      id: "general",
      title: generalSectionLabel,
      accent: "var(--color-muted-foreground)",
      isGeneral: true,
      entries: generalLeadership.map((member) => ({
        id: `leadership-${member.assignment_id}`,
        name: formatUserName(member),
        role: humanizeRole(member.role_name),
        image: member.user_image,
      })),
    });
  }

  for (const section of sections) {
    const entries: SectionRosterEntry[] = [];
    const seen = new Set<string>();

    const sectionNameKey = section.label.trim().toLowerCase();
    const leadershipMembers =
      leadershipBySectionName.get(sectionNameKey) ??
      leadershipBySectionName.get(section.label) ??
      [];

    for (const member of leadershipMembers) {
      if (seen.has(member.user_id)) continue;
      seen.add(member.user_id);
      entries.push({
        id: `leadership-${member.assignment_id}`,
        name: formatUserName(member),
        role: humanizeRole(member.role_name),
        image: member.user_image,
      });
    }

    const sectionUnits = units.filter(
      (unit) => unit.club_section_id === section.sectionId && unit.active,
    );

    for (const unit of sectionUnits) {
      addUnitRole(entries, seen, unit.captain_id, unit.users_units_captain_idTousers, roles.captain, unit.name);
      addUnitRole(entries, seen, unit.secretary_id, unit.users_units_secretary_idTousers, roles.secretary, unit.name);
      addUnitRole(entries, seen, unit.advisor_id, unit.users_units_advisor_idTousers, roles.advisor, unit.name);
      addUnitRole(
        entries,
        seen,
        unit.substitute_advisor_id ?? undefined,
        unit.users_units_as_substitute_advisor,
        roles.substituteAdvisor,
        unit.name,
      );

      for (const member of unit.unit_members?.filter((m) => m.active) ?? []) {
        if (seen.has(member.user_id)) continue;
        seen.add(member.user_id);
        entries.push({
          id: `member-${member.unit_member_id}`,
          name: formatUnitUser(member.users, member.user_id),
          role: roles.member,
          unitName: unit.name,
          image: member.users?.user_image,
        });
      }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name, "es"));
    groups.push({
      id: String(section.sectionId ?? section.kind),
      title: section.label,
      accent: section.meta.donutHex,
      entries,
    });
  }

  return groups;
}

function addUnitRole(
  entries: SectionRosterEntry[],
  seen: Set<string>,
  userId: string | undefined,
  user: UnitUser | null | undefined,
  role: string,
  unitName: string,
) {
  if (!userId || seen.has(userId)) return;
  seen.add(userId);
  entries.push({
    id: `unit-role-${userId}-${role}`,
    name: formatUnitUser(user, userId),
    role,
    unitName,
    image: user?.user_image,
  });
}

function groupLeadershipBySectionName(leadership?: ClubLeadership) {
  const map = new Map<string, LeadershipMember[]>();
  if (!leadership) return map;

  const members: LeadershipMember[] = [];
  if (leadership.director) members.push(leadership.director);
  members.push(...leadership.deputies, ...leadership.secretaries, ...leadership.others);

  for (const member of members) {
    const key = (member.section_name?.trim() || "").toLowerCase();
    const list = map.get(key) ?? [];
    list.push(member);
    map.set(key, list);
  }
  return map;
}

function formatUserName(member: LeadershipMember): string {
  const parts = [member.name, member.paternal_last_name].filter(Boolean);
  const joined = parts.join(" ").trim();
  return joined || member.email || "—";
}

function formatUnitUser(user: UnitUser | null | undefined, userId: string): string {
  const parts = [user?.name, user?.paternal_last_name].filter(Boolean);
  const joined = parts.join(" ").trim();
  return joined || userId;
}

function humanizeRole(roleName: string): string {
  return roleName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
