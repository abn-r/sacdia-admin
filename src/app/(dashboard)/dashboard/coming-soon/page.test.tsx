import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import messages from "../../../../../messages/es.json";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) => {
    const path = `${namespace}.${key}`.split(".");
    let node: unknown = messages;
    for (const part of path) node = (node as Record<string, unknown>)?.[part];
    return typeof node === "string" ? node : path.join(".");
  },
}));

import ComingSoonPage from "./page";

afterEach(cleanup);

describe("ComingSoonPage", () => {
  it("renders Spanish copy and a link back to the dashboard", async () => {
    render(await ComingSoonPage());

    expect(
      screen.getByRole("heading", { name: "Página en desarrollo" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Page not found/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
