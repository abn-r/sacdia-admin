import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Legacy route: the window now lives in the unified investiture settings. */
export default async function LegacyInvestitureSettingsRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
  for (const key of ["local_field_id", "year"]) {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first) next.set(key, first);
  }
  const qs = next.toString();
  redirect(`/dashboard/configuration/investiture${qs ? `?${qs}` : ""}`);
}
