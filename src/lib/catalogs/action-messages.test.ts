import { describe, expect, it, vi } from "vitest";
import { createTranslator } from "next-intl";
import messages from "../../../messages/en.json";
import { catalogActionText, catalogValidationText } from "@/lib/catalogs/action-messages";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    createTranslator({ locale: "en", messages, namespace: namespace as "catalogs" }),
}));

describe("catalog action messages", () => {
  it("translates a required field code", async () => {
    expect(await catalogValidationText("select:local_field")).toBe(
      `${messages.catalogs.validation.field_select.replace("{field}", messages.catalogs.fields.local_field)}`,
    );
  });

  it("translates a minimum code", async () => {
    expect(await catalogValidationText("min:ideal_order:1")).toBe(
      messages.catalogs.validation.field_min
        .replace("{field}", messages.catalogs.fields.ideal_order)
        .replace("{min}", "1"),
    );
  });

  it("falls back to the generic invalid form message", async () => {
    expect(await catalogValidationText("Invalid input")).toBe(messages.catalogs.actionErrors.invalidForm);
  });

  it("names the catalog in permission errors", async () => {
    expect(await catalogActionText("districts", "noPermissionCreate")).toBe(
      "You don't have permission to create districts.",
    );
  });
});
