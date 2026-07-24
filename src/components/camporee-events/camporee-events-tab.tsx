"use client";

import { EventsTimelineView } from "./timeline/events-timeline-view";
import { backendToTimeline } from "@/lib/camporee-timeline/mapper";
import type { BackendCamporeeEvent, CamporeeEventTemplate } from "@/lib/api/camporee-events";
import type { CamporeeVenue } from "@/lib/api/camporee-venues";
import type { Camporee } from "@/lib/api/camporees";

interface CamporeeEventsTabProps {
  camporeeId: number;
  initialEvents: BackendCamporeeEvent[];
  availableTemplates: CamporeeEventTemplate[];
  venues?: CamporeeVenue[];
  camporee?: Camporee;
  isUnionCamporee?: boolean;
  canCreate?: boolean;
}

export function CamporeeEventsTab({
  camporeeId,
  initialEvents,
  availableTemplates,
  venues = [],
  camporee,
  isUnionCamporee = false,
  canCreate = false,
}: CamporeeEventsTabProps) {
  const camporeeCtx: Camporee = camporee ?? {
    camporee_id: camporeeId,
    name: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    includes_adventurers: false,
    includes_pathfinders: true,
    includes_master_guides: false,
  };

  const data = backendToTimeline(initialEvents, {
    camporee: camporeeCtx,
    venues,
    templates: availableTemplates,
  });

  const viewData = isUnionCamporee ? { ...data, camporeeType: "union" as const } : data;

  return (
    <EventsTimelineView
      camporeeId={String(camporeeId)}
      data={viewData}
      readonly={!canCreate}
    />
  );
}
