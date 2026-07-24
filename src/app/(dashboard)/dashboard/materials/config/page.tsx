import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Legacy route — payment methods moved under Configuración. */
export default async function MaterialsConfigRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const lf = raw["local_field_id"];
  const query =
    typeof lf === "string" && lf.length > 0
      ? `?local_field_id=${encodeURIComponent(lf)}`
      : "";
  redirect(`/dashboard/configuration/local-field/payment-methods${query}`);
}
