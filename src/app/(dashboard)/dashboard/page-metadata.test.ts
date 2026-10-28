import { describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/es.json";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => {
    const path = `${namespace}.${key}`.split(".");
    let node: unknown = messages;
    for (const part of path) node = (node as Record<string, unknown>)?.[part];
    return typeof node === "string" ? node : path.join(".");
  },
  getLocale: async () => "es",
}));

vi.mock("@/lib/auth/session", () => ({ requireAdminUser: vi.fn() }));

const getAdminUserDetailMock = vi.fn();
vi.mock("@/lib/api/admin-users", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/admin-users")>()),
  getAdminUserDetail: (...args: unknown[]) => getAdminUserDetailMock(...args),
}));

import { generateMetadata as rolesMetadata } from "./configuration/roles/page";
import { generateMetadata as matrixMetadata } from "./configuration/matrix/page";
import { generateMetadata as auditMetadata } from "./configuration/audit/page";
import { generateMetadata as pastorsMetadata } from "./investiture-pastors/page";
import { generateMetadata as usersMetadata } from "./users/page";
import { generateMetadata as userDetailMetadata } from "./users/[userId]/page";
import { generateMetadata as financesMetadata } from "./finances/page";
import { generateMetadata as allergiesMetadata } from "./catalogs/allergies/page";
import { generateMetadata as jobsMetadata } from "./system/jobs/page";
import { generateMetadata as yearEndMetadata } from "./year-end/page";

describe("dashboard page titles", () => {
  it.each([
    ["roles", rolesMetadata, "Roles"],
    ["matrix", matrixMetadata, "Matriz de permisos"],
    ["audit", auditMetadata, "Auditoría"],
    ["investiture pastors", pastorsMetadata, "Pastores por distrito"],
    ["users list", usersMetadata, "Usuarios"],
    ["finances", financesMetadata, messages.finances.page.title],
    ["catalog allergies", allergiesMetadata, messages.catalogs.pages.allergies.title],
    ["system jobs", jobsMetadata, messages.system_jobs.page.title],
    ["year end", yearEndMetadata, messages.year_end.page.title],
  ])("%s has a localized tab title", async (_name, generate, expected) => {
    const metadata = await (generate as () => Promise<{ title: string }>)();
    expect(metadata.title).toBe(expected);
  });

  it("user detail falls back to the localized title when the user cannot be loaded", async () => {
    getAdminUserDetailMock.mockRejectedValueOnce(new Error("boom"));
    const metadata = await userDetailMetadata({ params: Promise.resolve({ userId: "u1" }) });
    expect(metadata.title).toBe("Detalle de usuario");
  });

  it("user detail uses the user's display name", async () => {
    getAdminUserDetailMock.mockResolvedValueOnce({
      user_id: "u1",
      name: "Ana",
      paternal_last_name: "Pérez",
      maternal_last_name: "Gómez",
    });
    const metadata = await userDetailMetadata({ params: Promise.resolve({ userId: "u1" }) });
    expect(String(metadata.title)).toContain("Ana");
  });
});
