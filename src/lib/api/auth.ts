import { apiRequest } from "@/lib/api/client";

export type OAuthProviders = {
  google_connected?: boolean;
  apple_connected?: boolean;
  [key: string]: unknown;
};

export async function listOauthProviders() {
  return apiRequest("/auth/oauth/providers");
}

export async function disconnectOauthProvider(provider: "google" | "apple") {
  return apiRequest(`/auth/oauth/${provider}`, {
    method: "DELETE",
  });
}

export async function requestPasswordReset(email: string) {
  return apiRequest("/auth/password/reset-request", {
    method: "POST",
    body: { email },
  });
}
