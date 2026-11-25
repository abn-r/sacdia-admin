import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CamporeeFormView } from "@/components/camporees/camporee-form-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporees.form");
  return { title: t("titleEdit") };
}

export default async function EditCamporeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CamporeeFormView kind="local" id={id} />;
}
