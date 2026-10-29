import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  createLocal: vi.fn(),
  createUnion: vi.fn(),
  updateEvent: vi.fn(),
  replaceRubrics: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/session", () => ({ requireAdminUser: vi.fn(async () => ({})) }));
vi.mock("@/lib/auth/screen-catalog", () => ({
  camporeeScreenId: vi.fn(() => "campamentos-list-local"),
  canCapability: vi.fn(() => true),
}));
vi.mock("@/lib/auth/territory-scope", () => ({
  listLocalFieldsForTerritory: vi.fn(),
  listUnionsForTerritory: vi.fn(),
  resolveAdminTerritoryScope: vi.fn(),
}));
vi.mock("@/lib/api/camporee-events", () => ({
  createLocalCamporeeEvent: mocks.createLocal,
  createUnionCamporeeEvent: mocks.createUnion,
  updateCamporeeEvent: mocks.updateEvent,
}));
vi.mock("@/lib/api/camporee-scoring", () => ({
  replaceCamporeeEventRubrics: mocks.replaceRubrics,
}));

import { ApiError } from "@/lib/api/client";
import {
  submitBoundCamporeeAgendaEventAction,
  updateCamporeeEventAction,
} from "./actions";

function agendaForm(extra: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("title", "Competencia de nudos");
  fd.set("scoring_enabled", "");
  fd.set("rubrics", "[]");
  for (const [key, value] of Object.entries(extra)) fd.set(key, value);
  return fd;
}

const RUBRIC_ITEMS = JSON.stringify([
  { title: "Orden", description: null, max_points: 10, display_order: 1 },
]);

function rubricsRejected() {
  mocks.replaceRubrics.mockRejectedValue(new ApiError("Unprocessable", 422, null));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createLocal.mockResolvedValue({ data: { camporee_event_id: 14 } });
  mocks.createUnion.mockResolvedValue({ data: { camporee_event_id: 15 } });
  mocks.updateEvent.mockResolvedValue({});
  mocks.replaceRubrics.mockResolvedValue([]);
});

describe("agenda event create - rubrics follow-up", () => {
  it("does not call the rubrics endpoint when scoring is off and there is nothing to change", async () => {
    const result = await submitBoundCamporeeAgendaEventAction(
      { camporeeId: 70, isUnion: false },
      {},
      agendaForm({ rubrics_initially_configured: "false" }),
    );

    expect(result).toEqual({ saved: "created" });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/campamentos/70");

    expect(mocks.createLocal).toHaveBeenCalledTimes(1);
    expect(mocks.replaceRubrics).not.toHaveBeenCalled();
  });

  it("saves the rubrics when scoring is enabled", async () => {
    const result = await submitBoundCamporeeAgendaEventAction(
      { camporeeId: 70, isUnion: false },
      {},
      agendaForm({ scoring_enabled: "on", rubrics: RUBRIC_ITEMS }),
    );

    expect(result).toEqual({ saved: "created" });

    expect(mocks.replaceRubrics).toHaveBeenCalledWith(14, {
      scoring_enabled: true,
      items: JSON.parse(RUBRIC_ITEMS),
    });
  });

  it("returns a warning instead of an error when the event was saved but the rubrics failed (local)", async () => {
    rubricsRejected();

    const result = await submitBoundCamporeeAgendaEventAction(
      { camporeeId: 70, isUnion: false },
      {},
      agendaForm({ scoring_enabled: "on", rubrics: RUBRIC_ITEMS }),
    );

    expect(result.error).toBeUndefined();
    expect(result.warning).toBe("Los datos enviados no son válidos para esta acción.");
    expect(mocks.createLocal).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/campamentos/70");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("returns a warning when the rubrics failed on a union camporee", async () => {
    rubricsRejected();

    const result = await submitBoundCamporeeAgendaEventAction(
      { camporeeId: 138, isUnion: true },
      {},
      agendaForm({ scoring_enabled: "on", rubrics: RUBRIC_ITEMS }),
    );

    expect(result.warning).toBeTruthy();
    expect(result.error).toBeUndefined();
    expect(mocks.createUnion).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/campamentos/union/138");
  });

  it("still reports an error when the event itself could not be created", async () => {
    mocks.createLocal.mockRejectedValue(new ApiError("Boom", 500, null));

    const result = await submitBoundCamporeeAgendaEventAction(
      { camporeeId: 70, isUnion: false },
      {},
      agendaForm({ scoring_enabled: "on", rubrics: RUBRIC_ITEMS }),
    );

    expect(result.error).toBeTruthy();
    expect(result.warning).toBeUndefined();
    expect(mocks.replaceRubrics).not.toHaveBeenCalled();
  });
});

