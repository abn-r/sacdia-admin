import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const updateMock = vi.fn();
vi.mock("@/lib/notifications/category-settings-actions", () => ({
  updateNotificationCategorySettingAction: (...args: unknown[]) => updateMock(...args),
}));

import { NotificationCategoriesTable } from "./notification-categories-table";
import { buildDefaultCategorySettings } from "@/lib/notifications/categories";

const k = messages.people.community.notifications.categories;

function renderTable(props: React.ComponentProps<typeof NotificationCategoriesTable>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <NotificationCategoriesTable {...props} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  updateMock.mockReset();
});

describe("NotificationCategoriesTable", () => {
  it("shows the Spanish name of each category, not its English id", () => {
    renderTable({ categories: buildDefaultCategorySettings(), canEdit: true });

    expect(screen.getByText("Investiduras")).toBeInTheDocument();
    expect(screen.getByText("Validaciones")).toBeInTheDocument();
    expect(screen.queryByText("investiture")).toBeNull();
    expect(screen.queryByText("validation")).toBeNull();
  });

  it("shows the error and no switches when the categories could not load", () => {
    renderTable({ categories: null, failure: { kind: "error" }, canEdit: true });

    expect(screen.getByRole("alert")).toHaveTextContent(k.loadErrorTitle);
    expect(screen.getByText(k.loadErrorDescription)).toBeInTheDocument();
    expect(screen.queryAllByRole("switch")).toHaveLength(0);
  });

  it("is read-only without the update capability", async () => {
    renderTable({ categories: buildDefaultCategorySettings(), canEdit: false });

    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThan(0);
    for (const toggle of switches) expect(toggle).toBeDisabled();
    await userEvent.click(switches[0]!);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("saves a toggle and rolls back when the server refuses", async () => {
    updateMock.mockResolvedValue({ error: "No se pudo" });
    renderTable({ categories: buildDefaultCategorySettings(), canEdit: true });

    const first = screen.getAllByRole("switch")[0]!;
    const before = first.getAttribute("aria-checked");
    await userEvent.click(first);

    expect(updateMock).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(first.getAttribute("aria-checked")).toBe(before));
  });
});
