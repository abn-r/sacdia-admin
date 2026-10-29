import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { EventScoreEntryPanel } from "@/components/camporee-scoring/event-score-entry-panel";
import es from "../../../messages/es.json";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type {
  CamporeeOfficialScore,
  CamporeeEventRubric,
  CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const mocks = vi.hoisted(() => ({
  submitAction: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  getScore: vi.fn(),
}));

vi.mock("@/lib/api/camporee-scoring", () => ({
  getCamporeeEventSectionScore: mocks.getScore,
}));

vi.mock("@/lib/camporee-scoring/actions", () => ({
  submitCamporeeEventScoreAction: mocks.submitAction,
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.getScore.mockReset();
});

const event: BackendCamporeeEvent = {
  camporee_event_id: 10,
  local_camporee_id: 1,
  union_camporee_id: null,
  event_template_id: null,
  event_type_id: 1,
  title: "Nudos",
  description: null,
  requirements: null,
  development: null,
  prerequisites: null,
  materials: null,
  auxiliaries: null,
  max_points: 100,
  scoring_enabled: true,
  min_points: 0,
  penalties: [],
  participants_mode: "count",
  participants_count: 4,
  participants_by_class: null,
  duration_seconds: null,
  display_order: 0,
  active: true,
  day_number: 1,
  starts_at: null,
  ends_at: null,
  venue_id: null,
  leader_user_id: null,
  leader_name_override: null,
  leader_role: null,
  sections: [],
  display_category: "competencia",
  status: "programado",
  capacity: null,
  registered_count: 0,
};

const rubrics: CamporeeEventRubric[] = [
  {
    camporee_event_rubric_id: 101,
    camporee_event_id: 10,
    title: "Técnica",
    description: "Nudo correcto",
    max_points: 40,
    display_order: 0,
    active: true,
  },
  {
    camporee_event_rubric_id: 102,
    camporee_event_id: 10,
    title: "Trabajo en equipo",
    description: null,
    max_points: 60,
    display_order: 1,
    active: true,
  },
];

const targets: CamporeeScoringTarget[] = [
  {
    camporee_club_id: 5,
    club_section_id: 99,
    club_name: "Halcones",
    section_name: "Conquistadores",
    status: "approved",
    active_result_id: null,
  },
];

function renderPanel(props: Partial<React.ComponentProps<typeof EventScoreEntryPanel>> = {}) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <EventScoreEntryPanel
        camporeeId={1}
        events={[event]}
        rubricsByEvent={{ 10: rubrics }}
        targetsByEvent={{ 10: targets }}
        canEdit
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

const ACTIVE_ID = "33333333-3333-4333-8333-333333333333";

function officialScore(technique: number, teamwork: number): CamporeeOfficialScore {
  return {
    camporee_event_section_result_id: ACTIVE_ID,
    score_status: "official",
    total_awarded_points: technique + teamwork,
    total_max_points: 100,
    notes: "Nota anterior",
    items: [
      { camporee_event_rubric_id: 101, awarded_points: technique },
      { camporee_event_rubric_id: 102, awarded_points: teamwork },
    ],
  };
}

function itemsOf(container: HTMLElement) {
  const field = container.querySelector<HTMLInputElement>('input[name="items"]');
  return JSON.parse(field?.value ?? "[]");
}

const activeTargets = {
  10: [{ ...targets[0]!, active_result_id: ACTIVE_ID }],
};

describe("EventScoreEntryPanel", () => {
  it("calculates total from rubric inputs and does not expose a typed total field", () => {
    const { container } = renderPanel();

    fireEvent.change(screen.getByLabelText("Puntos otorgados Técnica"), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByLabelText("Puntos otorgados Trabajo en equipo"), {
      target: { value: "40" },
    });

    expect(screen.getByText("Total calculado: 70 / 100 puntos")).toBeInTheDocument();
    expect(container.querySelector('input[name="total_awarded_points"]')).toBeNull();

    const itemsField = container.querySelector<HTMLInputElement>('input[name="items"]');
    expect(itemsField).not.toBeNull();
    expect(JSON.parse(itemsField?.value ?? "[]")).toEqual([
      { camporee_event_rubric_id: 101, awarded_points: 30 },
      { camporee_event_rubric_id: 102, awarded_points: 40 },
    ]);
  });

  it("sends the active result id and requires notes when overriding a scored section", () => {
    mocks.getScore.mockResolvedValue(officialScore(30, 60));
    const { container } = renderPanel({
      targetsByEvent: {
        10: [
          {
            ...targets[0],
            active_result_id: "33333333-3333-4333-8333-333333333333",
          },
        ],
      },
    });

    const expectedId = container.querySelector<HTMLInputElement>(
      'input[name="expected_active_result_id"]',
    );
    const notes = container.querySelector<HTMLTextAreaElement>('textarea[name="notes"]');

    expect(expectedId?.value).toBe("33333333-3333-4333-8333-333333333333");
    expect(notes).toHaveAttribute("required");
    expect(
      screen.getByText("Ya hay un puntaje activo. Indica el motivo de la corrección."),
    ).toBeInTheDocument();
  });

  it("renders manual score form only for scoring events with rubrics and edit permission", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "Registrar puntaje" })).toBeInTheDocument();
    expect(screen.getByLabelText("Sección")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar puntaje oficial" })).toBeEnabled();
  });

  it("pluralizes the criteria and sections counts on the event selector", () => {
    renderPanel({ rubricsByEvent: { 10: [rubrics[0]!] } });
    expect(screen.getByText("1 criterio · 1 sección")).toBeInTheDocument();
    cleanup();

    renderPanel({
      targetsByEvent: { 10: [targets[0]!, { ...targets[0]!, club_section_id: 100 }] },
    });
    expect(screen.getByText("2 criterios · 2 secciones")).toBeInTheDocument();
  });

  it("toasts when an official score is saved", async () => {
    mocks.submitAction.mockResolvedValue({ success: "Puntaje guardado.", scoreMode: "official" });
    const { container } = renderPanel();

    await act(async () => {
      fireEvent.submit(container.querySelector("form")!);
    });

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Puntaje guardado"));
    expect(mocks.toastSuccess).toHaveBeenCalledTimes(1);
  });

  it("labels the submit button as a correction and toasts when a correction is saved", async () => {
    mocks.getScore.mockResolvedValue(officialScore(30, 60));
    mocks.submitAction.mockResolvedValue({
      success: "Corrección guardada.",
      scoreMode: "correction",
    });
    const { container } = renderPanel({
      targetsByEvent: {
        10: [{ ...targets[0]!, active_result_id: "33333333-3333-4333-8333-333333333333" }],
      },
    });

    expect(screen.getByRole("button", { name: "Guardar corrección" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar puntaje oficial" })).toBeNull();

    await act(async () => {
      fireEvent.submit(container.querySelector("form")!);
    });

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith("Corrección guardada"));
  });

  it("toasts the error when saving fails", async () => {
    mocks.submitAction.mockResolvedValue({ error: "No se pudo guardar el puntaje." });
    const { container } = renderPanel();

    await act(async () => {
      fireEvent.submit(container.querySelector("form")!);
    });

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("No se pudo guardar el puntaje."),
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  describe("score corrections", () => {
    it("prefills the inputs from the active result and leaves notes empty", async () => {
      mocks.getScore.mockResolvedValue(officialScore(35, 55));
      const { container } = renderPanel({ targetsByEvent: activeTargets });

      await waitFor(() =>
        expect(screen.getByLabelText("Puntos otorgados Técnica")).toHaveValue(35),
      );
      expect(screen.getByLabelText("Puntos otorgados Trabajo en equipo")).toHaveValue(55);
      expect(mocks.getScore).toHaveBeenCalledWith(10, 99);
      expect(screen.getByText("Total calculado: 90 / 100 puntos")).toBeInTheDocument();
      expect(itemsOf(container)).toEqual([
        { camporee_event_rubric_id: 101, awarded_points: 35 },
        { camporee_event_rubric_id: 102, awarded_points: 55 },
      ]);
      expect(container.querySelector<HTMLTextAreaElement>('textarea[name="notes"]')?.value).toBe(
        "",
      );
      expect(screen.getByRole("button", { name: "Guardar corrección" })).toBeEnabled();
    });

    it("disables submit while the active result is loading", async () => {
      let resolve: (value: CamporeeOfficialScore) => void = () => {};
      mocks.getScore.mockReturnValue(
        new Promise<CamporeeOfficialScore>((r) => {
          resolve = r;
        }),
      );
      renderPanel({ targetsByEvent: activeTargets });

      expect(screen.getByText("Cargando el puntaje actual…")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar corrección" })).toBeDisabled();
      expect(screen.getByLabelText("Puntos otorgados Técnica")).toBeDisabled();

      await act(async () => {
        resolve(officialScore(20, 30));
      });

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Guardar corrección" })).toBeEnabled(),
      );
      expect(screen.queryByText("Cargando el puntaje actual…")).toBeNull();
    });

    it("keeps submit disabled and shows an error when the fetch fails", async () => {
      mocks.getScore.mockRejectedValue(new Error("boom"));
      renderPanel({ targetsByEvent: activeTargets });

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "No se pudo cargar el puntaje actual.",
      );
      expect(screen.getByRole("button", { name: "Guardar corrección" })).toBeDisabled();
    });

    it("ignores a stale response after the selection changes", async () => {
      const resolvers: Record<number, (value: CamporeeOfficialScore) => void> = {};
      mocks.getScore.mockImplementation(
        (_eventId: number, sectionId: number) =>
          new Promise<CamporeeOfficialScore>((r) => {
            resolvers[sectionId] = r;
          }),
      );
      const { rerender } = renderPanel({ targetsByEvent: activeTargets });
      expect(mocks.getScore).toHaveBeenCalledWith(10, 99);

      // Selection moves to another section with a different active result.
      rerender(
        <NextIntlClientProvider locale="es" messages={es}>
          <EventScoreEntryPanel
            camporeeId={1}
            events={[event]}
            rubricsByEvent={{ 10: rubrics }}
            targetsByEvent={{
              10: [
                {
                  ...targets[0]!,
                  club_section_id: 100,
                  active_result_id: "44444444-4444-4444-8444-444444444444",
                },
              ],
            }}
            canEdit
          />
        </NextIntlClientProvider>,
      );
      await waitFor(() => expect(mocks.getScore).toHaveBeenCalledWith(10, 100));

      // The old request resolves late and must not overwrite the new selection.
      await act(async () => {
        resolvers[99]!(officialScore(1, 2));
      });
      expect(screen.getByRole("button", { name: "Guardar corrección" })).toBeDisabled();
      expect(screen.getByLabelText("Puntos otorgados Técnica")).toHaveValue(0);

      await act(async () => {
        resolvers[100]!(officialScore(40, 50));
      });
      await waitFor(() =>
        expect(screen.getByLabelText("Puntos otorgados Técnica")).toHaveValue(40),
      );
      expect(screen.getByLabelText("Puntos otorgados Trabajo en equipo")).toHaveValue(50);
    });

    it("does not fetch and starts at 0 for sections without a result", () => {
      const { container } = renderPanel();

      expect(mocks.getScore).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Puntos otorgados Técnica")).toHaveValue(0);
      expect(screen.getByRole("button", { name: "Guardar puntaje oficial" })).toBeEnabled();
      expect(itemsOf(container)).toEqual([
        { camporee_event_rubric_id: 101, awarded_points: 0 },
        { camporee_event_rubric_id: 102, awarded_points: 0 },
      ]);
    });
  });
});
