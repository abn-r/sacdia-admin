import { redirect } from "next/navigation";
import { readParam } from "@/lib/phase-e-catalogs/fetch-helpers";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ClubsV2RedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();

  for (const key of ["page", "limit", "search", "name", "q", "active", "localFieldId"]) {
    const value = readParam(raw, key);
    if (value) params.set(key === "name" || key === "q" ? "search" : key, value);
  }

  const qs = params.toString();
  redirect(qs ? `/dashboard/clubs?${qs}` : "/dashboard/clubs");
}
