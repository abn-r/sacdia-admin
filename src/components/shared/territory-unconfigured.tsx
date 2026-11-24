import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

/**
 * Shown instead of every dashboard page when a territorial or admin role has
 * no territory: the API answers those accounts 403, so the panel is unusable.
 * Uses the muted `forbidden` kind (ErrorState honors a custom icon there).
 */
export async function TerritoryUnconfigured() {
  const t = await getTranslations("shared.shell.errors");

  return (
    <ErrorState
      kind="forbidden"
      icon={MapPin}
      title={t("territoryTitle")}
      description={t("territoryDescription")}
      actions={
        <Button variant="outline" asChild>
          {/* Route handler, not a page: a plain anchor avoids client-side routing. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- route handler, not a page */}
          <a href="/api/auth/logout?next=/login">{t("logout")}</a>
        </Button>
      }
    />
  );
}
