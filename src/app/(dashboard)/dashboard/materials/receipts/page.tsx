import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Comprobantes stopped being a separate queue: it is a tab of the one queue. */
export default async function MaterialsReceiptsRedirectPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = new URLSearchParams({ tab: "receipts" });
  const q = raw["q"];
  if (typeof q === "string" && q) params.set("q", q);
  redirect(`/dashboard/materials/inbox?${params.toString()}`);
}
