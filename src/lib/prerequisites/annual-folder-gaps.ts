import { annualFolderMaxPointsFromRankingConfig } from "@/lib/annual-folders/ranking-budget";
import type { AnnualRankingConfig } from "@/lib/api/annual-rankings";

export type AnnualFolderGapId =
  | "years"
  | "club-types"
  | "templates"
  | "ranking"
  | "unions";

export type AnnualFolderGap = {
  id: AnnualFolderGapId;
  screenId: string;
};

function hasCurrentEcclesiasticalYear(
  years: Array<{ start_date: string; end_date: string }>,
  today = new Date(),
): boolean {
  const todayKey = today.toISOString().slice(0, 10);
  return years.some(
    (year) => year.start_date <= todayKey && year.end_date >= todayKey,
  );
}

function hasPublishedTemplate(templates: Array<{ active: boolean }>): boolean {
  return templates.some((template) => template.active);
}

function hasAnnualFolderRanking(configs: AnnualRankingConfig[]): boolean {
  return configs.some(
    (config) =>
      config.active !== false &&
      annualFolderMaxPointsFromRankingConfig(config) != null,
  );
}

/** First blocker for creating or expecting annual folders. One item at a time. */
export function findAnnualFolderSetupGap(args: {
  ecclesiasticalYears: Array<{ start_date: string; end_date: string }>;
  clubTypes: unknown[];
  templates: Array<{ active: boolean }>;
  rankingConfigs: AnnualRankingConfig[];
  includeTemplateGap?: boolean;
  today?: Date;
}): AnnualFolderGap | null {
  if (
    !hasCurrentEcclesiasticalYear(args.ecclesiasticalYears, args.today)
  ) {
    return { id: "years", screenId: "catalogs-ecclesiastical-years" };
  }

  if (args.clubTypes.length === 0) {
    return { id: "club-types", screenId: "catalogs-club-types" };
  }

  if (args.includeTemplateGap !== false && !hasPublishedTemplate(args.templates)) {
    return { id: "templates", screenId: "annual-folders-templates" };
  }

  if (!hasAnnualFolderRanking(args.rankingConfigs)) {
    return { id: "ranking", screenId: "annual-folders-ranking-config" };
  }

  return null;
}

export function findRankingConfigCreateGap(args: {
  unions: unknown[];
  localFields: unknown[];
  clubTypes: unknown[];
  ecclesiasticalYears: Array<{ start_date: string; end_date: string }>;
  today?: Date;
}): AnnualFolderGap | null {
  if (!hasCurrentEcclesiasticalYear(args.ecclesiasticalYears, args.today)) {
    return { id: "years", screenId: "catalogs-ecclesiastical-years" };
  }
  if (args.clubTypes.length === 0) {
    return { id: "club-types", screenId: "catalogs-club-types" };
  }
  if (args.unions.length === 0 && args.localFields.length === 0) {
    return { id: "unions", screenId: "catalogs-unions" };
  }
  return null;
}
