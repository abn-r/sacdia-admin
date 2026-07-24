import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "sonner";
import { CamporeeJudgesPanel } from "@/components/camporee-scoring/camporee-judges-panel";
import { EventJudgeAssignmentsPanel } from "@/components/camporee-scoring/event-judge-assignments-panel";
import es from "../../../messages/es.json";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type {
  CamporeeEventJudgeAssignment,
  CamporeeJudge,
  CamporeeJudgeCandidate,
  CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";
import {
  addCamporeeJudgeAction,
  deleteCamporeeEventJudgeAssignmentAction,
  removeCamporeeJudgeAction,
} from "@/lib/camporee-scoring/actions";

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

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/camporee-scoring/actions", () => ({
  addCamporeeJudgeAction: vi.fn(),
  updateCamporeeJudgeAction: vi.fn(),
  removeCamporeeJudgeAction: vi.fn(),
  assignCamporeeEventJudgeAction: vi.fn(),
  deleteCamporeeEventJudgeAssignmentAction: vi.fn(),
  replaceCamporeeEventJudgeAssignmentAction: vi.fn(),
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

  beforeEach(() => {
    refreshMock.mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(addCamporeeJudgeAction).mockReset();
    vi.mocked(removeCamporeeJudgeAction).mockReset();
  });

  function renderPanel(ui: React.ReactElement) {
    return render(
      <NextIntlClientProvider locale="es" messages={es}>
        {ui}
      </NextIntlClientProvider>,
    );
  }

  async function openAddDialogAndSelectMaria() {
    fireEvent.click(screen.getByRole("button", { name: "Agregar juez" }));
    fireEvent.click(screen.getByRole("combobox", { name: /usuario juez/i }));
    const searchInput = await screen.findByPlaceholderText(
      "Buscar por nombre, correo, rol o cargo...",
    );
    fireEvent.change(searchInput, { target: { value: "maria" } });
    await waitFor(() => expect(screen.getByText("María López")).toBeInTheDocument());
    fireEvent.click(screen.getByText("María López"));
  }

  it("shows camporee judge roster", () => {
    renderPanel(<CamporeeJudgesPanel camporeeId={1} judges={judges} canEdit={false} />);

    expect(screen.getByText("Plantilla")).toBeInTheDocument();
    expect(screen.getByText("Ana Juez")).toBeInTheDocument();
    expect(screen.getByText("Luis Ayudante")).toBeInTheDocument();
  });

  it("shows email from candidates instead of user id", () => {
    const judgesWithMatch: CamporeeJudge[] = [
      {
        camporee_judge_id: "judge-3",
        user_id: "user-3",
        name: "María López",
        status: "active",
        active: true,
      },
    ];

    renderPanel(
      <CamporeeJudgesPanel
        camporeeId={1}
        judges={judgesWithMatch}
        judgeCandidates={judgeCandidates}
        canEdit={false}
      />,
    );

    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
    expect(screen.queryByText(/ID user-3/i)).not.toBeInTheDocument();
  });

  it("uses a searchable user selector instead of asking for a UUID", async () => {
    renderPanel(
      <CamporeeJudgesPanel
        camporeeId={1}
        judges={judges}
        judgeCandidates={judgeCandidates}
        canEdit
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agregar juez" }));

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
    const addButtons = screen.getAllByRole("button", { name: "Agregar juez" });
    expect(
      addButtons.some((button) => !(button as HTMLButtonElement).disabled),
    ).toBe(true);
  });

  it("filters out users that are not eligible to judge camporee events", async () => {
    renderPanel(
      <CamporeeJudgesPanel
        camporeeId={1}
        judges={judges}
        judgeCandidates={judgeCandidates}
        canEdit
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agregar juez" }));
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

  it("closes modal, toasts success, and refreshes after adding a judge", async () => {
    vi.mocked(addCamporeeJudgeAction).mockResolvedValue({ success: "Juez agregado." });

    renderPanel(
      <CamporeeJudgesPanel
        camporeeId={1}
        judges={judges}
        judgeCandidates={judgeCandidates}
        canEdit
      />,
    );

    await openAddDialogAndSelectMaria();

    const submitButtons = screen.getAllByRole("button", { name: "Agregar juez" });
    const submitButton = submitButtons.find(
      (button) => (button as HTMLButtonElement).type === "submit",
    );
    expect(submitButton).toBeTruthy();
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Juez agregado.");
    });
    expect(addCamporeeJudgeAction).toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("keeps modal open with toast and inline error when add fails", async () => {
    vi.mocked(addCamporeeJudgeAction).mockResolvedValue({
      error: "No se pudo agregar el juez.",
    });

    renderPanel(
      <CamporeeJudgesPanel
        camporeeId={1}
        judges={judges}
        judgeCandidates={judgeCandidates}
        canEdit
      />,
    );

    await openAddDialogAndSelectMaria();

    const submitButtons = screen.getAllByRole("button", { name: "Agregar juez" });
    const submitButton = submitButtons.find(
      (button) => (button as HTMLButtonElement).type === "submit",
    );
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("No se pudo agregar el juez.");
    });
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo agregar el juez.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.querySelector<HTMLInputElement>('input[name="user_id"]')?.value).toBe(
      "user-3",
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("exposes row action menus when canEdit", () => {
    renderPanel(
      <CamporeeJudgesPanel
        camporeeId={1}
        judges={judges}
        judgeCandidates={judgeCandidates}
        canEdit
      />,
    );

    expect(screen.getAllByLabelText("Acciones del juez")).toHaveLength(2);
  });

  async function openRemoveConfirmForAna() {
    const user = userEvent.setup();
    await user.click(screen.getAllByLabelText("Acciones del juez")[0]!);
    await user.click(await screen.findByRole("menuitem", { name: /quitar/i }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Ana Juez");
  }

  it("opens confirm dialog when removing a judge and cancel does not remove", async () => {
    const user = userEvent.setup();
    renderPanel(
      <CamporeeJudgesPanel
        camporeeId={1}
        judges={judges}
        judgeCandidates={judgeCandidates}
        canEdit
      />,
    );

    await openRemoveConfirmForAna();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(removeCamporeeJudgeAction).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("removes judge only after confirm, then toasts and refreshes", async () => {
    const user = userEvent.setup();
    vi.mocked(removeCamporeeJudgeAction).mockResolvedValue({
      success: "Juez quitado de la plantilla.",
    });

    renderPanel(
      <CamporeeJudgesPanel
        camporeeId={1}
        judges={judges}
        judgeCandidates={judgeCandidates}
        canEdit
      />,
    );

    await openRemoveConfirmForAna();

    await user.click(screen.getByRole("button", { name: "Quitar" }));

    await waitFor(() => {
      expect(removeCamporeeJudgeAction).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Juez quitado de la plantilla.");
    });
    expect(refreshMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("keeps dialog open and toasts error when remove fails", async () => {
    const user = userEvent.setup();
    vi.mocked(removeCamporeeJudgeAction).mockResolvedValue({
      error: "No se pudo quitar el juez.",
    });

    renderPanel(
      <CamporeeJudgesPanel
        camporeeId={1}
        judges={judges}
        judgeCandidates={judgeCandidates}
        canEdit
      />,
    );

    await openRemoveConfirmForAna();

    await user.click(screen.getByRole("button", { name: "Quitar" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("No se pudo quitar el juez.");
    });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});

describe("EventJudgeAssignmentsPanel", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    refreshMock.mockClear();
    vi.mocked(deleteCamporeeEventJudgeAssignmentAction).mockReset();
  });

  it("prevents assigning a second primary judge to the same section/event", async () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <EventJudgeAssignmentsPanel
          camporeeId={1}
          events={[event]}
          judges={judges}
          assignmentsByEvent={{ 10: assignments }}
          targetsByEvent={{ 10: targets }}
          canEdit
        />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));

    fireEvent.click(screen.getByLabelText("Sección"));
    fireEvent.click(await screen.findByRole("option", { name: /Halcones · Conquistadores/i }));

    expect(screen.getByRole("button", { name: "Asignar juez" })).toBeDisabled();
    expect(
      screen.getByText("Esta sección ya tiene juez principal activo para el evento."),
    ).toBeInTheDocument();
  });

  it("shows edit controls on assigned judge slots when canEdit", async () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <EventJudgeAssignmentsPanel
          camporeeId={1}
          events={[event]}
          judges={judges}
          assignmentsByEvent={{ 10: assignments }}
          targetsByEvent={{ 10: targets }}
          canEdit
        />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));

    expect(screen.getAllByText("Ana Juez").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Editar asignación")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Asignar" })).toBeInTheDocument();
  });

  it("calls delete assignment action with prevState + FormData", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteCamporeeEventJudgeAssignmentAction).mockResolvedValue({
      success: "Asignación eliminada.",
    });

    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <EventJudgeAssignmentsPanel
          camporeeId={1}
          events={[event]}
          judges={judges}
          assignmentsByEvent={{ 10: assignments }}
          targetsByEvent={{ 10: targets }}
          canEdit
        />
      </NextIntlClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(screen.getByLabelText("Editar asignación"));
    await user.click(screen.getByRole("menuitem", { name: "Quitar" }));

    await waitFor(() => {
      expect(deleteCamporeeEventJudgeAssignmentAction).toHaveBeenCalled();
    });

    const [prevState, formData] = vi.mocked(deleteCamporeeEventJudgeAssignmentAction).mock
      .calls[0]!;
    expect(prevState).toEqual({});
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("assignment_id")).toBe("assignment-1");
    expect(formData.get("camporee_id")).toBe("1");
    expect(formData.get("is_union")).toBe("false");
  });
});
