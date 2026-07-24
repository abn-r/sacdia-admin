import { getUserById } from "@/lib/api/users";

export type NotificationTargetUser = {
  user_id: string;
  name: string | null;
  paternal_last_name: string | null;
  email: string;
};

type UserLookupResponse = {
  data?: NotificationTargetUser;
};

export function formatNotificationTargetUser(
  user: NotificationTargetUser | null | undefined,
  fallbackId: string,
): { primary: string; secondary?: string } {
  if (!user) {
    return { primary: fallbackId };
  }

  const parts = [user.name, user.paternal_last_name].filter(Boolean);
  if (parts.length > 0) {
    return {
      primary: parts.join(" "),
      secondary: user.email,
    };
  }

  return { primary: user.email };
}

export async function resolveNotificationTargetUsers(
  userIds: string[],
): Promise<Map<string, NotificationTargetUser>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const results = await Promise.all(
    uniqueIds.map(async (userId) => {
      try {
        const response = (await getUserById(userId)) as UserLookupResponse;
        if (!response.data) return null;
        return [userId, response.data] as const;
      } catch {
        return null;
      }
    }),
  );

  return new Map(
    results.filter(
      (entry): entry is readonly [string, NotificationTargetUser] => entry !== null,
    ),
  );
}
