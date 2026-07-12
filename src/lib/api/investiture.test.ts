import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiRequest = vi.fn();
const mockApiRequestFromClient = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  apiRequestFromClient: (...args: unknown[]) => mockApiRequestFromClient(...args),
}));

import {
  createInvestitureConfig,
  getInvestitureClassProgress,
  getInvestitureHistory,
  getInvestitureConfigs,
  getPendingInvestitures,
  updateInvestitureConfig,
} from "@/lib/api/investiture";

describe("investiture admin API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes backend config_id to investiture_config_id for table keys", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: [
        {
          config_id: 12,
          local_field_id: 3,
          ecclesiastical_year_id: 8,
          submission_deadline: "2026-08-01",
          investiture_date: "2026-09-15",
          active: true,
          modified_at: "2026-06-15T20:00:00.000Z",
          local_fields: { name: "Campo Local" },
          ecclesiastical_year: {
            year_id: 8,
            start_date: "2026-01-01",
            end_date: "2026-12-31",
          },
        },
      ],
    });

    await expect(getInvestitureConfigs()).resolves.toEqual([
      expect.objectContaining({
        investiture_config_id: 12,
        local_field_id: 3,
        ecclesiastical_year_id: 8,
        updated_at: "2026-06-15T20:00:00.000Z",
        ecclesiastical_years: expect.objectContaining({
          ecclesiastical_year_id: 8,
          name: "2026",
        }),
      }),
    ]);
  });

  it("normalizes created and updated config responses", async () => {
    mockApiRequestFromClient
      .mockResolvedValueOnce({
        status: "success",
        data: {
          config_id: 21,
          local_field_id: 4,
          ecclesiastical_year_id: 9,
          submission_deadline: "2027-08-01",
          investiture_date: "2027-09-15",
          active: true,
        },
      })
      .mockResolvedValueOnce({
        status: "success",
        data: {
          config_id: 21,
          local_field_id: 4,
          ecclesiastical_year_id: 9,
          submission_deadline: "2027-08-15",
          investiture_date: "2027-09-20",
          active: true,
        },
      });

    await expect(
      createInvestitureConfig({
        local_field_id: 4,
        ecclesiastical_year_id: 9,
        submission_deadline: "2027-08-01",
        investiture_date: "2027-09-15",
      }),
    ).resolves.toMatchObject({ investiture_config_id: 21 });

    await expect(
      updateInvestitureConfig(21, {
        submission_deadline: "2027-08-15",
        investiture_date: "2027-09-20",
      }),
    ).resolves.toMatchObject({
      investiture_config_id: 21,
      submission_deadline: "2027-08-15",
    });
  });

  it("normalizes pending investiture rows from the paginated backend envelope", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        data: [
          {
            enrollment_id: 5,
            user_id: "member-1",
            class_id: 12,
            ecclesiastical_year_id: 8,
            investiture_status: "SUBMITTED_FOR_VALIDATION",
            submitted_at: "2026-06-15T20:00:00.000Z",
            users: {
              user_id: "member-1",
              name: "María",
              paternal_last_name: "López",
              maternal_last_name: "Pérez",
              email: "maria@example.com",
              user_image: "https://example.com/member.png",
            },
            classes: { class_id: 12, name: "Guía" },
            club: { club_id: 3, name: "Central" },
            section: { section_id: 9, name: "Conquistadores" },
            ecclesiastical_year: {
              year_id: 8,
              start_date: "2026-01-01",
              end_date: "2026-12-31",
            },
            submitted_by: {
              user_id: "counselor-1",
              name: "Ana",
              paternal_last_name: "García",
              email: "ana@example.com",
              role_name: "counselor",
              role_label: "Consejera",
            },
          },
        ],
        meta: { total: 1, page: 1, limit: 100 },
      },
    });

    await expect(getPendingInvestitures({ page: 1, limit: 100 })).resolves.toEqual({
      data: [
        expect.objectContaining({
          enrollment_id: 5,
          user: expect.objectContaining({
            first_name: "María",
            last_name: "López Pérez",
          }),
          class: expect.objectContaining({ name: "Guía" }),
          club: expect.objectContaining({ name: "Central" }),
          section: expect.objectContaining({ name: "Conquistadores" }),
          ecclesiastical_year: expect.objectContaining({
            ecclesiastical_year_id: 8,
            name: "2026",
          }),
          submitted_by: expect.objectContaining({
            first_name: "Ana",
            last_name: "García",
            role_name: "counselor",
          }),
        }),
      ],
      total: 1,
      page: 1,
      limit: 100,
    });
  });

  it("normalizes wrapped investiture history responses", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        enrollment_id: 5,
        history: [
          {
            history_id: 44,
            enrollment_id: 5,
            action: "SUBMITTED",
            performed_by: {
              name: "Ana",
              paternal_last_name: "García",
            },
            comments: "Lista para validar",
            created_at: "2026-06-15T20:00:00.000Z",
          },
        ],
      },
    });

    await expect(getInvestitureHistory(5)).resolves.toEqual([
      expect.objectContaining({
        history_id: 44,
        action: "SUBMITTED",
        comments: "Lista para validar",
        performer: expect.objectContaining({
          first_name: "Ana",
          last_name: "García",
        }),
      }),
    ]);
  });

  it("normalizes class progress for investiture detail", async () => {
    mockApiRequest.mockResolvedValue({
      enrollment_id: 5,
      class_id: 12,
      class_name: "Guía",
      total_sections: 2,
      completed_sections: 2,
      overall_progress: 100,
      modules: [
        {
          module_id: 1,
          module_name: "Requisitos generales",
          total_sections: 2,
          completed_sections: 2,
          progress_percentage: 100,
          sections: [
            {
              section_id: 10,
              section_name: "Memorizar voto",
              completed: true,
              score: 100,
              status: "VALIDATED",
              validated_by_name: "Director Local",
              evidence_files: [
                {
                  id: "88",
                  file_id: 88,
                  file_name: "evidencia.pdf",
                  file_url: "https://example.com/evidencia.pdf",
                  uploaded_by_name: "Consejero",
                },
              ],
            },
          ],
        },
      ],
    });

    await expect(
      getInvestitureClassProgress({
        userId: "member-1",
        classId: 12,
        enrollmentId: 5,
      }),
    ).resolves.toMatchObject({
      enrollment_id: 5,
      overall_progress: 100,
      modules: [
        expect.objectContaining({
          module_name: "Requisitos generales",
          sections: [
            expect.objectContaining({
              section_name: "Memorizar voto",
              validated_by_name: "Director Local",
              evidence_files: [
                expect.objectContaining({
                  file_name: "evidencia.pdf",
                }),
              ],
            }),
          ],
        }),
      ],
    });
  });
});
