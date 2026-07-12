import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DesignSystemSandboxPage() {
  await requireAdminUser();
  const t = await getTranslations("designSystemSandbox");

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("description")} />

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("patterns.listTitle")}</CardTitle>
            <CardDescription>{t("patterns.listDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Club Ejemplo</p>
                  <p className="text-sm text-muted-foreground">Campo · Distrito · Iglesia</p>
                </div>
                <Badge variant="soft-warning">{t("sample.pending")}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("patterns.hubTitle")}</CardTitle>
            <CardDescription>{t("patterns.hubDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
              <p className="text-sm font-medium">{t("sample.alert")}</p>
              <Button size="sm" className="mt-3">
                {t("sample.action")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
