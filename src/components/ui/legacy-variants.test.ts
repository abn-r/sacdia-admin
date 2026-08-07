import { describe, expect, it } from "vitest";
import { badgeVariants } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

describe("legacy status variants", () => {
  it("keeps the status styles used by operational routes", () => {
    expect(badgeVariants({ variant: "success" as never })).toContain("bg-success");
    expect(badgeVariants({ variant: "soft-success" as never })).toContain("bg-success/10");
    expect(badgeVariants({ variant: "soft-warning" as never })).toContain("bg-warning/15");
    expect(buttonVariants({ variant: "soft" as never })).toContain("bg-primary/10");
  });
});
