import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CamporeeFormView } from "@/components/camporees/camporee-form-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporees.unionForm");
  return { title: t("titleEdit") };
}

export default async function EditUnionCamporeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CamporeeFormView kind="union" id={id} />;
}
