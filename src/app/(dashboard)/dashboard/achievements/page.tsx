import { redirect } from "next/navigation";

export default function LegacyAchievementsRedirectPage() {
  redirect("/dashboard/configuration/achievements");
}
