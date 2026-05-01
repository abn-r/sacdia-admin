import { apiRequest } from "@/lib/api/client";

// ─── Response types from backend ───────────────────────────────────────────

export type PostRegistrationSteps = {
  profilePicture: boolean;
  personalInfo: boolean;
  clubSelection: boolean;
};

export type PostRegistrationStatus = {
  complete: boolean;
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
