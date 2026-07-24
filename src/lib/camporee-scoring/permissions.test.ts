import { describe, expect, it } from "vitest";
import { canManageCamporeeJudgeAssignments } from "@/lib/camporee-scoring/permissions";
import type { AuthUser } from "@/lib/auth/types";

function userWithRoles(roles: string[], permissions: string[] = []): AuthUser {
  return {
    id: "u1",
    roles,
    authorization: {
      grants: {
        global_roles: roles.map((role_name) => ({ role_name })),
      },
      permissions: permissions.map((key) => ({ key })),
    },
  } as AuthUser;
}

describe("canManageCamporeeJudgeAssignments", () => {
  it("allows admin and super-admin for any camporee type", () => {
    expect(
      canManageCamporeeJudgeAssignments(userWithRoles(["admin"]), { isUnion: false }),
    ).toBe(true);
    expect(
      canManageCamporeeJudgeAssignments(userWithRoles(["super-admin"]), {
        isUnion: true,
      }),
    ).toBe(true);
  });

  it("allows LF managers only on local camporees", () => {
    expect(
      canManageCamporeeJudgeAssignments(userWithRoles(["director-lf"]), {
        isUnion: false,
      }),
    ).toBe(true);
    expect(
      canManageCamporeeJudgeAssignments(userWithRoles(["assistant-lf"]), {
        isUnion: false,
      }),
    ).toBe(true);
    expect(
      canManageCamporeeJudgeAssignments(userWithRoles(["director-lf"]), {
        isUnion: true,
      }),
    ).toBe(false);
  });

  it("allows union managers only on union camporees", () => {
    expect(
      canManageCamporeeJudgeAssignments(userWithRoles(["director-union"]), {
        isUnion: true,
      }),
    ).toBe(true);
    expect(
      canManageCamporeeJudgeAssignments(userWithRoles(["assistant-union"]), {
        isUnion: true,
      }),
    ).toBe(true);
    expect(
      canManageCamporeeJudgeAssignments(userWithRoles(["director-union"]), {
        isUnion: false,
      }),
    ).toBe(false);
  });
});
