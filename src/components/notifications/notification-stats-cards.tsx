import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NotificationStatsResponse } from "@/lib/api/notifications";

interface NotificationStatsCardsProps {
  stats: NotificationStatsResponse;
}

function formatRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 1000) / 10}%`;
}

export async function NotificationStatsCards({
  stats,
}: NotificationStatsCardsProps) {
  const t = await getTranslations("configuration.notifications.stats");

  const recentSent = stats.dailyDeliveryRate.reduce(
    (acc, row) => acc + row.tokens_sent,
    0,
  );
  const recentFailed = stats.dailyDeliveryRate.reduce(
    (acc, row) => acc + row.tokens_failed,
    0,
  );
  const recentTotal = recentSent + recentFailed;
  const recentRate =
    recentTotal === 0 ? null : recentSent / recentTotal;

  const cards = [
    { label: t("activeTokens"), value: stats.activeTokens.toLocaleString("es-MX") },
    {
      label: t("inactiveTokens"),
      value: stats.inactiveTokens30d.toLocaleString("es-MX"),
    },
    { label: t("sent30d"), value: recentSent.toLocaleString("es-MX") },
    { label: t("successRate30d"), value: formatRate(recentRate) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="gap-2 py-4">
          <CardHeader className="pb-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
