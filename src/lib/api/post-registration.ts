import { apiRequest } from "@/lib/api/client";

// ─── Response types from backend ───────────────────────────────────────────

export type PostRegistrationSteps = {
  profilePicture: boolean;
  personalInfo: boolean;
  clubSelection: boolean;
};

/**
 * How the backend onboards the account. Absent (old backend) or unknown →
 * `club`. Clients read it; they never infer it from roles or clubs.
 */
export type OnboardingMode = "club" | "club_exempt" | "panel_only";

export function resolveOnboardingMode(
  status: Pick<PostRegistrationStatus, "onboarding_mode">,
): OnboardingMode {
  const mode = status.onboarding_mode;
  return mode === "club_exempt" || mode === "panel_only" ? mode : "club";
}

export type PostRegistrationStatus = {
  complete: boolean;
  onboarding_mode?: OnboardingMode;
  steps: PostRegistrationSteps;
  nextStep: "profilePicture" | "personalInfo" | "clubSelection" | null;
  dateCompleted: string | null;
};

export type PostRegistrationStatusResponse = {
  status: string;
  data: PostRegistrationStatus;
};

export type PhotoStatusResponse = {
  has_photo: boolean;
};

export type PostRegistrationCompleteResponse = {
  status: string;
  message: string;
};

// ─── API client functions (server-side only, used in Server Components) ────

export async function getPostRegistrationStatus(
  userId: string,
): Promise<PostRegistrationStatus> {
  const payload = await apiRequest<PostRegistrationStatusResponse>(
    `/users/${encodeURIComponent(userId)}/post-registration/status`,
  );
  return payload.data;
}

export async function getPostRegistrationPhotoStatus(
  userId: string,
): Promise<PhotoStatusResponse> {
  return apiRequest<PhotoStatusResponse>(
    `/users/${encodeURIComponent(userId)}/post-registration/photo-status`,
  );
}
