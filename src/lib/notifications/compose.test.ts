import { describe, expect, it } from "vitest";
import {
  availableComposeAudiences,
  buildComposeFormData,
  parseComposeAudience,
  validateCompose,
} from "./compose";

describe("availableComposeAudiences", () => {
  it("lists only what the user may send, in form order", () => {
    expect(availableComposeAudiences({ person: true, club: false, everyone: true })).toEqual([
      "person",
      "everyone",
    ]);
    expect(availableComposeAudiences({ person: false, club: false, everyone: false })).toEqual([]);
  });
});

describe("parseComposeAudience", () => {
  it("keeps the old ?type= links working", () => {
    expect(parseComposeAudience("direct")).toBe("person");
    expect(parseComposeAudience("broadcast")).toBe("everyone");
    expect(parseComposeAudience("club")).toBe("club");
    expect(parseComposeAudience("person")).toBe("person");
    expect(parseComposeAudience("nope")).toBeUndefined();
  });
});

describe("validateCompose", () => {
  const base = { userId: "", instanceTarget: "", title: " ", body: "" };

  it("asks for the recipient that the audience needs", () => {
    expect(Object.keys(validateCompose({ ...base, audience: "person" })).sort()).toEqual([
      "body",
      "title",
      "user_id",
    ]);
    expect(Object.keys(validateCompose({ ...base, audience: "club" })).sort()).toEqual([
      "body",
      "instance_id",
      "title",
    ]);
    expect(Object.keys(validateCompose({ ...base, audience: "everyone" })).sort()).toEqual([
      "body",
      "title",
    ]);
  });

  it("passes a complete broadcast", () => {
    expect(
      validateCompose({ audience: "everyone", userId: "", instanceTarget: "", title: "Hola", body: "Mensaje" }),
    ).toEqual({});
  });
});

describe("buildComposeFormData", () => {
  it("sends only the fields of the chosen audience", () => {
    const person = buildComposeFormData({
      audience: "person",
      userId: "u1",
      instanceTarget: "pathfinders:3",
      title: " Hola ",
      body: "Mensaje",
    });
    expect(person.get("user_id")).toBe("u1");
    expect(person.get("instance_target")).toBeNull();
    expect(person.get("title")).toBe("Hola");

    const club = buildComposeFormData({
      audience: "club",
      userId: "u1",
      instanceTarget: "pathfinders:3",
      title: "T",
      body: "B",
    });
    expect(club.get("instance_target")).toBe("pathfinders:3");
    expect(club.get("user_id")).toBeNull();
  });
});
