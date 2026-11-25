import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { AnnualFolderEvaluationQueueItem } from "@/lib/api/annual-folders";

let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/dashboard/clubs/evidence-folders",
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("@/lib/auth/screen-catalog/use-screen-access", () => ({
  useScreenAccess: () => ({ canViewScreen: () => true, canCapability: () => true }),
}));

const mocks = vi.hoisted(() => ({ getEvaluationQueue: vi.fn() }));
vi.mock("@/lib/api/annual-folders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/annual-folders")>()),
  ...mocks,
}));

import { EvidenceFolderQueue } from "./evidence-folder-queue";
import { ApiError } from "@/lib/api/client";

function item(n: number, overrides: Partial<AnnualFolderEvaluationQueueItem> = {}): AnnualFolderEvaluationQueueItem {
  return {
    annual_folder_id: `f${n}`,
    display_name: `Club ${n}`,
    club_name: `Club Orión ${n}`,
    club_section_name: "Conquistadores",
    club_type_name: "Conquistadores",
    local_field_name: "Campo Valle Norte",
    union_name: "Asociación Valle Alto",
    template_name: "Carpeta 2026",
    year_label: "2026",
    folder_status: "submitted",
    total_sections: 6,
    total_evidences: 9,
    submitted_sections_count: 3,
    preapproved_sections_count: 1,
    validated_sections_count: 0,
    rejected_sections_count: 0,
    pending_section_names: [],
    latest_submitted_at: "2026-11-20T10:00:00Z",
    created_at: null,
    ...overrides,
  };
}

function renderQueue() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es" messages={messages}>
        <EvidenceFolderQueue
          clubTypes={[]}
          ecclesiasticalYears={[]}
          unions={[]}
          localFields={[]}
          templates={[{ template_id: "t", active: true } as never]}
          rankingConfigs={[]}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  search = "";
  mocks.getEvaluationQueue.mockImplementation(async (params: { status: string; page: number; limit: number }) => {
    const total = params.status === "submitted" ? 45 : params.status === "preapproved" ? 2 : 19;
    const count = Math.min(params.limit, Math.max(0, total - (params.page - 1) * params.limit));
    return {
      data: Array.from({ length: count }, (_, i) => item((params.page - 1) * params.limit + i + 1)),
      total,
      page: params.page,
      limit: params.limit,
    };
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EvidenceFolderQueue", () => {
  it("shows the three tabs with their counts and the finding in the header", async () => {
    renderQueue();
    const tabs = await screen.findByRole("tablist", { name: "Estado de las carpetas" });
    await waitFor(() => expect(within(tabs).getByRole("tab", { name: /Por evaluar\s*45/ })).toBeInTheDocument());
    expect(within(tabs).getByRole("tab", { name: /Por confirmar en unión\s*2/ })).toBeInTheDocument();
    expect(within(tabs).getByRole("tab", { name: /Evaluadas\s*19/ })).toBeInTheDocument();
    expect(screen.getByText("45 carpetas por evaluar")).toBeInTheDocument();
  });

  it("pages through the API instead of hiding everything past the first 50", async () => {
    const user = userEvent.setup();
    renderQueue();
    expect(await within(await screen.findByRole("table")).findByText("Club Orión 1")).toBeInTheDocument();
    expect(mocks.getEvaluationQueue).toHaveBeenCalledWith(
      expect.objectContaining({ status: "submitted", page: 1, limit: 20 }),
    );
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await within(screen.getByRole("table")).findByText("Club Orión 21")).toBeInTheDocument();
    expect(mocks.getEvaluationQueue).toHaveBeenCalledWith(
      expect.objectContaining({ status: "submitted", page: 2, limit: 20 }),
    );
  });

  it("shows the sections of the active tab out of all sections and links to the folder", async () => {
    renderQueue();
    await within(await screen.findByRole("table")).findByText("Club Orión 1");
    const row = screen.getAllByRole("row")[1] as HTMLElement;
    expect(within(row).getByText("3 de 6")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Evaluar" })).toHaveAttribute(
      "href",
      "/dashboard/clubs/evidence-folders/f1",
    );
  });

  it("opens the union tab from the URL and links with the union focus", async () => {
    search = "tab=union";
    renderQueue();
    const table = await screen.findByRole("table");
    await within(table).findByText("Club Orión 1");
    expect(mocks.getEvaluationQueue).toHaveBeenCalledWith(
      expect.objectContaining({ status: "preapproved", page: 1, limit: 20 }),
    );
    expect(within(table).getAllByRole("link", { name: "Revisar" })[0]).toHaveAttribute(
      "href",
      "/dashboard/clubs/evidence-folders/f1?focus=union",
    );
  });

  it("shows a failed load as an error inside the table, never as an empty queue", async () => {
    mocks.getEvaluationQueue.mockRejectedValue(new ApiError("Server error", 500, null));
    renderQueue();
    expect(await screen.findByText("No pudimos cargar las carpetas")).toBeInTheDocument();
    expect(screen.queryByText("Nada por evaluar")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Carpeta" })).toBeInTheDocument();
  });

  it("explains an empty tab and offers no filters-cleared state without filters", async () => {
    mocks.getEvaluationQueue.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
    renderQueue();
    expect(await screen.findByText("Nada por evaluar")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
  });
});
