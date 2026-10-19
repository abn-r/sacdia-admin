import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...original,
    apiRequest: vi.fn(),
    apiRequestFromClient: vi.fn(),
  };
});

import { apiRequest, apiRequestFromClient } from "@/lib/api/client";
import {
  getAdminGuardianshipConsentEvidenceFromClient,
  getAdminUserDetail,
} from "./admin-users";

const mockApiRequest = vi.mocked(apiRequest);
const mockClientRequest = vi.mocked(apiRequestFromClient);

const BASE = { user_id: "u-1", name: "Ana", email: null };

describe("admin user detail guardianships", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is null when the backend withholds the block (no permission) or omits it", async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { ...BASE, guardianships: null } });
    expect((await getAdminUserDetail("u-1")).guardianships).toBeNull();

    mockApiRequest.mockResolvedValueOnce({ data: { ...BASE } });
    expect((await getAdminUserDetail("u-1")).guardianships).toBeNull();
  });

  it("normalizes as_dependent (incl. custodian + revoked), as_guardian and dependent_profile", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        ...BASE,
        guardianships: {
          as_dependent: [
            {
              guardianship_id: "g-1",
              guardian: { user_id: "u-g", display_name: "María", email: null },
              custodian_club: null,
              external_name: null,
              relationship_type_name: "Madre",
              is_primary: true,
              is_custodian: false,
              consent_status: "revoked",
              verification_method: "director_paper_form",
              verified_at: "2026-10-05T00:00:00.000Z",
              verified_by: { user_id: "u-d", display_name: "Carlos" },
              evidence_uploaded: true,
              is_test_data: false,
              created_at: "2026-10-01T00:00:00.000Z",
              revoked_at: "2026-10-10T00:00:00.000Z",
              revoked_reason: "guardian_left",
            },
            {
              guardianship_id: "g-2",
              guardian: null,
              custodian_club: { club_id: 5, name: "Club Águilas" },
              external_name: null,
              relationship_type_name: null,
              is_primary: true,
              is_custodian: true,
              consent_status: "pending",
              verification_method: null,
              verified_at: null,
              verified_by: null,
              evidence_uploaded: false,
              is_test_data: true,
              created_at: "2026-10-11T00:00:00.000Z",
              revoked_at: null,
              revoked_reason: null,
            },
          ],
          as_guardian: [
            {
              guardianship_id: "g-3",
              dependent: { user_id: "d-1", display_name: "Ana", birthday: "2017-04-02" },
              relationship_type_name: "Madre",
              is_primary: true,
              consent_status: "verified",
            },
          ],
          dependent_profile: {
            created_at: "2026-10-01T00:00:00.000Z",
            created_by_user_id: "u-c",
            frozen_at: "2026-10-12T00:00:00.000Z",
            purge_after: "2027-01-10T00:00:00.000Z",
          },
        },
      },
    });

    const detail = await getAdminUserDetail("u-1");
    const gs = detail.guardianships!;

    expect(gs.as_dependent).toHaveLength(2);
    expect(gs.as_dependent[0]).toMatchObject({
      consent_status: "revoked",
      revoked_reason: "guardian_left",
      guardian: { display_name: "María", email: null },
      evidence_uploaded: true,
    });
    expect(gs.as_dependent[1]).toMatchObject({
      guardian: null,
      custodian_club: { club_id: 5, name: "Club Águilas" },
      is_custodian: true,
      is_test_data: true,
    });
    expect(gs.as_guardian[0].dependent.birthday).toBe("2017-04-02");
    expect(gs.dependent_profile).toMatchObject({
      frozen_at: "2026-10-12T00:00:00.000Z",
      purge_after: "2027-01-10T00:00:00.000Z",
    });
  });

  it("tolerates a user with a null email", async () => {
    mockApiRequest.mockResolvedValue({ data: { ...BASE, email: null } });
    expect((await getAdminUserDetail("u-1")).email).toBeNull();
  });

  it("evidence call hits the admin endpoint and unwraps the envelope", async () => {
    mockClientRequest.mockResolvedValue({
      status: "success",
      data: { url: "https://signed", expires_in: 900, content_type: "application/pdf", uploaded_at: "x" },
    });

    const evidence = await getAdminGuardianshipConsentEvidenceFromClient("u 1", "g/1");

    expect(mockClientRequest).toHaveBeenCalledWith(
      "/admin/users/u%201/guardianships/g%2F1/consent-evidence",
    );
    expect(evidence.url).toBe("https://signed");
  });
});
