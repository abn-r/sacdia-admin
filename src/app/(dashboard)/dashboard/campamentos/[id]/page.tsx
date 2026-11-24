import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CamporeeDetailView } from "@/components/camporees/camporee-detail-view";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporees.pages.list");
  return { title: t("title") };
}

/**
 * Local camporee detail. The payment routes under this segment render this
 * page underneath their modal, so the default export keeps its signature.
 */
export default async function CamporeeDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  return <CamporeeDetailView kind="local" id={id} searchParams={sp} />;
}
