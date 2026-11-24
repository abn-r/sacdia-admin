import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Users } from "lucide-react";
import messages from "../../../messages/es.json";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: vi.fn() } }));

import {
  ErrorState,
  ErrorStateTableRow,
  type ErrorStateProps,
} from "@/components/shared/error-state";
import { Table, TableBody } from "@/components/ui/table";

afterEach(() => {
  cleanup();
  refresh.mockClear();
  toastSuccess.mockClear();
});

function wrap(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="es" messages={messages}>
      {node}
    </NextIntlClientProvider>
  );
}
const ui = (props: ErrorStateProps) => wrap(<ErrorState {...props} />);

describe("ErrorState", () => {
  it("renders the default error copy with role alert", () => {
    render(ui({}));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("No pudimos cargar esta información")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each([
    ["forbidden", "Acceso restringido", "status"],
    ["notFound", "No encontramos lo que buscas", "status"],
    ["offline", "Sin conexión", "alert"],
    ["rateLimited", "Hay muchas solicitudes en este momento", "alert"],
  ] as const)("kind %s uses its copy and role", (kind, title, role) => {
    render(ui({ kind }));
    expect(screen.getByRole(role)).toHaveTextContent(title);
  });

  it("shows the destructive badge only for error with a contextual icon", () => {
    const { rerender } = render(ui({ icon: Users }));
    expect(document.querySelector('[data-slot="error-state-badge"]')).not.toBeNull();
    rerender(ui({}));
    expect(document.querySelector('[data-slot="error-state-badge"]')).toBeNull();
  });

  it("retry=true refreshes the router; onRetry takes precedence", async () => {
    const { rerender } = render(ui({ retry: true }));
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refresh).toHaveBeenCalledTimes(1);

    const onRetry = vi.fn();
    rerender(ui({ retry: true, onRetry }));
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("inline variant renders a text row with a retry link", async () => {
    const onRetry = vi.fn();
    render(ui({ variant: "inline", title: "No pudimos cargar los socios", onRetry }));
    expect(screen.getByText("No pudimos cargar los socios")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.queryByText("Copiar detalle")).not.toBeInTheDocument();
  });

  it("shows the detail line and copies code, time, ref and path", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(ui({ detail: { code: 500, at: "2026-11-24T16:42:00Z", ref: "req-1" } }));
    expect(screen.getByText(/Error 500 · .*10:42/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Copiar detalle/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const text = writeText.mock.calls[0]![0] as string;
    expect(text).toContain("code: 500");
    expect(text).toContain("at: 2026-11-24T16:42:00.000Z");
    expect(text).toContain("ref: req-1");
    expect(text).toContain(`path: ${window.location.pathname}`);
    expect(toastSuccess).toHaveBeenCalledWith("Detalle copiado");
  });

  it("never shows copy detail for rateLimited", () => {
    render(ui({ kind: "rateLimited", detail: { code: 429, at: new Date() } }));
    expect(screen.queryByText("Copiar detalle")).not.toBeInTheDocument();
    expect(screen.queryByText(/Error 429/)).not.toBeInTheDocument();
  });

  it("renders extra actions", () => {
    render(ui({ kind: "forbidden", actions: <button type="button">Ir al inicio</button> }));
    expect(screen.getByRole("button", { name: "Ir al inicio" })).toBeInTheDocument();
  });
});

describe("ErrorStateTableRow", () => {
  it("renders a spanning cell inside the table", () => {
    render(
      wrap(
        <Table>
          <TableBody>
            <ErrorStateTableRow colSpan={5} kind="offline" />
          </TableBody>
        </Table>,
      ),
    );
    const cell = screen.getByRole("cell");
    expect(cell).toHaveAttribute("colspan", "5");
    expect(cell).toHaveTextContent("Sin conexión");
  });
});
