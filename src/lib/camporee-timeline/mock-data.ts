import { durMin } from "./helpers";
import type {
  CamporeeEventsData,
  CamporeeType,
  CamporeeEvent,
  EventTemplate,
} from "./types";

export interface BuildMockArgs {
  camporeeId: string;
  camporeeType: CamporeeType;
  unionName: string;
  localFieldName?: string;
  startDate?: string;
}

const DAY_NAMES_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function formatDayShort(d: Date): string {
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}

const VENUES = [
  { id: "v1", name: "Anfiteatro Central",   capacity: 1500 },
  { id: "v2", name: "Cancha A — Atletismo", capacity: 600 },
  { id: "v3", name: "Cancha B — Voleibol",  capacity: 400 },
  { id: "v4", name: "Bosque Norte",         capacity: 300 },
  { id: "v5", name: "Aula Múltiple 1",      capacity: 80 },
  { id: "v6", name: "Aula Múltiple 2",      capacity: 80 },
  { id: "v7", name: "Salón Comedor",        capacity: 1200 },
  { id: "v8", name: "Plaza de Banderas",    capacity: 1500 },
];

const EVENTS_TEMPLATE: Omit<CamporeeEvent, "camporeeId">[] = [
  // Day 1
  { id: "e01", templateId: "t22", title: "Recepción y registro de clubes",
    description: "Entrega de credenciales, kits y asignación de campamento.",
    category: "logistico", dayNumber: 1, startsAt: "14:00", endsAt: "16:00",
    venueId: "v8", leaderName: "Pedro Vázquez", leaderRole: "Director de logística",
    sections: ["Aventureros", "Conquistadores", "Guías Mayores"],
    capacity: 1500, registered: 0, points: 0, status: "publicado", fromCatalog: true },
  { id: "e02", templateId: "t14", title: "Ceremonia de apertura",
    description: "Izamiento de banderas, presentación de autoridades.",
    category: "ceremonial", dayNumber: 1, startsAt: "18:00", endsAt: "19:30",
    venueId: "v1", leaderName: "Lucía Ortiz", leaderRole: "Coordinación",
    sections: ["Aventureros", "Conquistadores", "Guías Mayores"],
    capacity: 1500, registered: 0, points: 0, status: "publicado", fromCatalog: true },
  { id: "e03", templateId: null, title: "Devoción inaugural · 'Raíces que florecen'",
    description: "Mensaje inaugural y oración pastoral.",
    category: "espiritual", dayNumber: 1, startsAt: "20:00", endsAt: "21:30",
    venueId: "v1", leaderName: "Pr. Joaquín Mendoza", leaderRole: "Pastor",
    sections: ["Aventureros", "Conquistadores", "Guías Mayores"],
    capacity: 1500, registered: 0, points: 0, status: "publicado", fromCatalog: false },
  // Day 2
  { id: "e04", templateId: "t20", title: "Aerobics matutino",
    description: "Activación física antes del desayuno.",
    category: "social", dayNumber: 2, startsAt: "06:00", endsAt: "06:45",
    venueId: "v2", leaderName: "Karla Soto", leaderRole: "Líder deportes",
    sections: ["Conquistadores", "Guías Mayores"],
    capacity: 600, registered: 412, points: 5, status: "publicado", fromCatalog: true },
  { id: "e05", templateId: "t01", title: "Competencia de nudos y amarres",
    description: "10 nudos cronometrados + amarre cuadrado en equipos de 4.",
    category: "competencia", dayNumber: 2, startsAt: "09:00", endsAt: "11:30",
    venueId: "v4", leaderName: "Erick Mora", leaderRole: "Juez de torneo",
    sections: ["Conquistadores"],
    capacity: 200, registered: 168, points: 50, status: "publicado", fromCatalog: true },
  { id: "e06", templateId: "t10", title: "Especialidad: Aves silvestres",
    description: "Taller con observación de campo en el Bosque Norte.",
    category: "taller", dayNumber: 2, startsAt: "09:00", endsAt: "10:30",
    venueId: "v5", leaderName: "Mtra. Diana Báez", leaderRole: "Instructora",
    sections: ["Conquistadores", "Guías Mayores"],
    capacity: 60, registered: 58, points: 20, status: "publicado", fromCatalog: true },
  { id: "e07", templateId: "t04", title: "Mini-olimpiadas aventureras",
    description: "Estaciones de juegos coordinados, no competitivos.",
    category: "competencia", dayNumber: 2, startsAt: "09:00", endsAt: "11:00",
    venueId: "v3", leaderName: "Lupita Cruz", leaderRole: "Coordinadora",
    sections: ["Aventureros"],
    capacity: 250, registered: 178, points: 30, status: "publicado", fromCatalog: true },
  { id: "e08", templateId: null, title: "Atletismo · Carrera de relevos",
    description: "4x100 por club. Clasificatorias y final.",
    category: "competencia", dayNumber: 2, startsAt: "14:30", endsAt: "16:00",
    venueId: "v2", leaderName: "Jorge Ruiz", leaderRole: "Entrenador",
    sections: ["Conquistadores"],
    capacity: 600, registered: 320, points: 40, status: "publicado", fromCatalog: false },
  { id: "e09", templateId: null, title: "Conferencia GM · Liderazgo",
    description: "Liderazgo de servicio en el club.",
    category: "espiritual", dayNumber: 2, startsAt: "17:00", endsAt: "18:30",
    venueId: "v6", leaderName: "Pr. Joaquín Mendoza", leaderRole: "Pastor",
    sections: ["Guías Mayores"],
    capacity: 80, registered: 72, points: 15, status: "publicado", fromCatalog: false },
  { id: "e10", templateId: "t18", title: "Fogata bíblica",
    description: "Cánticos, testimonios y reflexión nocturna.",
    category: "social", dayNumber: 2, startsAt: "20:00", endsAt: "22:00",
    venueId: "v8", leaderName: "Sofía Martín", leaderRole: "Líder GM",
    sections: ["Aventureros", "Conquistadores", "Guías Mayores"],
    capacity: 1500, registered: 0, points: 0, status: "programado", fromCatalog: true },
  // Day 3
  { id: "e11", templateId: "t02", title: "Orden cerrado",
    description: "Evaluación por jueces certificados. 12 movimientos.",
    category: "competencia", dayNumber: 3, startsAt: "08:30", endsAt: "10:30",
    venueId: "v8", leaderName: "Cap. Raúl Vega", leaderRole: "Juez principal",
    sections: ["Conquistadores", "Guías Mayores"],
    capacity: 800, registered: 542, points: 60, status: "publicado", fromCatalog: true },
  { id: "e12", templateId: "t12", title: "Taller: Manualidades pioneras",
    description: "Construcción guiada con materiales naturales.",
    category: "taller", dayNumber: 3, startsAt: "08:30", endsAt: "10:00",
    venueId: "v5", leaderName: "Beatriz Ríos", leaderRole: "Instructora",
    sections: ["Aventureros"],
    capacity: 80, registered: 64, points: 10, status: "publicado", fromCatalog: true },
  { id: "e13", templateId: "t03", title: "Primeros auxilios — práctica",
    description: "RCP, vendajes, inmovilizaciones. Equipos de 5.",
    category: "competencia", dayNumber: 3, startsAt: "11:00", endsAt: "12:30",
    venueId: "v3", leaderName: "Dra. Sofía Martín", leaderRole: "Médica",
    sections: ["Conquistadores", "Guías Mayores"],
    capacity: 400, registered: 280, points: 50, status: "publicado", fromCatalog: true },
  { id: "e14", templateId: "t07", title: "Hora del hogar",
    description: "Apertura del sábado con cantos y devoción.",
    category: "espiritual", dayNumber: 3, startsAt: "16:00", endsAt: "17:30",
    venueId: "v1", leaderName: "Pr. Joaquín Mendoza", leaderRole: "Pastor",
    sections: ["Aventureros", "Conquistadores", "Guías Mayores"],
    capacity: 1500, registered: 0, points: 0, status: "publicado", fromCatalog: true },
  { id: "e15", templateId: null, title: "Vigilia y ofrenda",
    description: "Servicio especial nocturno.",
    category: "espiritual", dayNumber: 3, startsAt: "19:00", endsAt: "21:00",
    venueId: "v1", leaderName: "Lucía Ortiz", leaderRole: "Coordinación",
    sections: ["Conquistadores", "Guías Mayores"],
    capacity: 1500, registered: 0, points: 0, status: "programado", fromCatalog: false },
  // Day 4
  { id: "e16", templateId: "t09", title: "Escuela Sabática general",
    description: "Clase plenaria con dramatización.",
    category: "espiritual", dayNumber: 4, startsAt: "09:00", endsAt: "11:00",
    venueId: "v1", leaderName: "Pr. Iván Cortés", leaderRole: "Pastor",
    sections: ["Aventureros", "Conquistadores", "Guías Mayores"],
    capacity: 1500, registered: 0, points: 0, status: "publicado", fromCatalog: true },
  { id: "e17", templateId: "t06", title: "Sermón principal",
    description: "Mensaje central del camporee.",
    category: "espiritual", dayNumber: 4, startsAt: "11:30", endsAt: "12:45",
    venueId: "v1", leaderName: "Pr. Joaquín Mendoza", leaderRole: "Pastor",
    sections: ["Aventureros", "Conquistadores", "Guías Mayores"],
    capacity: 1500, registered: 0, points: 0, status: "publicado", fromCatalog: true },
  { id: "e18", templateId: "t17", title: "Bautismos al aire libre",
    description: "Ceremonia de bautismo. Asistencia abierta a los clubes.",
    category: "ceremonial", dayNumber: 4, startsAt: "16:00", endsAt: "18:00",
    venueId: "v4", leaderName: "Pr. Iván Cortés", leaderRole: "Pastor",
    sections: ["Conquistadores", "Guías Mayores"],
    capacity: 500, registered: 22, points: 0, status: "programado", fromCatalog: true },
  { id: "e19", templateId: "t19", title: "Concurso de talentos",
    description: "Cada club presenta un número de hasta 6 minutos.",
    category: "social", dayNumber: 4, startsAt: "19:00", endsAt: "21:30",
    venueId: "v1", leaderName: "Norma Olvera", leaderRole: "MC",
    sections: ["Aventureros", "Conquistadores", "Guías Mayores"],
    capacity: 1500, registered: 412, points: 25, status: "publicado", fromCatalog: true },
  // Day 5
  { id: "e20", templateId: "t05", title: "Gran carrera de obstáculos",
    description: "Circuito de 12 estaciones. Final del torneo.",
    category: "competencia", dayNumber: 5, startsAt: "08:00", endsAt: "10:30",
    venueId: "v4", leaderName: "Cap. Raúl Vega", leaderRole: "Juez principal",
    sections: ["Conquistadores"],
    capacity: 600, registered: 488, points: 80, status: "publicado", fromCatalog: true },
  { id: "e21", templateId: "t16", title: "Investidura de Guías Mayores",
    description: "Ceremonia de investidura para 14 candidatos.",
    category: "ceremonial", dayNumber: 5, startsAt: "11:00", endsAt: "12:30",
    venueId: "v1", leaderName: "Pr. Joaquín Mendoza", leaderRole: "Pastor",
    sections: ["Guías Mayores"],
    capacity: 1500, registered: 14, points: 0, status: "programado", fromCatalog: true },
  { id: "e22", templateId: "t15", title: "Premiación y clausura",
    description: "Entrega de trofeos y palabras de despedida.",
    category: "ceremonial", dayNumber: 5, startsAt: "15:00", endsAt: "16:30",
    venueId: "v1", leaderName: "Lucía Ortiz", leaderRole: "Coordinación",
    sections: ["Aventureros", "Conquistadores", "Guías Mayores"],
    capacity: 1500, registered: 0, points: 0, status: "programado", fromCatalog: true },
];

