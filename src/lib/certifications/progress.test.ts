import { describe, expect, it } from "vitest";
import {
  applySaved,
  countCompleted,
  draftChanges,
  effectiveCompleted,
  normalizeProgress,
  toggleInDraft,
} from "@/lib/certifications/progress";

const live = {
  status: "success",
  data: {
    enrollment_id: 5,
    certification_id: 3,
    certification_name: "Liderazgo juvenil",
    progress_percentage: 50,
    status: "IN_PROGRESS",
    enrollment_date: "2026-02-03T00:00:00.000Z",
    modules: [
      {
        module_id: 1,
        name: "Trabajo en equipo",
        sections: [
          { section_id: 11, name: "Dinámicas de grupo", completed: true, completion_date: "2026-03-01T00:00:00.000Z" },
          { section_id: 12, name: "Proyecto en equipo", completed: false, completion_date: null },
        ],
      },
    ],
  },
};

describe("normalizeProgress", () => {
  it("reads the live contract (name, completion_date, progress_percentage)", () => {
    const data = normalizeProgress(live, "u-1", 3);
    expect(data.certification_name).toBe("Liderazgo juvenil");
    expect(data.progress_percent).toBe(50);
    expect(data.enrolled_at).toBe("2026-02-03T00:00:00.000Z");
    expect(data.modules[0]?.title).toBe("Trabajo en equipo");
    expect(data.modules[0]?.sections[0]).toMatchObject({
      section_id: 11,
      title: "Dinámicas de grupo",
      completed: true,
      completed_at: "2026-03-01T00:00:00.000Z",
    });
  });

  it("still accepts the legacy field names", () => {
    const data = normalizeProgress(
      { modules: [{ module_id: 2, title: "Mod", sections: [{ section_id: 1, title: "Sec", completed: false }] }], progress_percent: 10 },
      "u-1",
      3,
    );
    expect(data.progress_percent).toBe(10);
    expect(data.modules[0]?.sections[0]?.title).toBe("Sec");
  });

  it("returns an empty module list for a malformed payload", () => {
    expect(normalizeProgress(null, "u-1", 3).modules).toEqual([]);
  });
});

describe("progress draft", () => {
  const { modules } = normalizeProgress(live, "u-1", 3);
  const [done, pending] = modules[0]!.sections as [
    (typeof modules)[number]["sections"][number],
    (typeof modules)[number]["sections"][number],
  ];

  it("marks a section without touching the saved state", () => {
    const draft = toggleInDraft({}, pending);
    expect(effectiveCompleted(pending, draft)).toBe(true);
    expect(pending.completed).toBe(false);
    expect(draftChanges(modules, draft)).toEqual([{ section_id: 12, completed: true }]);
    expect(countCompleted(modules, draft)).toBe(2);
  });

  it("toggling back to the saved value leaves no pending change", () => {
    const once = toggleInDraft({}, done);
    expect(draftChanges(modules, once)).toEqual([{ section_id: 11, completed: false }]);
    const twice = toggleInDraft(once, done);
    expect(twice).toEqual({});
    expect(draftChanges(modules, twice)).toEqual([]);
  });

  it("applySaved folds saved sections into the data and keeps the failed ones", () => {
    const draft = { 11: false, 12: true };
    const next = applySaved(modules, draft, [12], "2026-11-24T10:00:00.000Z");
    expect(next.draft).toEqual({ 11: false });
    expect(next.modules[0]?.sections[1]).toMatchObject({
      completed: true,
      completed_at: "2026-11-24T10:00:00.000Z",
    });
    expect(next.modules[0]?.sections[0]?.completed).toBe(true);
  });
});
