import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { AnnualFolder, SectionEvaluation } from "@/lib/api/annual-folders";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/dashboard/clubs/evidence-folders/f1",
  useSearchParams: () => new URLSearchParams(search),
}));

const mocks = vi.hoisted(() => ({
  getFolder: vi.fn(),
  getFolderEvaluations: vi.fn(),
  evaluateSection: vi.fn(),
  confirmUnionSection: vi.fn(),
  reopenSection: vi.fn(),
}));
vi.mock("@/lib/api/annual-folders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/annual-folders")>()),
  ...mocks,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { EvidenceFolderReview } from "./evidence-folder-review";

const evidence = (id: string, name: string) => ({
  evidence_id: id,
  annual_folder_id: "f1",
  section_id: "s1",
  file_url: `https://files.example.org/${name}`,
  file_name: name,
  description: null,
  uploaded_at: "2026-11-12T10:00:00Z",
  uploaded_by: "Paola Núñez",
});

function folder(overrides: Partial<AnnualFolder> = {}): AnnualFolder {
  return {
    annual_folder_id: "f1",
    club_enrollment_id: "e1",
    folder_template_id: "t1",
    status: "under_evaluation",
    submitted_at: null,
    closed_at: null,
    created_at: null,
    local_camporee_id: null,
    union_camporee_id: null,
    requires_union_confirmation: true,
    total_earned_points: 270,
    total_max_points: 2000,
    template: { template_id: "t1", name: "Carpeta Conquistadores 2026" },
    club_enrollment: {
      club_enrollment_id: "e1",
      club_section_id: 1,
      ecclesiastical_year_id: 1,
      status: "active",
      club_section: {
        club_section_id: 1,
        name: "Conquistadores",
        club_type: { name: "Conquistadores" },
        club: { club_id: 1, name: "Club Orión", local_field: { local_field_id: 1, name: "Campo Valle Norte", union: { union_id: 1, name: "Asociación Valle Alto" } } },
      },
      ecclesiastical_year: { year_id: 1, start_date: "2026-01-01", end_date: "2026-12-31", label: "2026" },
    },
    sections: [
      { section_id: "s1", name: "Servicio a la comunidad", description: null, order: 1, required: true, max_points: 400,
        evaluation: { evaluation_id: "ev1", status: "SUBMITTED", earned_points: 0, max_points: 400, notes: null },
        evidences: [evidence("a", "limpieza-parque.jpg"), evidence("b", "lista-de-asistencia.pdf")] },
      { section_id: "s2", name: "Servicio a la iglesia", description: null, order: 2, required: true, max_points: 400,
        evaluation: { evaluation_id: "ev2", status: "SUBMITTED", earned_points: 0, max_points: 400, notes: null },
        evidences: [evidence("c", "visita.jpg")] },
      { section_id: "s3", name: "Evangelismo", description: null, order: 3, required: true, max_points: 400,
        evaluation: { evaluation_id: "ev3", status: "PREAPPROVED_LF", earned_points: 360, max_points: 400, notes: null },
        evidences: [evidence("d", "informe.pdf")] },
      { section_id: "s4", name: "Investidura", description: null, order: 4, required: false, max_points: 300,
        evaluation: null, evidences: [] },
    ],
    ...overrides,
  } as AnnualFolder;
}

function renderReview(props: { canConfirmUnion?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <EvidenceFolderReview folderId="f1" canConfirmUnion={props.canConfirmUnion ?? false} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  search = "";
  mocks.getFolder.mockResolvedValue(folder());
  mocks.getFolderEvaluations.mockResolvedValue([] as SectionEvaluation[]);
  mocks.evaluateSection.mockResolvedValue({});
  mocks.confirmUnionSection.mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EvidenceFolderReview", () => {
  it("shows one state per section and never the old stacked labels", async () => {
    renderReview();
    const list = await screen.findByRole("listbox");
    expect(within(list).getAllByRole("option")).toHaveLength(4);
    expect(within(list).getAllByText("Por evaluar")).toHaveLength(2);
    expect(within(list).getByText("En unión")).toBeInTheDocument();
    expect(within(list).getByText("Sin enviar")).toBeInTheDocument();
    for (const stacked of ["Requerida", "Pendiente", "Pendiente de envío"]) {
      expect(screen.queryByText(stacked)).not.toBeInTheDocument();
    }
  });

  it("opens on the first section to evaluate with its files and the club view link", async () => {
    renderReview();
    expect(await screen.findByRole("heading", { name: "Servicio a la comunidad" })).toBeInTheDocument();
    expect(screen.getByText("limpieza-parque.jpg")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver como club" })).toHaveAttribute(
      "href",
      "/dashboard/clubs/evidence-folders/f1/view",
    );
    expect(screen.getByText(/270 de 2,000 pts/)).toBeInTheDocument();
  });

  it("rejects points above the maximum without calling the API", async () => {
    const user = userEvent.setup();
    renderReview();
    const points = await screen.findByLabelText("Puntos");
    await user.type(points, "500");
    await user.click(screen.getByRole("button", { name: "Guardar y seguir" }));
    expect(await screen.findByText("No puede superar 400 pts.")).toBeInTheDocument();
    expect(mocks.evaluateSection).not.toHaveBeenCalled();
  });

  it("saves the evaluation and moves on to the next section", async () => {
    const user = userEvent.setup();
    renderReview();
    await user.type(await screen.findByLabelText("Puntos"), "360");
    await user.type(screen.getByLabelText("Observaciones"), "Buen trabajo");
    expect(screen.getByText("Siguiente: Servicio a la iglesia")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar y seguir" }));
    await waitFor(() =>
      expect(mocks.evaluateSection).toHaveBeenCalledWith("f1", "s1", {
        earned_points: 360,
        notes: "Buen trabajo",
      }),
    );
    expect(await screen.findByRole("heading", { name: "Servicio a la iglesia" })).toBeInTheDocument();
  });

  it("asks for a reason before the union rejects a section", async () => {
    const user = userEvent.setup();
    search = "focus=union";
    renderReview({ canConfirmUnion: true });
    expect(await screen.findByRole("heading", { name: "Evangelismo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Rechazar…" }));
    expect(mocks.confirmUnionSection).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", { name: "Rechazar apartado" });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText("Motivo"), "Las evidencias son de 2025");
    await user.click(confirm);
    await waitFor(() =>
      expect(mocks.confirmUnionSection).toHaveBeenCalledWith("f1", "s3", {
        decision: "REJECTED_OVERRIDE",
        notes: "Las evidencias son de 2025",
      }),
    );
  });

  it("does not offer the union decision to a reader without the capability", async () => {
    search = "focus=union";
    renderReview({ canConfirmUnion: false });
    await screen.findByRole("listbox");
    await userEvent.click(screen.getByRole("option", { name: /Evangelismo/ }));
    expect(await screen.findByText(/Esperando la confirmación de la unión/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprobar apartado" })).not.toBeInTheDocument();
  });

  it("shows a load failure as an error, not as an empty folder", async () => {
    mocks.getFolder.mockRejectedValue(new Error("boom"));
    renderReview();
    expect(await screen.findByText("No pudimos cargar la carpeta")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
