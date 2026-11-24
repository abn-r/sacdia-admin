import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EventFormPage, type EventFormPageProps } from "@/components/camporee-events/event-form-page";

/**
 * Page around the event form (local and union routes share it): breadcrumbs,
 * title and a way back to the program. The form itself is the long form with
 * sections and a sticky save bar, so there is no card or modal around it.
 */
export function EventFormPageFrame({
  scope,
  props,
}: {
  scope: "local" | "union";
  props: EventFormPageProps;
}) {
  const t = useTranslations("camporees.eventInstanceForm");
  const tList = useTranslations("camporees.pages.list");
  const isEdit = props.mode === "edit";
  const title = isEdit ? t("titleEdit") : t("titleCreate");
  const rootHref = scope === "union" ? "/dashboard/campamentos/union" : "/dashboard/campamentos";
  const detailHref = `${rootHref}/${props.camporeeId}?tab=events`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={isEdit ? t("descriptionEdit") : t("descriptionCreate")}
        breadcrumbs={[
          { label: tList("title"), href: rootHref },
          { label: props.camporee.name || tList("title"), href: detailHref },
          { label: title },
        ]}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href={detailHref}>
              <ArrowLeft />
              {t("backToEvents")}
            </Link>
          </Button>
        }
      />
      <EventFormPage {...props} />
    </div>
  );
}
