import type { Metadata } from "next";
import { EventFormPageFrame } from "@/components/camporee-events/event-form-page-frame";
import { requireAdminUser } from "@/lib/auth/session";
import {
  loadCreateCamporeeEventFormData,
  resolveEventFormData,
} from "@/lib/camporee-events/event-form-data";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Nuevo evento" };
}

export default async function LocalCamporeeEventNewPage({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id } = await params;
  const props = resolveEventFormData(await loadCreateCamporeeEventFormData(user, "local", id));

  return <EventFormPageFrame scope="local" props={props} />;
}
