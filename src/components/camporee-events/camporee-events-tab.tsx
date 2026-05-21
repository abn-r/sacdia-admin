"use client";

import { EventsTimelineView } from "./timeline/events-timeline-view";
import { buildMockEvents } from "@/lib/camporee-timeline/mock-data";
import type {
  CamporeeEvent,
  CamporeeEventTemplate,
} from "@/lib/api/camporee-events";

// NOTE: This tab is currently rendering a mock-data prototype of the Variant K
// timeline redesign. Backend wiring is pending — see
// docs/superpowers/specs/2026-05-20-camporee-timeline-admin-design.md.
//
// Legacy props (initialEvents, availableTemplates, canEdit, canDelete) are
// accepted for call-site compatibility but currently ignored. They will be
// re-wired once the backend schema for the new agenda model is defined.

interface CamporeeEventsTabProps {
  camporeeId: number;
  initialEvents: CamporeeEvent[];
  availableTemplates: CamporeeEventTemplate[];
  isUnionCamporee?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function CamporeeEventsTab({
  camporeeId,
  isUnionCamporee = false,
  canCreate = false,
}: CamporeeEventsTabProps) {
  const data = buildMockEvents({
    camporeeId: String(camporeeId),
    camporeeType: isUnionCamporee ? "union" : "local",
    unionName: "Tu unión", // TODO: pasar desde page.tsx (props)
    localFieldName: isUnionCamporee ? undefined : "Tu campo local",
  });

  return (
    <EventsTimelineView
      camporeeId={String(camporeeId)}
      data={data}
      readonly={!canCreate}
    />
  );
}
