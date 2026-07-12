import { redirect } from "next/navigation";
import { panelRedirect } from "@/lib/v2/panel-path-server";

export default function MaterialesIndexPage() {
  panelRedirect("/dashboard/materials/inbox");
}
