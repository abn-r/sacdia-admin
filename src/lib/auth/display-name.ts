import type { AuthUser } from "@/lib/auth/types";

export function getAuthUserDisplayName(user: AuthUser): string {
  const parts = [user.name, user.paternal_last_name, user.maternal_last_name]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return user.email;
}

export function getAuthUserAvatar(user: AuthUser): string {
  const candidates = [
    user.picture_url,
    user.user_image,
    user.avatar_url,
    user.photo_url,
    user.profile_picture,
    user.profile_picture_url,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}
