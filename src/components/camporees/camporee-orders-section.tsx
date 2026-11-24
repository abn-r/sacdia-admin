"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { errorStateFromError } from "@/lib/api/error-state";
import type { OrdersDraft } from "@/components/camporees/camporee-orders-draft";

/** Order settings as plain fields of the camporee form (saved with the rest). */
export function CamporeeOrdersSection({
  draft,
  onChange,
  loading,
  loadError,
  onRetry,
}: {
  draft: OrdersDraft;
  onChange: (next: OrdersDraft) => void;
  loading: boolean;
  loadError: unknown;
  onRetry: () => void;
}) {
  const t = useTranslations("camporee_orders");

  if (loadError) {
    const state = errorStateFromError(loadError);
    return (
      <ErrorState
        variant="inline"
        kind={state.kind}
        detail={state.detail}
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Checkbox
          id="orders-enabled"
          checked={draft.enabled}
          onCheckedChange={(checked) => onChange({ ...draft, enabled: checked === true })}
        />
        <Label htmlFor="orders-enabled" className="font-normal">
          {t("settings.enabled")}
        </Label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="orders-opens">{t("settings.opensAt")}</Label>
          <Input
            id="orders-opens"
            type="datetime-local"
            value={draft.opensAt}
            onChange={(event) => onChange({ ...draft, opensAt: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="orders-deadline">{t("settings.deadline")}</Label>
          <Input
            id="orders-deadline"
            type="datetime-local"
            value={draft.deadline}
            onChange={(event) => onChange({ ...draft, deadline: event.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("settings.offeringsTitle")}</p>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : draft.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("settings.offeringsEmpty")}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {draft.rows.map((row, index) => (
              <li
                key={row.product_id}
                className="grid grid-cols-[auto_1fr_120px] items-center gap-3 px-3 py-2"
              >
                <Checkbox
                  checked={row.active}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...draft,
                      rows: draft.rows.map((item, i) =>
                        i === index ? { ...item, active: checked === true } : item,
                      ),
                    })
                  }
                  aria-label={row.title}
                />
                <span className="truncate text-sm">{row.title}</span>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={row.pricePesos}
                  disabled={!row.active}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      rows: draft.rows.map((item, i) =>
                        i === index ? { ...item, pricePesos: event.target.value } : item,
                      ),
                    })
                  }
                  aria-label={t("settings.priceLabel", { product: row.title })}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
