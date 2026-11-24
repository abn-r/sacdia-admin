import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

interface PageAccessForbiddenProps {
  /** Section name. When given, a PageHeader is rendered (breadcrumbs); the state itself carries the only "no access" title. */
  title?: string;
}

export async function PageAccessForbidden({ title }: PageAccessForbiddenProps = {}) {
  const t = await getTranslations("shared.shell.errors");

  return (
    <div className="space-y-6">
      {title ? <PageHeader title={title} /> : null}
      <ErrorState
        kind="forbidden"
        description={t("forbiddenDescription")}
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard">{t("goHome")}</Link>
          </Button>
        }
      />
    </div>
  );
}
