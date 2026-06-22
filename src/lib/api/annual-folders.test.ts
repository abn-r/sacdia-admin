import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiRequest = vi.fn();
const mockApiRequestFromClient = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  apiRequestFromClient: (...args: unknown[]) =>
    mockApiRequestFromClient(...args),
}));

import {
  createTemplateSection,
  createFolderForSection,
  getFolder,
  getFolderBySection,
  getFolderEvaluations,
  listTemplates,
  closeFolder,
  confirmUnionSection,
  submitFolder,
  submitSection,
} from "@/lib/api/annual-folders";

describe("annual folders admin API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unwraps folder evaluations from the backend success envelope", async () => {
    const evaluations = [
      {
        evaluation_id: "evaluation-1",
        section_id: "section-1",
        section_name: "Administración",
        section_order: 1,
        earned_points: 80,
        max_points: 100,
        notes: "Completa",
        evaluator: null,
        evaluated_at: "2026-06-18T18:00:00.000Z",
        status: "VALIDATED",
        lf_approver: null,
        lf_approved_at: null,
        union_approver: null,
        union_approved_at: null,
        union_decision: null,
      },
    ];

    mockApiRequestFromClient.mockResolvedValue({
      status: "success",
      data: evaluations,
    });

    await expect(getFolderEvaluations("folder-1")).resolves.toEqual(
      evaluations,
    );
    expect(mockApiRequestFromClient).toHaveBeenCalledWith(
      "/annual-folders/folder-1/evaluations",
    );
  });

  it("normalizes backend folder_template_id into template_id for template lists", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: [
        {
          folder_template_id: "tmpl-backend-1",
          name: "Carpeta anual",
          club_type_id: 2,
          ecclesiastical_year_id: 1,
          active: true,
          minimum_points: 70,
          closing_date: null,
          created_at: null,
          owner_union_id: 10,
          owner_local_field_id: null,
          sections: [
            {
              section_id: "section-1",
              folder_template_id: "tmpl-backend-1",
              name: "Administración",
              description: null,
              order: 1,
              required: true,
              active: true,
              max_points: 100,
              minimum_points: 0,
              created_at: null,
            },
          ],
        },
      ],
    });

    await expect(listTemplates()).resolves.toMatchObject([
      {
        template_id: "tmpl-backend-1",
        sections: [{ template_id: "tmpl-backend-1" }],
      },
    ]);
    expect(mockApiRequest).toHaveBeenCalledWith("/annual-folders/templates");
  });

  it("loads the current annual folder by club section without exposing UUID search", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        folder_id: "folder-backend-1",
        enrollment_id: "enrollment-backend-1",
        template_id: "template-backend-1",
        status: "open",
        submitted_at: null,
        closed_at: null,
        created_at: null,
        local_camporee_id: null,
        union_camporee_id: null,
        requires_union_confirmation: false,
        sections: [],
      },
    });

    await expect(getFolderBySection(33)).resolves.toMatchObject({
      annual_folder_id: "folder-backend-1",
      club_enrollment_id: "enrollment-backend-1",
      folder_template_id: "template-backend-1",
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/club-sections/33/annual-folder",
    );
  });

  it("normalizes section evidences from the backend folder response", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        annual_folder_id: "folder-1",
        club_enrollment_id: "enrollment-1",
        folder_template_id: "template-1",
        status: "open",
        submitted_at: null,
        closed_at: null,
        created_at: null,
        local_camporee_id: null,
        union_camporee_id: null,
        requires_union_confirmation: false,
        sections: [
          {
            section_id: "section-1",
            name: "Administración",
            description: null,
            order: 1,
            required: true,
            evidences: [
              {
                evidence_id: "evidence-1",
                folder_id: "folder-1",
                section_id: "section-1",
                file_url: "https://files.test/evidence.pdf",
                file_name: "Evidencia 1.pdf",
                description: null,
                created_at: "2026-06-22T18:00:00.000Z",
                uploaded_by: "Directora Club",
              },
            ],
          },
        ],
      },
    });

    await expect(getFolder("folder-1")).resolves.toMatchObject({
      sections: [
        {
          section_id: "section-1",
          evidences: [
            {
              annual_folder_id: "folder-1",
              uploaded_at: "2026-06-22T18:00:00.000Z",
            },
          ],
        },
      ],
    });
  });

  it("returns null when the active club section has no annual folder yet", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: null });

    await expect(getFolderBySection(33)).resolves.toBeNull();
  });

  it("creates an annual folder by club section without requiring enrollment UUID input", async () => {
    mockApiRequestFromClient.mockResolvedValue({
      status: "success",
      data: {
        folder_id: "folder-backend-1",
        enrollment_id: "enrollment-backend-1",
        template_id: "template-backend-1",
        status: "open",
        submitted_at: null,
        closed_at: null,
        created_at: null,
        local_camporee_id: null,
        union_camporee_id: null,
        requires_union_confirmation: false,
        sections: [],
      },
    });

    await expect(createFolderForSection(33)).resolves.toMatchObject({
      annual_folder_id: "folder-backend-1",
      club_enrollment_id: "enrollment-backend-1",
      folder_template_id: "template-backend-1",
    });
    expect(mockApiRequestFromClient).toHaveBeenCalledWith(
      "/club-sections/33/annual-folder",
      { method: "POST" },
    );
  });

  it("submits a section before complete folder submission", async () => {
    mockApiRequestFromClient.mockResolvedValue({
      status: "success",
      data: {
        section_submission_id: "submission-1",
        section_id: "section-1",
        folder_id: "folder-1",
        submitted_at: "2026-06-22T00:00:00.000Z",
        submitted_by: "user-1",
      },
    });

    await expect(submitSection("folder-1", "section-1")).resolves.toMatchObject({
      annual_folder_id: "folder-1",
      section_id: "section-1",
    });
    expect(mockApiRequestFromClient).toHaveBeenCalledWith(
      "/annual-folders/folder-1/sections/section-1/submit",
      { method: "POST" },
    );
  });

  it("confirms a preapproved section at union level", async () => {
    mockApiRequestFromClient.mockResolvedValue({
      status: "success",
      data: { union_decision: "APPROVED" },
    });

    await expect(
      confirmUnionSection("folder-1", "section-1", {
        decision: "APPROVED",
        notes: "Validado por Unión",
      }),
    ).resolves.toEqual({
      status: "success",
      data: { union_decision: "APPROVED" },
    });
    expect(mockApiRequestFromClient).toHaveBeenCalledWith(
      "/annual-folders/folder-1/sections/section-1/confirm-union",
      {
        method: "POST",
        body: { decision: "APPROVED", notes: "Validado por Unión" },
      },
    );
  });

  it("unwraps and normalizes complete folder submit responses", async () => {
    mockApiRequestFromClient.mockResolvedValue({
      status: "success",
      data: {
        folder_id: "folder-1",
        enrollment_id: "enrollment-1",
        template_id: "template-1",
        status: "submitted",
        submitted_at: "2026-06-22T00:00:00.000Z",
        closed_at: null,
        created_at: null,
        local_camporee_id: null,
        union_camporee_id: null,
        requires_union_confirmation: false,
        sections: [],
      },
    });

    await expect(submitFolder("folder-1")).resolves.toMatchObject({
      annual_folder_id: "folder-1",
      status: "submitted",
    });
  });

  it("unwraps and normalizes close folder responses", async () => {
    mockApiRequestFromClient.mockResolvedValue({
      status: "success",
      data: {
        folder_id: "folder-1",
        enrollment_id: "enrollment-1",
        template_id: "template-1",
        status: "closed",
        submitted_at: "2026-06-22T00:00:00.000Z",
        closed_at: "2026-06-23T00:00:00.000Z",
        created_at: null,
        local_camporee_id: null,
        union_camporee_id: null,
        requires_union_confirmation: false,
        sections: [],
      },
    });

    await expect(closeFolder("folder-1")).resolves.toMatchObject({
      annual_folder_id: "folder-1",
      status: "closed",
    });
  });

  it("unwraps and normalizes template section mutations", async () => {
    mockApiRequestFromClient.mockResolvedValue({
      status: "success",
      data: {
        section_id: "section-2",
        folder_template_id: "tmpl-backend-2",
        name: "Operaciones",
        description: null,
        order: 2,
        required: true,
        active: true,
        max_points: 50,
        minimum_points: 0,
        created_at: null,
      },
    });

    await expect(
      createTemplateSection("tmpl-backend-2", {
        name: "Operaciones",
        order: 2,
        required: true,
        max_points: 50,
      }),
    ).resolves.toMatchObject({
      section_id: "section-2",
      template_id: "tmpl-backend-2",
    });
  });
});
