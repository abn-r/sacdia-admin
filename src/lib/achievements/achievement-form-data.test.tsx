import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";

// Radix Select uses ResizeObserver (not provided by jsdom).
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockGetAchievementById = vi.fn();
const mockListAchievementsAdmin = vi.fn();
const mockListCategoriesAdmin = vi.fn();

vi.mock("next/navigation", async () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/configuration/achievements/3/29/edit",
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@/lib/api/achievements", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/achievements")>();
  return {
    ...actual,
    getAchievementById: (...args: unknown[]) => mockGetAchievementById(...args),
    listAchievementsAdmin: (...args: unknown[]) => mockListAchievementsAdmin(...args),
    listAchievementCategoriesAdmin: (...args: unknown[]) => mockListCategoriesAdmin(...args),
  };
});

import { loadEditAchievementFormData } from "./achievement-form-data";
import { AchievementForm } from "@/app/(dashboard)/dashboard/configuration/achievements/_components/achievement-form";

const ACHIEVEMENT = {
  achievement_id: 29,
  name: "Maestro de campamento",
  description: "Completa diez campamentos",
  type: "THRESHOLD",
  scope: "GLOBAL",
  tier: "GOLD",
  points: 50,
  criteria: { event: "camp.completed", operator: "gte", target: 10 },
  secret: false,
  repeatable: false,
  max_repeats: null,
  active: true,
  category: { achievement_category_id: 3, name: "Campamentos" },
  badge_image_url: null,
};

describe("loadEditAchievementFormData", () => {
  beforeEach(() => {
    mockListCategoriesAdmin.mockResolvedValue({
      status: "success",
      data: [{ achievement_category_id: 3, name: "Campamentos" }],
    });
    mockListAchievementsAdmin.mockResolvedValue({
      status: "success",
      data: [ACHIEVEMENT],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("unwraps the { status, data } envelope so the achievement is flat", async () => {
    mockGetAchievementById.mockResolvedValue({ status: "success", data: ACHIEVEMENT });

    const result = await loadEditAchievementFormData("3", "29");

    expect(result.achievement?.name).toBe("Maestro de campamento");
    expect(result.achievement?.description).toBe("Completa diez campamentos");
    expect(result.achievementName).toBe("Maestro de campamento");
  });

  it("still accepts an already-flat record", async () => {
    mockGetAchievementById.mockResolvedValue(ACHIEVEMENT);

    const result = await loadEditAchievementFormData("3", "29");

    expect(result.achievement?.name).toBe("Maestro de campamento");
  });

  it("prefills Nombre and Descripción in the edit form", async () => {
    mockGetAchievementById.mockResolvedValue({ status: "success", data: ACHIEVEMENT });
    const data = await loadEditAchievementFormData("3", "29");

    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <AchievementForm
          mode="edit"
          achievement={data.achievement}
          achievementId={data.achievementId}
          categoryId={data.categoryId}
          categories={data.categories}
          allAchievements={data.allAchievements}
          formAction={async () => ({})}
          actionState={{}}
        />
      </NextIntlClientProvider>,
    );

    expect(document.getElementById("ach-name")).toHaveValue("Maestro de campamento");
    expect(document.getElementById("ach-description")).toHaveValue(
      "Completa diez campamentos",
    );
  });
});
