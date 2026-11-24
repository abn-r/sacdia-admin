import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlWrapper, testMessages } from "@/components/requests/test-intl";
import type { TransferRequest } from "@/lib/api/requests";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const navReplace = vi.fn();
let navSearch = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navReplace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/requests/transfers",
  useSearchParams: () => new URLSearchParams(navSearch),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockList = vi.fn<(...args: any[]) => Promise<TransferRequest[]>>();
const mockReview = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */
vi.mock("@/lib/api/requests", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/requests")>();
  return {
    ...original,
    getTransferRequests: (...args: unknown[]) => mockList(...args),
    reviewTransferRequest: (...args: unknown[]) => mockReview(...args),
  };
});

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { TransfersQueue } from "@/components/requests/transfers-queue";
import { ApiError } from "@/lib/api/client";

const msg = testMessages.queues.requests;
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

function transfer(
  id: string,
  name: string,
  from: string,
  to: string,
  days: number,
  overrides: Partial<TransferRequest> = {},
): TransferRequest {
  return {
    request_id: id,
    status: "PENDING",
    reason: "Cambio de domicilio",
    comment: null,
    created_at: daysAgo(days),
    reviewed_at: null,
    requester: { user_id: `u-${id}`, first_name: name.split(" ")[0] ?? name, last_name: name.split(" ")[1] ?? "" },
    from_section: { section_id: 1, name: from },
    to_section: { section_id: 2, name: to },
    ...overrides,
  };
}

const ROWS: TransferRequest[] = [
  transfer("t1", "Sofía Mendoza", "Club Orión", "Club Halcones del Valle", 18),
  transfer("t2", "Diego Ramírez", "Club Cedros", "Club Orión", 16),
  transfer("t3", "Valeria Cruz", "Club Pioneros", "Club Faro", 11),
  transfer("t4", "Emiliano Torres", "Club Águilas", "Club Orión", 6, {
    status: "APPROVED",
    reviewed_at: daysAgo(2),
  }),
  transfer("t5", "Camila Rojas", "Club Faro", "Club Estrella", 9, {
    status: "REJECTED",
    reviewed_at: daysAgo(3),
    comment: "Sin cupo",
  }),
];

function renderQueue(props: Partial<React.ComponentProps<typeof TransfersQueue>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlWrapper>
        <TransfersQueue initialRequests={ROWS} canReview {...props} />
      </IntlWrapper>
    </QueryClientProvider>,
  );
}

const table = () => screen.getByRole("table");

beforeEach(() => {
  vi.clearAllMocks();
  navSearch = "";
  mockList.mockResolvedValue(ROWS);
  mockReview.mockResolvedValue({});
});
afterEach(() => cleanup());

