import { redirect } from "next/navigation";

/** Categorías joined Catálogo (tab Categorías). */
export default function MaterialsCategoriesRedirectPage() {
  redirect("/dashboard/materials/catalog?tab=categories");
}
