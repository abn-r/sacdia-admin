"use client";

import { EventsTimelineView } from "./timeline/events-timeline-view";
import { backendToTimeline } from "@/lib/camporee-timeline/mapper";
import type { BackendCamporeeEvent, CamporeeEventTemplate } from "@/lib/api/camporee-events";
import type { CamporeeVenue } from "@/lib/api/camporee-venues";
import type { Camporee } from "@/lib/api/camporees";

interface CamporeeEventsTabProps {
  camporeeId: number;
  /** Backend event rows fetched server-side — wired from page.tsx */
  initialEvents: BackendCamporeeEvent[];
  availableTemplates: CamporeeEventTemplate[];
  /** Venues accessible to this camporee (union-scoped + local_field-scoped) */
  venues?: CamporeeVenue[];
  /** Full camporee record — needed by mapper for section derivation and date range */
  camporee?: Camporee;
  isUnionCamporee?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
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
  // Build a minimal camporee context when the full record is not yet passed
  // through — this keeps the tab backwards-compatible while Phase 5 wiring lands.
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

  // Patch camporeeType when it is a union camporee — the mapper defaults to
  // "local"; override here since the full union detection isn't yet threaded.
  const viewData = isUnionCamporee ? { ...data, camporeeType: "union" as const } : data;

  return (
    <EventsTimelineView
      camporeeId={String(camporeeId)}
      data={viewData}
      readonly={!canCreate}
    />
  );
}
