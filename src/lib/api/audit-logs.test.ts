import { describe, expect, it } from "vitest";

import { buildAdminAuditLogsPath, formatAuditActorName } from "./audit-logs";

describe("buildAdminAuditLogsPath", () => {
  it("omits empty filters", () => {
    expect(buildAdminAuditLogsPath({})).toBe("/admin/audit-logs");
  });

  it("serializes the agreed query contract", () => {
    expect(
      buildAdminAuditLogsPath({
        entity_type: "clubs",
        action: "UPDATED",
        result: "succeeded",
        source: "http",
        club_id: 12,
        from: "2026-01-01",
        to: "2026-08-01",
        limit: 50,
        cursor: "99",
      }),
    ).toBe(
      "/admin/audit-logs?entity_type=clubs&action=UPDATED&result=succeeded&source=http&club_id=12&from=2026-01-01&to=2026-08-01&limit=50&cursor=99",
    );
  });
});

describe("formatAuditActorName", () => {
  it("joins name and paternal last name", () => {
    expect(
      formatAuditActorName({
        user_id: "u1",
        name: "Ana",
        paternal_last_name: "Ruiz",
      }),
    ).toBe("Ana Ruiz");
  });

  it("returns null without a name", () => {
    expect(
      formatAuditActorName({
        user_id: "u1",
        name: null,
        paternal_last_name: null,
      }),
    ).toBeNull();
  });
});