const TEMPLATES: EventTemplate[] = [
  { id: "t01", title: "Competencia de nudos y amarres", description: "10 nudos cronometrados + amarre cuadrado.",
    category: "competencia", scope: "union", scopeId: "union-1", durationMin: 150,
    sections: ["Conquistadores"], defaultPoints: 50, defaultCapacity: 200,
    createdBy: "Erick Mora", uses: 12, lastUsedAt: "2025-07-19", lastUsedAtCamporee: "Camporee Centro 2025" },
  { id: "t02", title: "Orden cerrado", description: "12 movimientos · jueces certificados.",
    category: "competencia", scope: "union", scopeId: "union-1", durationMin: 120,
    sections: ["Conquistadores", "Guías Mayores"], defaultPoints: 60, defaultCapacity: 800,
    createdBy: "Cap. Raúl Vega", uses: 18, lastUsedAt: "2025-11-09", lastUsedAtCamporee: "Camporee Sur 2025" },
  { id: "t03", title: "Primeros auxilios — práctica", description: "RCP, vendajes e inmovilizaciones.",
    category: "competencia", scope: "union", scopeId: "union-1", durationMin: 90,
    sections: ["Conquistadores", "Guías Mayores"], defaultPoints: 50, defaultCapacity: 400,
    createdBy: "Dra. Sofía Martín", uses: 14, lastUsedAt: "2025-07-19", lastUsedAtCamporee: "Camporee Centro 2025" },
  { id: "t04", title: "Mini-olimpiadas aventureras", description: "Estaciones de juegos coordinados, no competitivos.",
    category: "competencia", scope: "union", scopeId: "union-1", durationMin: 120,
    sections: ["Aventureros"], defaultPoints: 30, defaultCapacity: 250,
    createdBy: "Lupita Cruz", uses: 9, lastUsedAt: "2024-08-14", lastUsedAtCamporee: "Camporee Norte 2024" },
  { id: "t10", title: "Especialidad: Aves silvestres", description: "Observación de campo + cuaderno.",
    category: "taller", scope: "union", scopeId: "union-1", durationMin: 90,
    sections: ["Conquistadores", "Guías Mayores"], defaultCapacity: 60,
    createdBy: "Mtra. Diana Báez", uses: 6, lastUsedAt: "2025-07-19", lastUsedAtCamporee: "Camporee Centro 2025" },
  { id: "t18", title: "Fogata bíblica", description: "Cantos, testimonios, reflexión.",
    category: "social", scope: "union", scopeId: "union-1", durationMin: 120,
    sections: ["Aventureros", "Conquistadores", "Guías Mayores"],
    createdBy: "Sofía Martín", uses: 19, lastUsedAt: "2025-07-19", lastUsedAtCamporee: "Camporee Centro 2025" },
  { id: "t08", title: "Vigilia y ofrenda", description: "Servicio especial nocturno.",
    category: "espiritual", scope: "local_field", scopeId: "field-acv", durationMin: 120,
    sections: ["Conquistadores", "Guías Mayores"],
    createdBy: "Lucía Ortiz", uses: 4, lastUsedAt: "2025-06-12", lastUsedAtCamporee: "Camporee ACV 2025" },
];