describe("TransfersQueue", () => {
  it("shows tabs with the real count of each state, pending selected", () => {
    renderQueue();
    expect(screen.getByRole("tab", { name: /Pendientes\s*3/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Aprobadas\s*1/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Rechazadas\s*1/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Todas\s*5/ })).toBeInTheDocument();
  });

  it("the Pendientes tab has no status column and lists only pending, oldest first", () => {
    renderQueue();
    expect(within(table()).queryByRole("columnheader", { name: "Estado" })).toBeNull();
    expect(within(table()).getByRole("columnheader", { name: "Espera" })).toBeInTheDocument();
    const names = within(table())
      .getAllByRole("button", { name: /^(Sofía|Diego|Valeria)/ })
      .map((b) => b.textContent);
    expect(names).toEqual(["Sofía Mendoza", "Diego Ramírez", "Valeria Cruz"]);
    expect(within(table()).queryByText("Emiliano Torres")).toBeNull();
  });

  it("shows the wait in amber from 14 days only", () => {
    renderQueue();
    const waits = within(table()).getAllByText(/días$/);
    const flags = waits.map((el) => el.getAttribute("data-long-wait"));
    expect(waits.map((el) => el.textContent)).toEqual(["18 días", "16 días", "11 días"]);
    expect(flags).toEqual(["true", "true", null]);
    expect(waits[0]).toHaveClass("text-warning");
    expect(waits[2]).not.toHaveClass("text-warning");
  });

  it("the history tabs show the review date instead of the wait", () => {
    navSearch = "tab=approved";
    renderQueue();
    expect(within(table()).getByText("Emiliano Torres")).toBeInTheDocument();
    expect(within(table()).queryByRole("columnheader", { name: "Espera" })).toBeNull();
    expect(within(table()).getByRole("columnheader", { name: "Revisada" })).toBeInTheDocument();
  });

  it("'Todas' marks only the exceptions: approved has no badge, rejected and pending do", () => {
    navSearch = "tab=all";
    renderQueue();
    const rows = within(table()).getAllByRole("row").slice(1);
    const rowOf = (name: string) => rows.find((r) => within(r).queryByText(name)) as HTMLElement;
    expect(within(rowOf("Emiliano Torres")).queryByText("Aprobado")).toBeNull();
    expect(within(rowOf("Camila Rojas")).getByText("Rechazado")).toBeInTheDocument();
    expect(within(rowOf("Sofía Mendoza")).getByText("Pendiente")).toBeInTheDocument();
  });

  it("filters by search and by destination club, and clears them from the empty result", async () => {
    const user = userEvent.setup();
    renderQueue();

    await user.type(screen.getByLabelText(msg.common.search.label), "faro");
    expect(within(table()).getByText("Valeria Cruz")).toBeInTheDocument();
    expect(within(table()).queryByText("Sofía Mendoza")).toBeNull();

    await user.clear(screen.getByLabelText(msg.common.search.label));
    await user.selectOptions(screen.getByLabelText(msg.transfers.filters.destination), "Club Orión");
    expect(within(table()).getByText("Diego Ramírez")).toBeInTheDocument();
    expect(within(table()).queryByText("Sofía Mendoza")).toBeNull();

    await user.type(screen.getByLabelText(msg.common.search.label), "zzzz");
    expect(await screen.findByText(msg.common.empty.noResultsTitle)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: msg.common.empty.clearFilters }));
    expect(within(table()).getByText("Sofía Mendoza")).toBeInTheDocument();
  });

  it("opens the sheet with origin and destination stacked, and approves with an optional comment", async () => {
    const user = userEvent.setup();
    renderQueue();

    await user.click(screen.getByRole("button", { name: "Revisar: Sofía Mendoza" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("Club Orión")).toBeInTheDocument();
    expect(within(sheet).getByText(msg.transfers.sheet.changesTo)).toBeInTheDocument();
    expect(within(sheet).getByText("Club Halcones del Valle")).toBeInTheDocument();
    expect(within(sheet).getByText(/Enviado el .* · espera 18 días/)).toBeInTheDocument();

    await user.type(within(sheet).getByLabelText(msg.transfers.sheet.commentLabel), "Bienvenida");
    await user.click(within(sheet).getByRole("button", { name: msg.transfers.sheet.approve }));

    await waitFor(() =>
      expect(mockReview).toHaveBeenCalledWith("t1", { action: "approved", comment: "Bienvenida" }),
    );
    expect(toast.success).toHaveBeenCalledWith(msg.transfers.toasts.approved);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mockList).toHaveBeenCalled();
  });

  it("rejects inside the same sheet with a required reason", async () => {
    const user = userEvent.setup();
    renderQueue();

    await user.click(screen.getByRole("button", { name: "Revisar: Diego Ramírez" }));
    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: msg.common.rejectAction }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(within(sheet).getByText(new RegExp(msg.transfers.sheet.rejectAudience))).toBeInTheDocument();

    await user.type(
      within(sheet).getByLabelText(new RegExp(msg.sheet.reasonLabel)),
      "El club destino no tiene cupo",
    );
    await user.click(within(sheet).getByRole("button", { name: msg.transfers.sheet.rejectConfirm }));

    await waitFor(() =>
      expect(mockReview).toHaveBeenCalledWith("t2", {
        action: "rejected",
        comment: "El club destino no tiene cupo",
      }),
    );
  });

  it("a server error stays inside the sheet", async () => {
    const user = userEvent.setup();
    mockReview.mockRejectedValue(new ApiError("Ya fue revisada", 409, null));
    renderQueue();

    await user.click(screen.getByRole("button", { name: "Revisar: Sofía Mendoza" }));
    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: msg.transfers.sheet.approve }));

    expect(await within(sheet).findByText("Ya fue revisada")).toBeInTheDocument();
  });

  it("without review permission the sheet is read-only and there is no selection", async () => {
    const user = userEvent.setup();
    renderQueue({ canReview: false });

    expect(screen.queryByRole("checkbox")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ver: Sofía Mendoza" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).queryByRole("button", { name: msg.transfers.sheet.approve })).toBeNull();
    expect(within(sheet).getAllByRole("button", { name: msg.sheet.close }).length).toBeGreaterThan(0);
  });

  it("a reviewed transfer shows its outcome and comment in the sheet", async () => {
    const user = userEvent.setup();
    navSearch = "tab=rejected";
    renderQueue();

    await user.click(screen.getByRole("button", { name: "Ver: Camila Rojas" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("Sin cupo")).toBeInTheDocument();
    expect(within(sheet).getByText(/Rechazado/)).toBeInTheDocument();
  });

  describe("selection and batch approve", () => {
    it("selecting enables approving in a batch, one by one, and reports each failure", async () => {
      const user = userEvent.setup();
      mockReview.mockImplementation(async (id: string) => {
        if (id === "t2") throw new ApiError("Cupo lleno", 409, null);
        return {};
      });
      renderQueue();

      await user.click(within(table()).getByRole("checkbox", { name: "Seleccionar el traslado de Sofía Mendoza" }));
      await user.click(within(table()).getByRole("checkbox", { name: "Seleccionar el traslado de Diego Ramírez" }));
      const bar = screen.getByRole("region", { name: msg.transfers.bulk.label });
      expect(within(bar).getByText("2 seleccionados")).toBeInTheDocument();

      await user.click(within(bar).getByRole("button", { name: "Aprobar 2" }));
      const confirm = await screen.findByRole("alertdialog");
      await user.click(within(confirm).getByRole("button", { name: "Aprobar 2" }));

      await waitFor(() => expect(mockReview).toHaveBeenCalledTimes(2));
      expect(mockReview).toHaveBeenNthCalledWith(1, "t1", { action: "approved" });
      expect(mockReview).toHaveBeenNthCalledWith(2, "t2", { action: "approved" });

      const alert = await screen.findByText("No se pudo aprobar 1 traslado");
      expect(alert.closest("[role=alert]")).toHaveTextContent("Diego Ramírez: Cupo lleno");
      expect(toast.success).toHaveBeenCalledWith("1 traslado aprobado");
      // The failed one stays selected so it can be retried.
      expect(
        within(table()).getByRole("checkbox", { name: "Seleccionar el traslado de Diego Ramírez" }),
      ).toBeChecked();
      expect(
        within(table()).getByRole("checkbox", { name: "Seleccionar el traslado de Sofía Mendoza" }),
      ).not.toBeChecked();
    });

    it("'Limpiar selección' clears it", async () => {
      const user = userEvent.setup();
      renderQueue();
      await user.click(screen.getByRole("checkbox", { name: msg.transfers.selectPage }));
      expect(screen.getByText("3 seleccionados")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: msg.transfers.bulk.clear }));
      expect(screen.queryByText("3 seleccionados")).toBeNull();
    });

    it("the history tabs have no selection", () => {
      navSearch = "tab=approved";
      renderQueue();
      expect(screen.queryByRole("checkbox")).toBeNull();
    });
  });

  describe("empty and error states", () => {
    it("with zero pending the tabs and the history stay, with a way to the approved ones", async () => {
      const user = userEvent.setup();
      renderQueue({ initialRequests: ROWS.filter((r) => r.status !== "PENDING") });

      expect(screen.getByRole("tab", { name: /Pendientes\s*0/ })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Aprobadas\s*1/ })).toBeInTheDocument();
      expect(screen.getByText(msg.transfers.empty.pending.title)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: msg.common.empty.viewApproved }));
      expect(navReplace).toHaveBeenCalledWith("/dashboard/requests/transfers?tab=approved", {
        scroll: false,
      });
    });

    it("a failed load is an error inside the table frame, never 'sin solicitudes'", async () => {
      const user = userEvent.setup();
      renderQueue({ initialRequests: null, initialFailure: { kind: "error" } });

      expect(screen.getByText(msg.transfers.error.title)).toBeInTheDocument();
      expect(screen.queryByText(msg.transfers.empty.pending.title)).toBeNull();
      // Tabs stay, without invented counts.
      expect(screen.getByRole("tab", { name: "Pendientes" })).toBeInTheDocument();
      expect(within(table()).getByRole("columnheader", { name: "Persona" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Reintentar" }));
      await waitFor(() => expect(mockList).toHaveBeenCalled());
      expect(await within(table()).findByText("Sofía Mendoza")).toBeInTheDocument();
    });

    it("a failed refresh keeps the rows and says the data is old", async () => {
      const user = userEvent.setup();
      const failing = new ApiError("down", 500, null);
      mockList.mockRejectedValue(failing);
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={queryClient}>
          <IntlWrapper>
            <TransfersQueue initialRequests={ROWS} canReview />
          </IntlWrapper>
        </QueryClientProvider>,
      );
      await user.click(screen.getByRole("button", { name: "Revisar: Sofía Mendoza" }));
      const sheet = await screen.findByRole("dialog");
      await user.click(within(sheet).getByRole("button", { name: msg.transfers.sheet.approve }));

      expect(await screen.findByText(/Mostramos los datos de las/)).toBeInTheDocument();
      expect(within(table()).getByText("Diego Ramírez")).toBeInTheDocument();
    });
  });
});
