import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { CertificateBulkImportBatch, CertificateBulkImportItem } from "@/lib/api/certificate-bulk-imports";
import es from "../../../messages/es.json";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import ptBR from "../../../messages/pt-BR.json";

const certificatesMessages = { es, en, fr, "pt-BR": ptBR };

// Tabs live in the URL: a tiny reactive store stands in for the router.
const nav = vi.hoisted(() => {
  let search = "";
  const subs = new Set<() => void>();
  return {
    get: () => search,
    set(next: string) {
      search = next;
      subs.forEach((fn) => fn());
    },
    subscribe(fn: () => void) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
});
vi.mock("next/navigation", async () => {
  const react = await import("react");
  return {
    useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: (url: string) => nav.set(url.split("?")[1] ?? "") }),
    usePathname: () => "/dashboard/certificate-bulk-imports",
    useSearchParams: () => new URLSearchParams(react.useSyncExternalStore(nav.subscribe, nav.get, nav.get)),
  };
});

import { CertificateBatchQueue } from "@/components/certificate-bulk-imports/certificate-batch-queue";

function rows(statuses: CertificateBulkImportItem["status"][]): CertificateBulkImportItem[] {
  return statuses.map((status, index) => ({
    item_id: `i-${index}`,
    batch_id: "b",
    item_type: "HONOR",
    status,
  }));
}

const BATCHES: CertificateBulkImportBatch[] = [
  {
    batch_id: "7ea7c443-0000",
    user_id: "u1",
    status: "SUBMITTED",
    submitted_at: "2026-11-13T10:00:00Z",
    user: { user_id: "u1", name: "Valeria", paternal_last_name: "Cruz", email: "valeria@example.com" },
    items: rows(["APPROVED", "APPROVED", "SUBMITTED"]),
  },
  {
    batch_id: "2b91f0aa-0000",
    user_id: "u2",
    status: "SUBMITTED",
    submitted_at: "2026-11-18T10:00:00Z",
    user: { user_id: "u2", name: "Diego", paternal_last_name: "Ramírez", email: null },
    items: rows(["SUBMITTED", "SUBMITTED"]),
  },
  {
    batch_id: "c04d7e12-0000",
    user_id: "u3",
    status: "PARTIALLY_APPROVED",
    submitted_at: "2026-11-21T10:00:00Z",
    user: { user_id: "u3", name: "Sofía", paternal_last_name: "Mendoza", email: null },
    items: rows(["APPROVED", "SUBMITTED", "SUBMITTED", "SUBMITTED"]),
  },
];

function renderQueue(total = BATCHES.length) {
  return render(
    <NextIntlClientProvider locale="es" messages={certificatesMessages.es}>
      <CertificateBatchQueue batches={BATCHES} total={total} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => nav.set(""));
afterEach(() => cleanup());

describe("CertificateBatchQueue", () => {
  it("shows the KPI strip once, with figures computed from the batches", () => {
    renderQueue();
    const strip = screen.getByRole("list", { name: "Resumen de cargas" });
    expect(strip).toHaveTextContent("Lotes por revisar");
    expect(strip).toHaveTextContent("Filas por decidir");
    // 1 + 2 + 3 undecided rows in 3 batches
    expect(strip).toHaveTextContent("6");
    expect(screen.getAllByRole("list", { name: "Resumen de cargas" })).toHaveLength(1);
  });

  it("tells the state with tabs, defaulting to the batches to review", async () => {
    const user = userEvent.setup();
    renderQueue();
    expect(screen.getByRole("tab", { name: /Por revisar/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByText("Valeria Cruz").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sofía Mendoza")).not.toBeInTheDocument();
    // no filter buttons repeating the tabs
    expect(screen.queryByRole("button", { name: "Parciales" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Parciales/ }));
    expect(screen.getAllByText("Sofía Mendoza").length).toBeGreaterThan(0);
    expect(screen.queryByText("Valeria Cruz")).not.toBeInTheDocument();
  });

  it("draws a single-colour progress told as '2 de 3'", () => {
    renderQueue();
    expect(screen.getAllByText("2 de 3").length).toBeGreaterThan(0);
    const bar = screen.getAllByRole("progressbar")[0] as HTMLElement;
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar.innerHTML).not.toMatch(/bg-(success|destructive|warning)/);
  });

  it("shows the empty state of the tab and the no-results state with a clear action", async () => {
    const user = userEvent.setup();
    renderQueue();
    await user.click(screen.getByRole("tab", { name: /En corrección/ }));
    expect(screen.getByText("Sin lotes en corrección")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Todos/ }));
    await user.type(screen.getByLabelText("Buscar miembro o lote"), "zzzz");
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(screen.getAllByText("Valeria Cruz").length).toBeGreaterThan(0);
  });

  it("says when only part of the batches were loaded", () => {
    renderQueue(250);
    expect(screen.getByText(/Mostrando 3 de 250 lotes/)).toBeInTheDocument();
  });
});
