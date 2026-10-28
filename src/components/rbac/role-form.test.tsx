import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockCreateRoleAction = vi.fn();
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/configuration/roles/new",
}));

vi.mock("@/lib/rbac/actions", () => ({
  createRoleAction: (...args: unknown[]) => mockCreateRoleAction(...args),
  updateRoleAction: vi.fn(),
}));

vi.mock("@/components/rbac/permission-picker", () => ({
  PermissionPicker: () => <div data-testid="permission-picker" />,
}));

import { CreateRoleForm } from "./role-form";

function setup() {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <CreateRoleForm allPermissions={[]} />
    </NextIntlClientProvider>,
  );
  const nameInput = screen.getByLabelText(/Nombre del rol/);
  const descInput = document.getElementById("description") as HTMLTextAreaElement;
  fireEvent.change(descInput, { target: { value: "Rol encargado de la tesorería" } });
  return { nameInput };
}

describe("CreateRoleForm - step 1 role_name validation", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("states the real rule in the hint (no digits)", () => {
    setup();
    expect(screen.getByText(/No se permiten números/)).toBeInTheDocument();
    expect(screen.queryByText(/a-z0-9-/)).toBeNull();
  });

  it("blocks Continuar with an inline error when the name has digits", () => {
    const { nameInput } = setup();
    fireEvent.change(nameInput, { target: { value: "rol-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(/solo letras minúsculas y guiones/);
    expect(screen.queryByTestId("permission-picker")).toBeNull();
  });

  it("advances to permissions with a valid name", () => {
    const { nameInput } = setup();
    fireEvent.change(nameInput, { target: { value: "tesorero-club" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByTestId("permission-picker")).toBeInTheDocument();
  });

  it("maps a backend role_name error to the field and returns to step 1", async () => {
    const { nameInput } = setup();
    fireEvent.change(nameInput, { target: { value: "tesorero-club" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    mockCreateRoleAction.mockResolvedValue({
      error: "El nombre debe tener entre 3 y 64 caracteres: solo letras minúsculas y guiones medios",
      field: "role_name",
    });
    fireEvent.click(screen.getByRole("button", { name: /Crear rol/ }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre del rol/)).toHaveAttribute("aria-invalid", "true");
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/solo letras minúsculas/);
  });

  it("confirms the creation with a success toast", async () => {
    const { nameInput } = setup();
    fireEvent.change(nameInput, { target: { value: "tesorero-club" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    mockCreateRoleAction.mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: /Crear rol/ }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Rol "tesorero-club" creado.');
    });
  });
});
