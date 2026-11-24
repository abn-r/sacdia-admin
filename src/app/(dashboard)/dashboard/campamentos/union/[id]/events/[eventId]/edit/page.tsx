import type { Metadata } from "next";
import { EventFormPageFrame } from "@/components/camporee-events/event-form-page-frame";
import { requireAdminUser } from "@/lib/auth/session";
import {
  loadEditCamporeeEventFormData,
  resolveEventFormData,
} from "@/lib/camporee-events/event-form-data";

type Params = Promise<{ id: string; eventId: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Editar evento" };
}

export default async function UnionCamporeeEventEditPage({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id, eventId } = await params;
  const props = resolveEventFormData(await loadEditCamporeeEventFormData(user, "union", id, eventId));

  return <EventFormPageFrame scope="union" props={props} />;
}
