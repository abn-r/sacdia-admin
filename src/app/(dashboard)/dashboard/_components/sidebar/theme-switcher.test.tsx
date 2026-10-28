import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

const setPreference = vi.fn();
let themeMode: "light" | "dark" | "system" = "light";

vi.mock("@/stores/preferences/preferences-provider", () => ({
  usePreferencesStore: (selector: (state: unknown) => unknown) =>
    selector({ values: { theme_mode: themeMode }, setPreference }),
}));

import { ThemeSwitcher } from "./theme-switcher";

const messages = {
  nav: {
    themeToggle: {
      cycleLabel: "Tema actual: {theme}. Haz clic para cambiar de tema.",
      modes: { light: "Claro", dark: "Oscuro", system: "Sistema" },
    },
  },
};

describe("ThemeSwitcher", () => {
  afterEach(() => {
    cleanup();
    setPreference.mockClear();
  });

  it("announces the current theme in the active locale", () => {
    themeMode = "dark";
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <ThemeSwitcher />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Tema actual: Oscuro. Haz clic para cambiar de tema." }),
    ).toBeInTheDocument();
  });

  it("cycles to the next theme on click", () => {
    themeMode = "light";
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <ThemeSwitcher />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(setPreference).toHaveBeenCalledWith("theme_mode", "dark");
  });
});
