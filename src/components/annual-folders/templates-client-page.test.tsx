import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { FolderTemplate } from "@/lib/api/annual-folders";
import type { AnnualRankingConfig } from "@/lib/api/annual-rankings";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/dashboard/clubs/evidence-folders/templates",
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("@/lib/auth/screen-catalog/use-screen-access", () => ({
  useScreenAccess: () => ({ canViewScreen: () => true, canCapability: () => true }),
}));
vi.mock("@/components/annual-folders/template-form-dialog", () => ({ TemplateFormDialog: () => null }));
vi.mock("@/components/annual-folders/section-form-dialog", () => ({ SectionFormDialog: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mocks = vi.hoisted(() => ({
  getTemplate: vi.fn(),
  listTemplates: vi.fn(),
  updateTemplate: vi.fn(),
}));
vi.mock("@/lib/api/annual-folders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/annual-folders")>()),
  ...mocks,
}));

import { TemplatesClientPage } from "./templates-client-page";

const section = (id: string, name: string, max: number) => ({
  section_id: id,
  template_id: "t1",
  name,
  description: null,
  order: Number(id.slice(1)),
  required: true,
  active: true,
  max_points: max,
  minimum_points: 0,
  created_at: null,
});

function template(overrides: Partial<FolderTemplate> = {}): FolderTemplate {
  return {
    template_id: "t1",
    name: "Carpeta Conquistadores 2027",
    club_type_id: 2,
    ecclesiastical_year_id: 7,
    active: false,
    status: "DRAFT",
    minimum_points: 0,
    closing_date: "2027-11-15",
    created_at: null,
    owner_union_id: 1,
    owner_local_field_id: null,
    club_type: { club_type_id: 2, name: "Conquistadores" },
    owner_union: { union_id: 1, name: "Asociación Valle Alto" },
    ...overrides,
  };
}

const config = {
  ecclesiastical_year_id: 7,
  club_type_id: 2,
  union_id: 1,
  local_field_id: null,
  active: true,
  components: [{ component_key: "annual_folder", max_points: 2000 }],
} as unknown as AnnualRankingConfig;

function renderPage(templates: FolderTemplate[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <TemplatesClientPage
          initialTemplates={templates}
          rankingConfigs={[config]}
          clubTypes={[{ club_type_id: 2, name: "Conquistadores" } as never]}
          ecclesiasticalYears={[{ ecclesiastical_year_id: 7, name: "2027", start_date: "2027-01-01", end_date: "2027-12-31" } as never]}
          unions={[]}
          localFields={[]}
          territoryScope={{} as never}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  search = "";
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TemplatesClientPage list", () => {
  it("marks only the exception: drafts show a badge, published templates do not", () => {
    renderPage([
      template(),
      template({ template_id: "t2", name: "Carpeta Aventureros 2026", status: "PUBLISHED", active: true }),
    ]);
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(within(rows[1] as HTMLElement).getByText("Borrador")).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).queryByText("Publicada")).not.toBeInTheDocument();
    expect(screen.getByText("2 plantillas")).toBeInTheDocument();
  });
});

describe("TemplatesClientPage draft detail", () => {
  beforeEach(() => {
    search = "template=t1";
  });

  it("says how many points are missing and blocks publishing", async () => {
    mocks.getTemplate.mockResolvedValue(
      template({
        sections: [section("s1", "Servicio a la comunidad", 400), section("s2", "Evangelismo", 1400)],
      }),
    );
    renderPage([template()]);
    expect(await screen.findByText(/Los apartados suman 1,800 de 2,000 pts: faltan 200/)).toBeInTheDocument();
    expect(screen.getByText(/Progreso anual/)).toBeInTheDocument();
    expect(screen.queryByText(/ranking/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar…" })).toBeDisabled();
  });

  it("publishes after confirming once the sections add up exactly", async () => {
    const user = userEvent.setup();
    mocks.getTemplate.mockResolvedValue(
      template({ sections: [section("s1", "Servicio a la comunidad", 1000), section("s2", "Evangelismo", 1000)] }),
    );
    mocks.updateTemplate.mockResolvedValue(template({ status: "PUBLISHED", active: true }));
    renderPage([template()]);
    expect(await screen.findByText(/Lista para publicar/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Publicar…" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(mocks.updateTemplate).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Publicar plantilla" }));
    await waitFor(() => expect(mocks.updateTemplate).toHaveBeenCalledWith("t1", { active: true }));
  });
});
