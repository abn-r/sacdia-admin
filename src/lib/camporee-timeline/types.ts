export type Section = "Aventureros" | "Conquistadores" | "Guías Mayores";

export type EventCategoryId =
  | "espiritual"
  | "competencia"
  | "taller"
  | "ceremonial"
  | "social"
  | "logistico";

// Backend enum value is `en_curso` (Prisma @map). Keep this union aligned to
// the wire contract to avoid round-trip mismatches between UI and API.
export type EventStatus =
  | "programado"
  | "publicado"
  | "en_curso"
  | "realizado"
  | "cancelado";

export type TemplateScope = "union" | "local_field";

export type CamporeeType = "union" | "local";

export interface Venue {
  id: string;
  name: string;
  capacity: number;
}

export interface CamporeeDay {
  id: string;
  numero: number;
  fecha: string;
  diaSemana: string;
  fechaFmt: string;
}

export interface EventTemplate {
  id: string;
  title: string;
  description: string;
  category: EventCategoryId;
  scope: TemplateScope;
  scopeId: string;
  durationMin: number;
  sections: Section[];
  defaultPoints?: number;
  defaultCapacity?: number;
  createdBy: string;
  uses: number;
  lastUsedAt?: string;
  lastUsedAtCamporee?: string;
}

export interface CamporeeEvent {
  id: string;
  camporeeId: string;
  templateId: string | null;
  title: string;
  description: string;
  category: EventCategoryId;
  dayNumber: number;
  startsAt: string;
  endsAt: string;
  venueId: string;
  leaderName: string;
  leaderRole?: string;
  sections: Section[];
  capacity: number;
  registered: number;
  points: number;
  status: EventStatus;
  fromCatalog: boolean;
}

export interface CamporeeEventsData {
  camporeeId: string;
  camporeeType: CamporeeType;
  unionName: string;
  localFieldName?: string;
  days: CamporeeDay[];
  venues: Venue[];
  events: CamporeeEvent[];
  templates: EventTemplate[];
  summary: {
    total: number;
    published: number;
    cancelled: number;
    venuesUsed: number;
    hoursOfContent: number;
    fromCatalog: number;
    new: number;
  };
}
