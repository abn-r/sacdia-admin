import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import esMessages from "../../../messages/es.json";
import enMessages from "../../../messages/en.json";
import type { CertificateBulkImportBatch } from "@/lib/api/certificate-bulk-imports";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { CertificateBulkImportListPage } from "@/components/certificate-bulk-imports/certificate-bulk-import-list-page";

const BATCHES: CertificateBulkImportBatch[] = [
  {
    batch_id: "batch-aaaaaaaa-1",
    user_id: "u1",
    status: "SUBMITTED",
    submitted_at: "2026-10-01T10:00:00Z",
    user: { user_id: "u1", name: "Ana", paternal_last_name: "Pérez", email: null } as never,
    items: [],
  },
  {
    batch_id: "batch-bbbbbbbb-2",
    user_id: "u2",
    status: "NEEDS_CORRECTION",
    submitted_at: "2026-10-02T10:00:00Z",
    user: { user_id: "u2", name: "Luis", paternal_last_name: "Gómez", email: "luis@example.com" } as never,
    items: [],
  },
];

function renderList(locale: "es" | "en", batches = BATCHES) {
  const messages = locale === "es" ? esMessages : enMessages;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <CertificateBulkImportListPage batches={batches} total={7} />
    </NextIntlClientProvider>,
  );
}

describe("CertificateBulkImportListPage", () => {
  afterEach(() => cleanup());

  it("renders the KPI cards and user-facing hints in Spanish", () => {
    renderList("es");
    expect(screen.getByText("Lotes pendientes")).toBeInTheDocument();
    expect(screen.getByText("7 en bandeja")).toBeInTheDocument();
    expect(screen.getByText("Todos los lotes")).toBeInTheDocument();
    expect(screen.queryByText(/API/)).not.toBeInTheDocument();
    expect(screen.getByText("Sin email")).toBeInTheDocument();
  });

  it("renders the list in English", () => {
    renderList("en");
    expect(screen.getByText("Pending batches")).toBeInTheDocument();
    expect(screen.getByText("7 in the tray")).toBeInTheDocument();
    expect(screen.getByText("All batches")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search member or batch")).toBeInTheDocument();
    expect(screen.getByText("No email")).toBeInTheDocument();
    expect(screen.getByText("Needs correction")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Review/ })).toHaveLength(2);
  });

  it("shows the localized no-results state when the search matches nothing", async () => {
    const user = userEvent.setup();
    renderList("en");
    await user.type(screen.getByPlaceholderText("Search member or batch"), "zzzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("No batches match the current filter.")).toBeInTheDocument();
  });
});
