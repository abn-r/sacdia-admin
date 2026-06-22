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
