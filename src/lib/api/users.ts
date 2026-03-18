import { apiRequest } from "@/lib/api/client";

export async function getUserById(userId: string) {
  return apiRequest(`/users/${userId}`);
}
