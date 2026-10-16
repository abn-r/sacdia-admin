export const ACCESS_TOKEN_COOKIE = "sacdia_admin_access_token";
export const REFRESH_TOKEN_COOKIE = "sacdia_admin_refresh_token";

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 8 * 60 * 60;
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const AUTH_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
};

// Short-lived marker set when a refresh attempt failed for a transient reason
// (network, 429, 5xx). It stops the login layout from bouncing straight back to
// /api/auth/refresh, which would otherwise loop while the backend is down.
export const REFRESH_FAILED_COOKIE = "sacdia_admin_refresh_failed";
export const REFRESH_FAILED_MAX_AGE_SECONDS = 60;
