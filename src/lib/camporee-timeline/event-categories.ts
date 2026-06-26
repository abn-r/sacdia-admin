import type { EventCategoryId, EventStatus, Section } from "./types";

export interface EventCategoryDef {
  id: EventCategoryId;
  label: string;
  tint: string;
  dot: string;
  border: string;
}

export const EVENT_CATEGORIES: EventCategoryDef[] = [
  { id: "espiritual",  label: "Espiritual",  tint: "bg-cat-espiritual/15 text-cat-espiritual",   dot: "bg-cat-espiritual",   border: "border-cat-espiritual" },
  { id: "competencia", label: "Competencia", tint: "bg-cat-competencia/15 text-cat-competencia", dot: "bg-cat-competencia",  border: "border-cat-competencia" },
  { id: "taller",      label: "Taller",      tint: "bg-cat-taller/15 text-cat-taller",           dot: "bg-cat-taller",       border: "border-cat-taller" },
  { id: "ceremonial",  label: "Ceremonial",  tint: "bg-cat-ceremonial/15 text-cat-ceremonial",   dot: "bg-cat-ceremonial",   border: "border-cat-ceremonial" },
  { id: "social",      label: "Social",      tint: "bg-cat-social/15 text-cat-social",           dot: "bg-cat-social",       border: "border-cat-social" },
  { id: "logistico",   label: "Logístico",   tint: "bg-muted text-muted-foreground",             dot: "bg-muted-foreground", border: "border-muted-foreground" },
];

export const EVENT_CATEGORY_MAP = Object.fromEntries(
  EVENT_CATEGORIES.map((c) => [c.id, c]),
) as Record<EventCategoryId, EventCategoryDef>;

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  programado: "Programado",
  publicado: "Publicado",
  en_curso: "En curso",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export const EVENT_STATUS_VARIANT: Record<
  EventStatus,
  "outline" | "soft-success" | "soft-warning" | "soft-destructive" | "soft-info"
> = {
  programado: "outline",
  publicado: "soft-info",
  en_curso: "soft-warning",
  realizado: "soft-success",
  cancelado: "soft-destructive",
};

export const SECTION_COLOR: Record<Section, { tint: string; dot: string }> = {
  Aventureros:    { tint: "bg-section-aventureros/15 text-section-aventureros",       dot: "bg-section-aventureros" },
  Conquistadores: { tint: "bg-section-conquistadores/15 text-section-conquistadores", dot: "bg-section-conquistadores" },
  "Guías Mayores": { tint: "bg-section-guias/15 text-section-guias",                  dot: "bg-section-guias" },
};
