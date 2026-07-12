import type { Metadata } from "next";
import { panelRedirect } from "@/lib/v2/panel-path-server";
import { redirect, notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_CREATE,
  CAMPOREES_CREATE,
} from "@/lib/auth/permissions";
import { getCamporeeById } from "@/lib/api/camporees";
import {
  listLocalCamporeeVenues,
  type CamporeeVenue,
} from "@/lib/api/camporee-venues";
import { createCamporeeAgendaEventAction } from "@/lib/camporee-events/actions";
import {
  EventFormPage,
  type UserOption,
} from "@/components/camporee-events/event-form-page";
import type { Camporee } from "@/lib/api/camporees";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Nuevo evento" };
}

// ─── Normalizers ───────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function toPositiveNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractCamporee(payload: unknown): AnyRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;
  if (root.data && typeof root.data === "object") {
    const nested = root.data as AnyRecord;
    if (nested.local_camporee_id != null || nested.name != null) return nested;
  }
  if (root.local_camporee_id != null || root.name != null) return root;
  return null;
}

function normalizeCamporee(raw: AnyRecord): Camporee {
  return {
    camporee_id: toPositiveNumber(raw.local_camporee_id ?? raw.camporee_id ?? raw.id) ?? undefined,
    name: String(raw.name ?? ""),
    start_date: String(raw.start_date ?? ""),
    end_date: String(raw.end_date ?? ""),
    local_field_id: toPositiveNumber(raw.local_field_id) ?? undefined,
    includes_adventurers: raw.includes_adventurers === true,
    includes_pathfinders: raw.includes_pathfinders !== false,
    includes_master_guides: raw.includes_master_guides === true,
    active: raw.active !== false,
  };
}

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as T[];
  }
  return [];
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function LocalCamporeeEventNewPage({ params }: { params: Params }) {
  const user = await requireAdminUser();

  const canCreate = hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE]);
  if (!canCreate) panelRedirect("/dashboard/camporees");

  const { id: idParam } = await params;
  const camporeeId = toPositiveNumber(idParam);
  if (!camporeeId) notFound();

  let camporee: Camporee;
  let venues: CamporeeVenue[] = [];

  try {
    const payload = await getCamporeeById(camporeeId);
    const raw = extractCamporee(payload);
    if (!raw) notFound();
    camporee = normalizeCamporee(raw);
  } catch {
    notFound();
  }

  try {
    const venuesPayload = await listLocalCamporeeVenues(camporeeId);
    venues = extractList<CamporeeVenue>(venuesPayload);
  } catch {
    // Degrade gracefully — venues not required to create an event
  }

  // Users list: not fetching from backend in this version — empty list allowed
  // (the form shows "Sin responsable" as default). A future PR can wire
  // a member-list endpoint here.
  const users: UserOption[] = [];

  async function boundAction(
    prev: import("@/lib/camporee-events/actions").CamporeeEventActionState,
    formData: FormData,
  ) {
    "use server";
    formData.set("camporee_id", String(camporeeId));
    return createCamporeeAgendaEventAction(prev, formData);
  }

  return (
    <EventFormPage
      mode="create"
      camporeeId={camporeeId}
      camporee={camporee}
      venues={venues}
      users={users}
      action={boundAction}
    />
  );
}
