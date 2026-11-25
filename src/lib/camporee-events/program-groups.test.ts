import { describe, expect, it } from "vitest";
import type { CamporeeDay, CamporeeEvent } from "@/lib/camporee-timeline/types";
import {
  countProgramExceptions,
  groupEventsByDay,
  hasProgramFilters,
  PROGRAM_NORMAL_STATUSES,
} from "./program-groups";

const days: CamporeeDay[] = [
  { id: "d1", numero: 1, fecha: "2027-02-12", diaSemana: "Viernes", fechaFmt: "12 feb" },
  { id: "d2", numero: 2, fecha: "2027-02-13", diaSemana: "Sábado", fechaFmt: "13 feb" },
  { id: "d3", numero: 3, fecha: "2027-02-14", diaSemana: "Domingo", fechaFmt: "14 feb" },
];

function event(id: string, dayNumber: number, startsAt: string, status: CamporeeEvent["status"] = "publicado"): CamporeeEvent {
  return {
    id,
    camporeeId: "1",
    templateId: null,
    title: `Evento ${id}`,
    description: "",
    category: "competencia",
    dayNumber,
    startsAt,
    endsAt: "23:00",
    venueId: "",
    leaderName: "—",
    sections: [],
    capacity: 0,
    registered: 0,
    points: 0,
    status,
    fromCatalog: false,
  };
}

describe("groupEventsByDay", () => {
  it("keeps every day, sorted by start time, including empty days", () => {
    const groups = groupEventsByDay(days, [
      event("b", 1, "10:30"),
      event("a", 1, "08:00"),
      event("c", 2, "09:00"),
    ]);

    expect(groups.map((g) => g.day.numero)).toEqual([1, 2, 3]);
    expect(groups[0]!.events.map((e) => e.id)).toEqual(["a", "b"]);
    expect(groups[1]!.events.map((e) => e.id)).toEqual(["c"]);
    expect(groups[2]!.events).toEqual([]);
  });

  it("does not mutate the input list", () => {
    const input = [event("b", 1, "10:30"), event("a", 1, "08:00")];
    groupEventsByDay(days, input);
    expect(input.map((e) => e.id)).toEqual(["b", "a"]);
  });
});

describe("program exceptions", () => {
  it("does not count published, running or finished events", () => {
    expect(PROGRAM_NORMAL_STATUSES).toEqual(["publicado", "en_curso", "realizado"]);
    expect(
      countProgramExceptions([
        event("a", 1, "08:00", "publicado"),
        event("b", 1, "09:00", "programado"),
        event("c", 1, "10:00", "cancelado"),
      ]),
    ).toBe(2);
  });
});

describe("hasProgramFilters", () => {
  it("is true only when one of the filter keys is set", () => {
    expect(hasProgramFilters(new URLSearchParams("tab=events"))).toBe(false);
    expect(hasProgramFilters(new URLSearchParams("tab=events&venue=3"))).toBe(true);
  });
});
