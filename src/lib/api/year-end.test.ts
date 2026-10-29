import { describe, expect, it } from "vitest";
import { normalizeYearEndCloseResult, normalizeYearEndPreview } from "@/lib/api/year-end";

describe("year-end normalizers", () => {
  it("reads the backend preview (camelCase, inside data)", () => {
    const preview = normalizeYearEndPreview(
      {
        status: "success",
        data: {
          yearId: 1,
          yearActive: true,
          enrollmentsToClose: 2,
          foldersToClose: 2,
          reportsToGenerate: 0,
          enrollmentDetails: [
            { club_enrollment_id: "e1", clubName: "ACV", clubType: "Conquistadores", currentStatus: "active" },
          ],
        },
      },
      1,
    );

    expect(preview).toMatchObject({
      yearActive: true,
      enrollmentsToClose: 2,
      foldersToClose: 2,
      reportsToGenerate: 0,
    });
    expect(preview.enrollmentDetails[0]?.clubName).toBe("ACV");
  });

  it("reads the backend close summary", () => {
    expect(
      normalizeYearEndCloseResult(
        { data: { yearId: 1, enrollmentsClosed: 2, foldersClosed: 2, reportsGenerated: 1, investiturePendingClosed: 3 } },
        1,
      ),
    ).toEqual({ yearId: 1, enrollmentsClosed: 2, foldersClosed: 2, reportsGenerated: 1, investiturePendingClosed: 3 });
  });
});