export function buildMockEvents(args: BuildMockArgs): CamporeeEventsData {
  const start = new Date(args.startDate ?? "2026-07-15T00:00:00");
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return {
      id: `d${i + 1}`,
      numero: i + 1,
      fecha: iso,
      diaSemana: DAY_NAMES_ES[d.getDay()],
      fechaFmt: formatDayShort(d),
    };
  });

  const events: CamporeeEvent[] = EVENTS_TEMPLATE.map((e) => ({
    ...e,
    camporeeId: args.camporeeId,
  }));

  const totalMin = events.reduce((s, e) => s + durMin(e.startsAt, e.endsAt), 0);
  const fromCatalog = events.filter((e) => e.fromCatalog).length;
  const summary = {
    total: events.length,
    published: events.filter((e) => e.status === "publicado").length,
    cancelled: events.filter((e) => e.status === "cancelado").length,
    venuesUsed: new Set(events.map((e) => e.venueId)).size,
    hoursOfContent: Math.round(totalMin / 60),
    fromCatalog,
    new: events.length - fromCatalog,
  };

  return {
    camporeeId: args.camporeeId,
    camporeeType: args.camporeeType,
    unionName: args.unionName,
    localFieldName: args.localFieldName,
    days,
    venues: VENUES,
    events,
    templates: TEMPLATES,
    summary,
  };
}
