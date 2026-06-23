import { redirect } from "next/navigation";

export default function LegacyAwardCategoriesPage() {
  redirect("/dashboard/annual-folders/ranking-config");
}
