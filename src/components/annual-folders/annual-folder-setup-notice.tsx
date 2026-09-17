"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { PrerequisiteNotice } from "@/components/shared/prerequisite-notice";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import type { AnnualFolderGap } from "@/lib/prerequisites/annual-folder-gaps";
import { resolvePrerequisiteHref } from "@/lib/prerequisites/resolve-prerequisite-href";

type AnnualFolderSetupNoticeProps = {
  gap: AnnualFolderGap | null;
};

function setupGapCopy(
  t: ReturnType<typeof useTranslations<"annual_folders.setup">>,
  gap: AnnualFolderGap,
) {
  switch (gap.id) {
    case "years":
      return { description: t("years"), actionLabel: t("go.years") };
    case "club-types":
      return { description: t("club-types"), actionLabel: t("go.club-types") };
    case "templates":
      return { description: t("templates"), actionLabel: t("go.templates") };
    case "ranking":
      return { description: t("ranking"), actionLabel: t("go.ranking") };
    case "unions":
      return { description: t("unions"), actionLabel: t("go.unions") };
  }
}

export function AnnualFolderSetupNotice({ gap }: AnnualFolderSetupNoticeProps) {
  const t = useTranslations("annual_folders.setup");
  const { subject } = useScreenAccess();

  const items = useMemo(() => {
    if (!gap) return [];
    const copy = setupGapCopy(t, gap);
    return [
      {
        id: gap.id,
        description: copy.description,
        href: resolvePrerequisiteHref(subject, gap.screenId),
        actionLabel: copy.actionLabel,
      },
    ];
  }, [gap, subject, t]);

  return (
    <PrerequisiteNotice
      title={t("title")}
      items={items}
      contactAdminLabel={t("contactAdmin")}
    />
  );
}
