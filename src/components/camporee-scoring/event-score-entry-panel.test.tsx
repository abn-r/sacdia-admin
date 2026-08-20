import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { EventScoreEntryPanel } from "@/components/camporee-scoring/event-score-entry-panel";
import es from "../../../messages/es.json";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type {
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

vi.mock("@/lib/camporee-scoring/actions", () => ({
  submitCamporeeEventScoreAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
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
});
