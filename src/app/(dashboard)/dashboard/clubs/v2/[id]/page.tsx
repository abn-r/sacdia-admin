import { redirect } from "next/navigation";
import { readParam } from "@/lib/phase-e-catalogs/fetch-helpers";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ClubV2DetailRedirectPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const tab = readParam(raw, "tab");
  const qs = tab ? `?tab=${encodeURIComponent(tab)}` : "";
  redirect(`/dashboard/clubs/${id}${qs}`);
}
