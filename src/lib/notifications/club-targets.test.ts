import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  apiRequest: apiRequestMock,
}));

import { listAuthorizedNotificationClubTargets } from "./club-targets";

describe("listAuthorizedNotificationClubTargets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normaliza clubes/secciones autorizadas a targets de notifications", async () => {
    apiRequestMock.mockResolvedValueOnce({
      data: [
        {
          clubId: 12,
          clubName: "Club Norte",
          instanceId: 101,
          instanceType: "adventurers",
          label: "Club Norte · Guías Menores",
          sectionId: 101,
          sectionName: "Guías Menores",
        },
        {
          clubId: 12,
          clubName: "Club Norte",
          instanceId: 102,
          instanceType: "pathfinders",
          label: "Club Norte · Tizones",
          sectionId: 102,
          sectionName: "Tizones",
        },
        {
          clubId: 8,
          clubName: "Club Sur",
          instanceId: 88,
          instanceType: "master_guilds",
          label: "Club Sur · Líderes",
          sectionId: 88,
          sectionName: "Líderes",
        },
      ],
    });

    const targets = await listAuthorizedNotificationClubTargets();

    expect(apiRequestMock).toHaveBeenCalledOnce();
    expect(apiRequestMock).toHaveBeenCalledWith("/notifications/targets/club");
    expect(targets).toEqual([
      {
        clubId: 12,
        clubName: "Club Norte",
        instanceId: 101,
        instanceType: "adventurers",
        label: "Club Norte · Guías Menores",
        sectionId: 101,
        sectionName: "Guías Menores",
      },
      {
        clubId: 12,
        clubName: "Club Norte",
        instanceId: 102,
        instanceType: "pathfinders",
        label: "Club Norte · Tizones",
        sectionId: 102,
        sectionName: "Tizones",
      },
      {
        clubId: 8,
        clubName: "Club Sur",
        instanceId: 88,
        instanceType: "master_guilds",
        label: "Club Sur · Líderes",
        sectionId: 88,
        sectionName: "Líderes",
      },
    ]);
  });

  it("descarta targets inválidos devueltos por el backend", async () => {
    apiRequestMock.mockResolvedValueOnce({
      data: [
        {
          clubId: 2,
          clubName: "Club B",
          instanceId: 20,
          instanceType: "pathfinders",
          label: "Club B · Exploradores",
          sectionId: 20,
          sectionName: "Exploradores",
        },
        {
          clubId: 3,
          clubName: "Club C",
          instanceId: 0,
          instanceType: "pathfinders",
          label: "Club C · Sin sección",
          sectionId: 0,
          sectionName: "Sin sección",
        },
      ],
    });

    const targets = await listAuthorizedNotificationClubTargets();

    expect(targets).toEqual([
      {
        clubId: 2,
        clubName: "Club B",
        instanceId: 20,
        instanceType: "pathfinders",
        label: "Club B · Exploradores",
        sectionId: 20,
        sectionName: "Exploradores",
      },
    ]);
  });
});
