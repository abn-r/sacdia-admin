/**
 * Tests for UserGuardianshipsCard + hasGuardianshipsContent.
 *
 * Covers: as_dependent history (verified, pending, revoked with reason),
 * custodian rows (club shown, no guardian), external guardian, test-data badge,
 * null guardian email rendered as an em dash, evidence access through the admin
 * endpoint (signed URL link; error codes mapped), as_guardian list, dependent
 * profile frozen/purge dates, and the "hidden when null" rule.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/es.json";
import type {
  AdminGuardianshipAsDependent,
  AdminGuardianships,
} from "@/lib/api/admin-users";

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockEvidence = vi.fn<(...args: any[]) => Promise<unknown>>();
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.mock("@/lib/api/admin-users", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/admin-users")>();
  return {
    ...original,
    getAdminGuardianshipConsentEvidenceFromClient: (...args: unknown[]) =>
      mockEvidence(...args),
  };
});

import { UserGuardianshipsCard } from "@/components/users/user-guardianships-card";
import { hasGuardianshipsContent } from "@/lib/admin-users/guardianships";
import { ApiError } from "@/lib/api/client";

const g = messages.guardianships;

function row(overrides: Partial<AdminGuardianshipAsDependent> = {}): AdminGuardianshipAsDependent {
  return {
    guardianship_id: "g-1",
    guardian: { user_id: "u-g", display_name: "María Pérez", email: "maria@example.com" },
    custodian_club: null,
    external_name: null,
    relationship_type_name: "Madre",
    is_primary: true,
    is_custodian: false,
    consent_status: "verified",
    verification_method: "director_paper_form",
    verified_at: "2026-10-05T15:00:00.000Z",
    verified_by: { user_id: "u-d", display_name: "Carlos Director" },
    evidence_uploaded: true,
    is_test_data: false,
    created_at: "2026-10-01T10:00:00.000Z",
    revoked_at: null,
    revoked_reason: null,
    ...overrides,
  };
}

function block(overrides: Partial<AdminGuardianships> = {}): AdminGuardianships {
  return {
    as_dependent: [],
    as_guardian: [],
    dependent_profile: null,
    ...overrides,
  };
}

function renderCard(guardianships: AdminGuardianships) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <UserGuardianshipsCard userId="u-dep" guardianships={guardianships} />
    </NextIntlClientProvider>,
  );
}

describe("hasGuardianshipsContent", () => {
  it("is false for null/undefined (no permission) and for an empty block", () => {
    expect(hasGuardianshipsContent(null)).toBe(false);
    expect(hasGuardianshipsContent(undefined)).toBe(false);
    expect(hasGuardianshipsContent(block())).toBe(false);
  });

  it("is true with rows or a dependent profile", () => {
    expect(hasGuardianshipsContent(block({ as_dependent: [row()] }))).toBe(true);
    expect(
      hasGuardianshipsContent(
        block({
          dependent_profile: {
            created_at: "x",
            created_by_user_id: "u",
            frozen_at: null,
            purge_after: null,
          },
        }),
      ),
    ).toBe(true);
  });
});

describe("UserGuardianshipsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it("lists as_dependent history: verified guardian with method, verifier and badges", () => {
    renderCard(block({ as_dependent: [row()] }));

    const item = screen.getByTestId("guardianship-as-dependent");
    expect(within(item).getByText("María Pérez")).toBeInTheDocument();
    expect(within(item).getByText(g.badges.primary)).toBeInTheDocument();
    expect(within(item).getByText(g.status.verified)).toBeInTheDocument();
    expect(within(item).getByText(g.method.director_paper_form)).toBeInTheDocument();
    expect(within(item).getByText("Carlos Director")).toBeInTheDocument();
    expect(within(item).getByText("maria@example.com")).toBeInTheDocument();
    expect(within(item).getByText("Madre")).toBeInTheDocument();
  });

  it("shows revoked rows with the translated reason", () => {
    renderCard(
      block({
        as_dependent: [
          row({
            guardianship_id: "g-old",
            consent_status: "revoked",
            revoked_at: "2026-10-10T09:00:00.000Z",
            revoked_reason: "guardian_left",
            evidence_uploaded: false,
          }),
          row({ guardianship_id: "g-new", guardian: { user_id: "u2", display_name: "Pedro Pérez", email: null }, is_primary: false, consent_status: "pending" }),
        ],
      }),
    );

    const items = screen.getAllByTestId("guardianship-as-dependent");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText(g.status.revoked)).toBeInTheDocument();
    expect(within(items[0]).getByText(g.revokedReason.guardian_left)).toBeInTheDocument();
    expect(within(items[0]).getByText(g.evidence.missing)).toBeInTheDocument();
    expect(within(items[1]).getByText(g.status.pending)).toBeInTheDocument();
  });

  it("renders a null guardian email as an em dash", () => {
    renderCard(
      block({
        as_dependent: [
          row({ guardian: { user_id: "u2", display_name: "Pedro Pérez", email: null } }),
        ],
      }),
    );
    const item = screen.getByTestId("guardianship-as-dependent");
    const emailField = within(item).getByText(g.fields.email).parentElement as HTMLElement;
    expect(within(emailField).getByText("—")).toBeInTheDocument();
  });

  it("custodian row shows the club (no guardian) and a custody badge", () => {
    renderCard(
      block({
        as_dependent: [
          row({
            guardian: null,
            custodian_club: { club_id: 5, name: "Club Águilas" },
            is_custodian: true,
            relationship_type_name: null,
            consent_status: "pending",
            verification_method: null,
            verified_at: null,
            verified_by: null,
            evidence_uploaded: false,
          }),
        ],
      }),
    );
    const item = screen.getByTestId("guardianship-as-dependent");
    expect(within(item).getAllByText("Club Águilas").length).toBeGreaterThan(0);
    expect(within(item).getByText(g.badges.custodian)).toBeInTheDocument();
    expect(within(item).getByText(g.fields.custodianClub)).toBeInTheDocument();
  });

  it("external guardian shows the typed name and the test-data badge", () => {
    renderCard(
      block({
        as_dependent: [
          row({
            guardian: null,
            external_name: "Tía Rosa",
            is_test_data: true,
            evidence_uploaded: false,
          }),
        ],
      }),
    );
    const item = screen.getByTestId("guardianship-as-dependent");
    expect(within(item).getAllByText("Tía Rosa").length).toBeGreaterThan(0);
    expect(within(item).getByText(g.badges.testData)).toBeInTheDocument();
  });

  it("evidence: fetches the signed URL from the admin endpoint and exposes it as an external link", async () => {
    mockEvidence.mockResolvedValue({
      url: "https://r2.example/signed?sig=1",
      expires_in: 900,
      content_type: "application/pdf",
      uploaded_at: "2026-10-02T00:00:00.000Z",
    });
    const user = userEvent.setup();
    renderCard(block({ as_dependent: [row()] }));

    expect(screen.queryByRole("link", { name: g.evidence.open })).toBeNull();
    await user.click(screen.getByRole("button", { name: g.evidence.view }));

    const link = await screen.findByRole("link", { name: g.evidence.open });
    expect(mockEvidence).toHaveBeenCalledWith("u-dep", "g-1");
    expect(link).toHaveAttribute("href", "https://r2.example/signed?sig=1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it.each([
    ["GUARDIANSHIP_EVIDENCE_NOT_FOUND", 404, g.evidence.notFound],
    ["GUARDIANSHIP_EVIDENCE_UNAVAILABLE", 503, g.evidence.unavailable],
    [null, 403, g.evidence.denied],
    [null, 500, g.evidence.error],
  ])("evidence error code %s / status %s is mapped to a translated message", async (code, status, expected) => {
    mockEvidence.mockRejectedValue(
      new ApiError("server text", status, code ? { code, details: { x: 1 } } : null),
    );
    const user = userEvent.setup();
    renderCard(block({ as_dependent: [row()] }));

    await user.click(screen.getByRole("button", { name: g.evidence.view }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(expected));
  });

  describe("signed URL expiry (S5)", () => {
    const evidenceFor = (sig: string, expires_in = 900) => ({
      url: `https://r2.example/signed?sig=${sig}`,
      expires_in,
      content_type: "application/pdf",
      uploaded_at: "2026-10-02T00:00:00.000Z",
    });

    afterEach(() => vi.restoreAllMocks());

    it("a fresh link opens normally without refetching", async () => {
      mockEvidence.mockResolvedValue(evidenceFor("1"));
      const open = vi.spyOn(window, "open").mockReturnValue(null);
      const user = userEvent.setup();
      renderCard(block({ as_dependent: [row()] }));

      await user.click(screen.getByRole("button", { name: g.evidence.view }));
      const link = await screen.findByRole("link", { name: g.evidence.open });
      link.addEventListener("click", (event) => event.preventDefault());
      await user.click(link);

      expect(mockEvidence).toHaveBeenCalledTimes(1);
      expect(open).not.toHaveBeenCalled();
    });

    it("a stale link (past its TTL) is refetched before opening and the fresh URL is opened", async () => {
      mockEvidence
        .mockResolvedValueOnce(evidenceFor("old"))
        .mockResolvedValue(evidenceFor("new"));
      const open = vi.spyOn(window, "open").mockReturnValue(null);
      const user = userEvent.setup();
      renderCard(block({ as_dependent: [row()] }));

      await user.click(screen.getByRole("button", { name: g.evidence.view }));
      const link = await screen.findByRole("link", { name: g.evidence.open });
      expect(link).toHaveAttribute("href", "https://r2.example/signed?sig=old");

      // 15 min later the old URL is about to be / already expired.
      const realNow = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(realNow + 14.5 * 60 * 1000);
      await user.click(link);

      await waitFor(() => expect(mockEvidence).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(open).toHaveBeenCalledWith(
          "https://r2.example/signed?sig=new",
          "_blank",
          "noopener,noreferrer",
        ),
      );
      expect(
        await screen.findByRole("link", { name: g.evidence.open }),
      ).toHaveAttribute("href", "https://r2.example/signed?sig=new");
    });

    it("if the refresh of a stale link fails, shows the mapped error instead of opening a dead URL", async () => {
      mockEvidence
        .mockResolvedValueOnce(evidenceFor("old"))
        .mockRejectedValue(new ApiError("x", 503, { code: "GUARDIANSHIP_EVIDENCE_UNAVAILABLE" }));
      const open = vi.spyOn(window, "open").mockReturnValue(null);
      const user = userEvent.setup();
      renderCard(block({ as_dependent: [row()] }));

      await user.click(screen.getByRole("button", { name: g.evidence.view }));
      const link = await screen.findByRole("link", { name: g.evidence.open });
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 20 * 60 * 1000);
      await user.click(link);

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(g.evidence.unavailable),
      );
      expect(open).not.toHaveBeenCalled();
    });
  });

  it("lists as_guardian dependents with name, birthday and status", () => {
    renderCard(
      block({
        as_guardian: [
          {
            guardianship_id: "g-9",
            dependent: { user_id: "d-1", display_name: "Ana Pérez", birthday: "2017-04-02" },
            relationship_type_name: "Madre",
            is_primary: true,
            consent_status: "pending",
          },
        ],
      }),
    );
    const item = screen.getByTestId("guardianship-as-guardian");
    expect(within(item).getByText("Ana Pérez")).toBeInTheDocument();
    expect(within(item).getByText(g.status.pending)).toBeInTheDocument();
    expect(screen.getByText(g.asGuardian.title)).toBeInTheDocument();
    expect(screen.queryByText(g.asDependent.title)).toBeNull();
  });

  it("dependent profile: frozen and purge dates; empty as_dependent explained", () => {
    renderCard(
      block({
        dependent_profile: {
          created_at: "2026-10-01T10:00:00.000Z",
          created_by_user_id: "creator-uuid",
          frozen_at: "2026-10-12T10:00:00.000Z",
          purge_after: "2027-01-10T10:00:00.000Z",
        },
      }),
    );
    const profile = screen.getByTestId("guardianship-dependent-profile");
    expect(within(profile).getByText("creator-uuid")).toBeInTheDocument();
    expect(within(profile).getByText(g.profile.frozenAt)).toBeInTheDocument();
    expect(within(profile).queryByText(g.profile.active)).toBeNull();
    expect(within(profile).getByText(/2027/)).toBeInTheDocument();
    expect(screen.getByText(g.asDependent.empty)).toBeInTheDocument();
  });

  it("an active (not frozen) profile shows the active label and no purge date", () => {
    renderCard(
      block({
        dependent_profile: {
          created_at: "2026-10-01T10:00:00.000Z",
          created_by_user_id: "creator-uuid",
          frozen_at: null,
          purge_after: null,
        },
      }),
    );
    const profile = screen.getByTestId("guardianship-dependent-profile");
    expect(within(profile).getByText(g.profile.active)).toBeInTheDocument();
  });
});
