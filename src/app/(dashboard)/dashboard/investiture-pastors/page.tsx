import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Legacy route: pastors now live in the unified investiture settings. */
export default async function LegacyInvestiturePastorsRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const value = params.local_field_id;
  const first = Array.isArray(value) ? value[0] : value;
  redirect(
    `/dashboard/configuration/investiture${first ? `?local_field_id=${encodeURIComponent(first)}` : ""}`,
  );
}
