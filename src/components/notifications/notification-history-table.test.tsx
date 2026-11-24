import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../messages/es.json";
import { ApiError } from "@/lib/api/client";
import type { NotificationLog } from "@/lib/api/notifications";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/notifications",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string, values?: Record<string, unknown>) => {
    const path = `${namespace}.${key}`.split(".");
    let node: unknown = messages;
    for (const part of path) node = (node as Record<string, unknown>)?.[part];
    if (typeof node !== "string") return path.join(".");
    return node.replace(/\{(\w+)\}/g, (_, name) => String(values?.[name] ?? `{${name}}`));
  },
}));

vi.mock("@/lib/format-locale", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/format-locale")>()),
  getFormatDateTime: async () => (value: string) => value,
}));

vi.mock("@/lib/notifications/history-targets", () => ({
  resolveNotificationTargetUsers: async () => new Map(),
  formatNotificationTargetUser: () => ({ primary: "" }),
}));

vi.mock("@/components/shared/data-table-pagination", () => ({
  DataTablePagination: () => <div data-testid="pagination" />,
}));

const getHistoryMock = vi.fn();
vi.mock("@/lib/api/notifications", () => ({
  getNotificationHistory: (...args: unknown[]) => getHistoryMock(...args),
}));

import { NotificationHistoryTable } from "./notification-history-table";

function log(overrides: Partial<NotificationLog>): NotificationLog {
  return {
    log_id: 1,
    title: "Aviso",
    body: "Cuerpo",
    type: "USER",
    target_type: "user",
    target_id: null,
    sent_by: null,
    tokens_sent: 1,
    tokens_failed: 0,
    created_at: new Date().toISOString(),
    users: null,
    ...overrides,
  };
}

function page(data: NotificationLog[]) {
  return { data, total: data.length, page: 1, limit: 20, totalPages: 1 };
}

async function renderTable(props: Parameters<typeof NotificationHistoryTable>[0] = { page: 1, limit: 20 }) {
  const ui = await NotificationHistoryTable(props);
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  getHistoryMock.mockReset();
});

describe("NotificationHistoryTable", () => {
  it("labels every target the backend can write", async () => {
    getHistoryMock.mockResolvedValue(
      page([
        log({ log_id: 1, type: "BROADCAST", target_type: "all" }),
        log({ log_id: 2, type: "CLUB", target_type: "club_section", target_id: "7" }),
        log({ log_id: 3, type: "SECTION_ROLE", target_type: "section_role" }),
        log({ log_id: 4, type: "GLOBAL_ROLE", target_type: "global_role" }),
      ]),
    );

    await renderTable();

    expect(screen.getAllByText("Todos").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sección de club").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rol en sección").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rol global").length).toBeGreaterThan(0);
    expect(screen.queryByText("section_role")).toBeNull();
    expect(screen.queryByText("GLOBAL_ROLE")).toBeNull();
  });

  it("shows a translated sender when the log has no author", async () => {
    getHistoryMock.mockResolvedValue(page([log({ type: "BROADCAST", target_type: "all" })]));
    await renderTable();
    expect(screen.getAllByText("Sistema").length).toBeGreaterThan(0);
  });

  it("reads deliveries as 'N de M', plain N when all arrived, and 'Sin dispositivos' for nobody", async () => {
    getHistoryMock.mockResolvedValue(
      page([
        log({ log_id: 1, title: "Parcial", tokens_sent: 31, tokens_failed: 1 }),
        log({ log_id: 2, title: "Completa", tokens_sent: 64, tokens_failed: 0 }),
        log({ log_id: 3, title: "Nadie", tokens_sent: 0, tokens_failed: 0 }),
      ]),
    );

    await renderTable();

    expect(screen.getAllByText("31 de 32").length).toBeGreaterThan(0);
    expect(screen.getAllByText("64").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sin dispositivos").length).toBeGreaterThan(0);
  });

  it("shows an error inside the table frame, never an empty history", async () => {
    getHistoryMock.mockRejectedValue(new ApiError("boom", 500, {}));
    await renderTable();

    expect(screen.getByRole("alert")).toHaveTextContent(
      messages.people.community.notifications.history.loadError,
    );
    expect(screen.getByRole("columnheader", { name: "Para" })).toBeInTheDocument();
    expect(screen.queryByText(messages.notifications.history.empty_title)).toBeNull();
  });

  it("filters the latest 100 sends and says so, without pagination", async () => {
    getHistoryMock.mockResolvedValue(
      page([
        log({ log_id: 1, title: "Inscripciones abiertas", type: "BROADCAST", target_type: "all" }),
        log({ log_id: 2, title: "Cambio de lugar" }),
      ]),
    );

    await renderTable({
      page: 3,
      limit: 20,
      filters: { q: "inscripciones", audience: "all", range: "all" },
    });

    expect(getHistoryMock).toHaveBeenCalledWith(1, 100);
    expect(screen.getAllByText("Inscripciones abiertas").length).toBeGreaterThan(0);
    expect(screen.queryByText("Cambio de lugar")).toBeNull();
    expect(screen.getByText(/Filtrando entre las últimas 100/)).toBeInTheDocument();
    expect(screen.queryByTestId("pagination")).toBeNull();
  });

  it("offers to clear the filters when nothing matches", async () => {
    getHistoryMock.mockResolvedValue(page([log({ title: "Otra cosa" })]));
    await renderTable({ page: 1, limit: 20, filters: { q: "zzz", audience: "all", range: "all" } });
    expect(screen.getByRole("link", { name: "Limpiar filtros" })).toHaveAttribute(
      "href",
      "/dashboard/notifications",
    );
  });
});
