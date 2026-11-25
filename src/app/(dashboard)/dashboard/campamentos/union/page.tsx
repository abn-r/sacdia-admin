import { redirect } from "next/navigation";

/** The union list is the "Unión" tab of the single camporee list. */
export default function UnionCamporeesRedirect() {
  redirect("/dashboard/campamentos?tab=union");
}
