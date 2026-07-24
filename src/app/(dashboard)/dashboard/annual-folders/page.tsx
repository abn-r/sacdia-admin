import { redirect } from "next/navigation";

export default function LegacyAnnualFoldersPage() {
  redirect("/dashboard/clubs/evidence-folders");
}
