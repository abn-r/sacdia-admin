import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CamporeeFormView } from "@/components/camporees/camporee-form-view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporees.form");
  return { title: t("titleCreate") };
}

/** `?kind=union` creates a union camporee; local is the default. */
export default async function NewCamporeePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return <CamporeeFormView kind={sp.kind === "union" ? "union" : "local"} />;
}
