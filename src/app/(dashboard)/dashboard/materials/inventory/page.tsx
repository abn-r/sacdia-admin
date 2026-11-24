import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Inventario joined Catálogo (tab Productos); filters carry over. */
export default async function MaterialsInventoryRedirectPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["q", "cat", "page", "local_field_id"]) {
    const value = raw[key];
    if (typeof value === "string" && value) params.set(key, value);
  }
  const qs = params.toString();
  redirect(`/dashboard/materials/catalog${qs ? `?${qs}` : ""}`);
}