describe("agenda event update - rubrics follow-up", () => {
  it("skips the rubrics endpoint when the event had no rubrics and still has none", async () => {
    const result = await submitBoundCamporeeAgendaEventAction(
      { camporeeId: 70, eventId: 14, isUnion: false },
      {},
      agendaForm({ rubrics_initially_configured: "false" }),
    );

    expect(result).toEqual({ saved: "updated" });

    expect(mocks.updateEvent).toHaveBeenCalledWith(14, expect.anything());
    expect(mocks.replaceRubrics).not.toHaveBeenCalled();
  });

  it("calls the endpoint to turn scoring off when the event had rubrics", async () => {
    const result = await submitBoundCamporeeAgendaEventAction(
      { camporeeId: 70, eventId: 14, isUnion: false },
      {},
      agendaForm({ rubrics_initially_configured: "true" }),
    );

    expect(result).toEqual({ saved: "updated" });

    expect(mocks.replaceRubrics).toHaveBeenCalledWith(14, { scoring_enabled: false, items: [] });
  });

  it("warns (union) when the update was saved but the rubrics failed", async () => {
    rubricsRejected();

    const result = await submitBoundCamporeeAgendaEventAction(
      { camporeeId: 138, eventId: 14, isUnion: true },
      {},
      agendaForm({ scoring_enabled: "on", rubrics: RUBRIC_ITEMS }),
    );

    expect(result.warning).toBeTruthy();
    expect(result.error).toBeUndefined();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/campamentos/union/138");
  });
});

describe("agenda event save - clean outcome", () => {
  it("reports a clean union create and update so the form can toast", async () => {
    await expect(
      submitBoundCamporeeAgendaEventAction(
        { camporeeId: 138, isUnion: true },
        {},
        agendaForm({ rubrics_initially_configured: "false" }),
      ),
    ).resolves.toEqual({ saved: "created" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/campamentos/union/138");

    await expect(
      submitBoundCamporeeAgendaEventAction(
        { camporeeId: 138, eventId: 14, isUnion: true },
        {},
        agendaForm({ rubrics_initially_configured: "false" }),
      ),
    ).resolves.toEqual({ saved: "updated" });
  });

  it("never reports saved when the rubrics failed (the warning wins)", async () => {
    rubricsRejected();

    const result = await submitBoundCamporeeAgendaEventAction(
      { camporeeId: 70, isUnion: false },
      {},
      agendaForm({ scoring_enabled: "on", rubrics: RUBRIC_ITEMS }),
    );

    expect(result.saved).toBeUndefined();
    expect(result.warning).toBeTruthy();
  });
});

describe("legacy instance update - rubrics follow-up", () => {
  it("warns instead of failing when the rubrics fail after a saved update", async () => {
    rubricsRejected();
    const fd = new FormData();
    fd.set("id", "14");
    fd.set("camporee_id", "70");
    fd.set("event_type_id", "1");
    fd.set("title", "Competencia");
    fd.set("max_points", "10");
    fd.set("participants_mode", "count");
    fd.set("scoring_enabled", "on");
    fd.set("rubrics", RUBRIC_ITEMS);

    const result = await updateCamporeeEventAction({}, fd);

    expect(result.warning).toBeTruthy();
    expect(result.error).toBeUndefined();
  });
});
