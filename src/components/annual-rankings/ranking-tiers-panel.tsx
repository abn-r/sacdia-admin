"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Medal, Save } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { flagStatusIntent } from "@/lib/status/flag-status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildRankingTierSchema } from "@/lib/annual-rankings/annual-ranking-config-validation";
import {
  updateRankingTier,
  type RankingTier,
} from "@/lib/api/annual-rankings";

interface RankingTiersPanelProps {
  initialTiers: RankingTier[];
}

export function RankingTiersPanel({ initialTiers }: RankingTiersPanelProps) {
  const t = useTranslations("annual_folders.rankingTiersPanel");
  const tValidation = useTranslations("annual_folders.rankingConfigValidation");
  const rankingTierSchema = useMemo(() => buildRankingTierSchema(tValidation), [tValidation]);
  const [tiers, setTiers] = useState(initialTiers);
  const [tierDrafts, setTierDrafts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      initialTiers.map((tier) => [tier.ranking_tier_id, tier.band_percentage]),
    ),
  );
  const [savingTierId, setSavingTierId] = useState<string | null>(null);

  async function handleSaveTier(tier: RankingTier) {
    const draft = tierDrafts[tier.ranking_tier_id];
    const parsed = rankingTierSchema.safeParse({
      ...tier,
      band_percentage: draft,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("invalidPercent"));
      return;
    }

    setSavingTierId(tier.ranking_tier_id);
    try {
      const updated = await updateRankingTier(tier.ranking_tier_id, {
        name: tier.name,
        band_percentage: parsed.data.band_percentage,
        color: tier.color,
        icon: tier.icon,
        sort_order: tier.sort_order,
        active: tier.active,
      });
      setTiers((current) =>
        current.map((row) =>
          row.ranking_tier_id === updated.ranking_tier_id ? updated : row,
        ),
      );
      toast.success(t("tierUpdated"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("saveFailed");
      toast.error(message);
    } finally {
      setSavingTierId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <Medal className="size-[18px] text-foreground" />
          </div>
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colTier")}</TableHead>
              <TableHead>{t("colBand")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead className="text-right">{t("colAction")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier) => (
              <TableRow key={tier.ranking_tier_id}>
                <TableCell className="font-medium">{tier.name}</TableCell>
                <TableCell>
                  <div className="flex max-w-40 items-center gap-2">
                    <Input
                      type="number"
                      aria-label={t("bandLabel", { tier: tier.name })}
                      min={0.01}
                      step={0.01}
                      value={tierDrafts[tier.ranking_tier_id] ?? ""}
                      onChange={(event) =>
                        setTierDrafts((current) => ({
                          ...current,
                          [tier.ranking_tier_id]: Number(event.target.value),
                        }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge intent={flagStatusIntent(tier.active)} label={tier.active ? t("active") : t("inactive")} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    loading={savingTierId === tier.ranking_tier_id}
                    size="sm"
                    variant="outline"
                    onClick={() => handleSaveTier(tier)}
                  >
                    <Save />
                    {t("save")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
