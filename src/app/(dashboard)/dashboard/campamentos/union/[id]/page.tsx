import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CamporeeDetailView } from "@/components/camporees/camporee-detail-view";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporees.pages.union");
  return { title: t("title") };
}

/**
 * Union camporee detail: the same detail component as the local one, with the
 * union endpoints. Event redirects land here (`?tab=` values still resolve).
 */
export default async function UnionCamporeeDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  return <CamporeeDetailView kind="union" id={id} searchParams={sp} />;
}
