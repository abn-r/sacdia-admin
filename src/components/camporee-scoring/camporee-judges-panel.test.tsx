import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CamporeeJudgesPanel } from "@/components/camporee-scoring/camporee-judges-panel";
import { EventJudgeAssignmentsPanel } from "@/components/camporee-scoring/event-judge-assignments-panel";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type {
  CamporeeEventJudgeAssignment,
  CamporeeJudge,
  CamporeeJudgeCandidate,
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

vi.mock("next/image", () => ({
  default: ({
    alt,
    fill,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    void fill;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} {...props} />
    );
  },
}));

vi.mock("@/lib/camporee-scoring/actions", () => ({
  addCamporeeJudgeAction: vi.fn(),
  assignCamporeeEventJudgeAction: vi.fn(),
}));

const judges: CamporeeJudge[] = [
  {
    camporee_judge_id: "judge-1",
    user_id: "user-1",
    name: "Ana Juez",
    status: "active",
    active: true,
  },
  {
    camporee_judge_id: "judge-2",
    user_id: "user-2",
    name: "Luis Ayudante",
    status: "active",
    active: true,
  },
];

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

const assignments: CamporeeEventJudgeAssignment[] = [
  {
    camporee_event_judge_assignment_id: "assignment-1",
    camporee_event_id: 10,
    camporee_judge_id: "judge-1",
    camporee_club_id: 5,
    club_section_id: 99,
    judge_role: "primary",
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
  },
];

const judgeCandidates: CamporeeJudgeCandidate[] = [
  {
    user_id: "user-3",
    email: "maria@example.com",
    name: "María",
    paternal_last_name: "López",
    maternal_last_name: null,
    full_name: "María López",
    user_image: "https://example.com/maria.jpg",
    active: true,
    access_app: true,
    access_panel: true,
    roles: ["director-lf", "counselor"],
    camporee_judge_eligible: true,
    camporee_judge_eligibility_reasons: ["invested_master_guide"],
  },
  {
    user_id: "user-4",
    email: "carlos@example.com",
    name: "Carlos",
    paternal_last_name: "Ruiz",
    maternal_last_name: null,
    full_name: "Carlos Ruiz",
    user_image: null,
    active: true,
    access_app: true,
    access_panel: false,
    roles: ["assistant-lf"],
    camporee_judge_eligible: false,
    camporee_judge_eligibility_reasons: [],
  },
  {
    user_id: "user-5",
    email: "pastor@example.com",
    name: "Pedro",
    paternal_last_name: "Pastor",
    maternal_last_name: null,
    full_name: "Pedro Pastor",
    user_image: null,
    active: true,
    access_app: true,
    access_panel: false,
    roles: ["pastor"],
    camporee_judge_eligible: true,
    camporee_judge_eligibility_reasons: ["pastor_role"],
  },
];

describe("CamporeeJudgesPanel", () => {
  afterEach(() => cleanup());

  it("shows camporee judge roster", () => {
    render(<CamporeeJudgesPanel camporeeId={1} judges={judges} canEdit={false} />);

    expect(screen.getByText("Jueces del camporee")).toBeInTheDocument();
    expect(screen.getByText("Ana Juez")).toBeInTheDocument();
    expect(screen.getByText("Luis Ayudante")).toBeInTheDocument();
  });

  it("uses a searchable user selector instead of asking for a UUID", async () => {
    render(
      <CamporeeJudgesPanel
        camporeeId={1}
        judges={judges}
        judgeCandidates={judgeCandidates}
        canEdit
      />,
    );

    expect(screen.queryByLabelText("Usuario juez (UUID)")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("user_id")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox", { name: /usuario juez/i }));
    const searchInput = await screen.findByPlaceholderText(
      "Buscar por nombre, correo, rol o cargo...",
    );
    fireEvent.change(searchInput, { target: { value: "consejero" } });

    await waitFor(() => expect(screen.getByText("María López")).toBeInTheDocument());
    expect(screen.getByText("GM investido")).toBeInTheDocument();
    expect(screen.getByText("Rol: Director campo local")).toBeInTheDocument();
    expect(screen.getByText("Cargo: Consejero")).toBeInTheDocument();

    fireEvent.click(screen.getByText("María López"));

    const hiddenUserInput = document.querySelector<HTMLInputElement>('input[name="user_id"]');
    expect(hiddenUserInput?.value).toBe("user-3");
    expect(screen.getByRole("button", { name: "Agregar juez" })).toBeEnabled();
  });

  it("filters out users that are not eligible to judge camporee events", async () => {
    render(
      <CamporeeJudgesPanel
        camporeeId={1}
        judges={judges}
        judgeCandidates={judgeCandidates}
        canEdit
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: /usuario juez/i }));
    const searchInput = await screen.findByPlaceholderText(
      "Buscar por nombre, correo, rol o cargo...",
    );
    fireEvent.change(searchInput, { target: { value: "carlos" } });

    await waitFor(() =>
      expect(screen.queryByText("Carlos Ruiz")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("No encontramos usuarios con esa búsqueda.")).toBeInTheDocument();
  });

  it("prevents assigning a second primary judge to the same section/event", () => {
    render(
      <EventJudgeAssignmentsPanel
        camporeeId={1}
        events={[event]}
        judges={judges}
        assignmentsByEvent={{ 10: assignments }}
        targetsByEvent={{ 10: targets }}
        canEdit
      />,
    );

    fireEvent.change(screen.getByLabelText("Sección"), { target: { value: "99" } });
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "primary" } });

    expect(screen.getByRole("button", { name: "Asignar juez" })).toBeDisabled();
    expect(
      screen.getByText("Esta sección ya tiene juez principal activo para el evento."),
    ).toBeInTheDocument();
  });
});
