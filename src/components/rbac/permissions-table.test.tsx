import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type { Permission } from "@/lib/rbac/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/configuration/permissions",
  useSearchParams: () => new URLSearchParams("page=2"),
}));

import { PermissionsTable } from "@/components/rbac/permissions-table";

function permissions(from: number, count: number): Permission[] {
  return Array.from({ length: count }, (_, i) => ({
    permission_id: String(from + i),
    permission_name: `resource${from + i}:read`,
    description: null,
    active: true,
  })) as Permission[];
}

const noopAction = vi.fn(async () => ({}));

function renderTable(items: Permission[], pagination?: React.ComponentProps<typeof PermissionsTable>["pagination"]) {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PermissionsTable
        items={items}
        createAction={noopAction}
        updateAction={vi.fn(async () => ({}))}
        deleteAction={vi.fn(async () => ({}))}
        pagination={pagination}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(() => cleanup());

describe("PermissionsTable pagination", () => {
  it("renders only the rows it receives and a pager describing the whole catalog", () => {
    renderTable(permissions(21, 20), { page: 2, limit: 20, total: 221, totalPages: 12 });

    expect(screen.getAllByText("resource21:read").length).toBeGreaterThan(0);
    expect(screen.queryByText("resource1:read")).not.toBeInTheDocument();
    expect(screen.queryByText("resource41:read")).not.toBeInTheDocument();
    expect(screen.getByText("Mostrando 21–40 de 221 registros")).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 12")).toBeInTheDocument();
  });

  it("does not render a pager when no pagination is given", () => {
    renderTable(permissions(1, 3));
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });
});
