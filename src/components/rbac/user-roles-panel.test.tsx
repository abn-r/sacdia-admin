import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import { UserRolesPanel } from "@/components/rbac/user-roles-panel";
import type { Role, UserRole } from "@/lib/rbac/types";

// `rbac.mutate_global_roles` of the actor (platform admin roles are super-admin only).
const actor = vi.hoisted(() => ({ canMutateGlobalRoles: false }));

vi.mock("@/lib/auth/screen-catalog/use-screen-access", () => ({
  useCanCapability: () => actor.canMutateGlobalRoles,
}));

function makeRole(roleName: string, category = "GLOBAL"): Role {
  return {
    role_id: `role-${roleName}`,
    role_name: roleName,
    role_category: category,
    description: null,
    active: true,
    role_permissions: [],
  };
}

function makeUserRole(roleName: string, category = "GLOBAL"): UserRole {
  return {
    user_role_id: `ur-${roleName}`,
    user_id: "user-1",
    role_id: `role-${roleName}`,
    active: true,
    created_at: null,
    modified_at: null,
    roles: {
      role_id: `role-${roleName}`,
      role_name: roleName,
      role_category: category,
      active: true,
    },
  };
}

function renderPanel(initialUserRoles: UserRole[], canMutateGlobalRoles = false) {
  actor.canMutateGlobalRoles = canMutateGlobalRoles;
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <UserRolesPanel
        userId="user-1"
        initialUserRoles={initialUserRoles}
        allRoles={[makeRole("admin"), makeRole("pastor"), makeRole("user")]}
      />
    </NextIntlClientProvider>,
  );
}

describe("UserRolesPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses a single system-roles heading and empty state", () => {
    renderPanel([]);

    expect(screen.getByText("Roles de sistema")).toBeInTheDocument();
    expect(screen.getByText("Sin rol de sistema")).toBeInTheDocument();
    expect(screen.queryByText("Roles globales")).not.toBeInTheDocument();
    expect(screen.queryByText("Roles administrativos")).not.toBeInTheDocument();
    expect(screen.queryByText("Roles operativos")).not.toBeInTheDocument();
  });

  it("groups assigned system roles as subsections inside the same card", () => {
    renderPanel([
      makeUserRole("admin"),
      makeUserRole("pastor"),
      makeUserRole("user"),
    ]);

    expect(screen.getByText("Roles de sistema")).toBeInTheDocument();
    expect(screen.getByText("Administrativos")).toBeInTheDocument();
    expect(screen.getByText("Operativos")).toBeInTheDocument();
    expect(screen.getByText("Otros")).toBeInTheDocument();
    expect(screen.getByText("Administrador")).toBeInTheDocument();
    expect(screen.getByText("Pastor")).toBeInTheDocument();
    expect(screen.getByText("Usuario")).toBeInTheDocument();
    expect(screen.queryByText("Roles globales")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin rol de sistema")).not.toBeInTheDocument();
  });

  it("omits subsection headings when only one system-role group is present", () => {
    renderPanel([makeUserRole("user")]);

    expect(screen.getByText("Roles de sistema")).toBeInTheDocument();
    expect(screen.getByText("Usuario")).toBeInTheDocument();
    expect(screen.queryByText("Otros")).not.toBeInTheDocument();
    expect(screen.queryByText("Administrativos")).not.toBeInTheDocument();
  });

  it("hides the remove action on admin roles without rbac.mutate_global_roles", () => {
    renderPanel([makeUserRole("admin"), makeUserRole("pastor")]);

    const removeButtons = screen.getAllByRole("button", { name: /quitar|remover/i });
    expect(removeButtons).toHaveLength(1);
    expect(removeButtons[0].getAttribute("title")).toContain("Pastor");
  });

  it("lets an actor with rbac.mutate_global_roles remove admin roles", () => {
    renderPanel([makeUserRole("admin"), makeUserRole("pastor")], true);

    expect(screen.getAllByRole("button", { name: /quitar|remover/i })).toHaveLength(2);
  });
});
