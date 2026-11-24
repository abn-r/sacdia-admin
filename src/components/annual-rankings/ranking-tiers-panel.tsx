"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { SettingsRow, SettingsSaveBar, SettingsSection } from "@/components/shared/settings-rows";
import { Input } from "@/components/ui/input";
import { buildRankingTierSchema } from "@/lib/annual-rankings/annual-ranking-config-validation";
import { updateRankingTier, type RankingTier } from "@/lib/api/annual-rankings";
import { useToastError } from "@/lib/feedback/toast-retry";

interface RankingTiersPanelProps {
  initialTiers: RankingTier[];
}

/** Recognitions as settings rows with one «Guardar»: only the changed ones are sent. */
export function RankingTiersPanel({ initialTiers }: RankingTiersPanelProps) {
  const t = useTranslations("evaluation.progress.annual.config.recognitions");
  const tValidation = useTranslations("annual_folders.rankingConfigValidation");
  const toastError = useToastError();
  const schema = useMemo(() => buildRankingTierSchema(tValidation), [tValidation]);

  const [tiers, setTiers] = useState(initialTiers);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialTiers.map((tier) => [tier.ranking_tier_id, String(tier.band_percentage)])),
  );
  const [pending, setPending] = useState(false);

  const changed = tiers.filter((tier) => Number(drafts[tier.ranking_tier_id]) !== tier.band_percentage);
  const dirty = changed.length > 0;

  function reset() {
    setDrafts(Object.fromEntries(tiers.map((tier) => [tier.ranking_tier_id, String(tier.band_percentage)])));
  }

  async function save() {
    const parsed = changed.map((tier) => ({
      tier,
      result: schema.safeParse({ ...tier, band_percentage: Number(drafts[tier.ranking_tier_id]) }),
    }));
    const invalid = parsed.find((entry) => !entry.result.success);
    if (invalid && !invalid.result.success) {
      toast.error(invalid.result.error.issues[0]?.message ?? t("invalidPercent"));
      return;
    }

    setPending(true);
    const saved: RankingTier[] = [];
    let failed: RankingTier | null = null;
    for (const { tier, result } of parsed) {
      if (!result.success) continue;
      try {
        saved.push(
          await updateRankingTier(tier.ranking_tier_id, {
            name: tier.name,
            band_percentage: result.data.band_percentage,
            color: tier.color,
            icon: tier.icon,
            sort_order: tier.sort_order,
            active: tier.active,
          }),
        );
      } catch (error) {
        failed = tier;
        toastError({
          title: t("saveFailed", { tier: tier.name }),
          description: error instanceof Error ? error.message : undefined,
          onRetry: () => void save(),
        });
        break;
      }
    }
    if (saved.length > 0) {
      setTiers((current) => current.map((row) => saved.find((s) => s.ranking_tier_id === row.ranking_tier_id) ?? row));
      if (!failed) toast.success(t("saved"));
    }
    setPending(false);
  }

  return (
    <div className="space-y-2">
      <SettingsSection title={t("title")} description={t("description")}>
        {tiers.map((tier) => (
          <SettingsRow
            key={tier.ranking_tier_id}
            label={
              <span className="flex items-center gap-2">
                {tier.name}
                <ExceptionStatus
                  value={tier.active ? "active" : "inactive"}
                  normal={["active"]}
                  labels={{ active: t("active"), inactive: t("inactive") }}
                  intents={{ inactive: "neutral" }}
                />
              </span>
            }
            control={
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  className="w-24"
                  aria-label={t("bandLabel", { tier: tier.name })}
                  min={0.01}
                  step={0.01}
                  value={drafts[tier.ranking_tier_id] ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, [tier.ranking_tier_id]: event.target.value }))
                  }
                />
                <span className="text-sm text-muted-foreground" aria-hidden>
                  %
                </span>
              </div>
            }
          />
        ))}
      </SettingsSection>
      <SettingsSaveBar dirty={dirty} pending={pending} onSave={() => void save()} onCancel={reset} />
    </div>
  );
}
