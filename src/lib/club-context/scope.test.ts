import { describe, expect, it } from "vitest";
import {
  buildClubScopeOptions,
  decodeScopeId,
  encodeScopeId,
  readScopeCookieValue,
  resolveClubContext,
} from "./scope";
import type { ClubContextClub } from "./types";

const section = (id: number, name: string) => ({ club_section_id: id, club_type_id: id, name, club_type: { name } });

const CLUBS: ClubContextClub[] = [
  { club_id: 1, name: "Club Orión", group: "Norte", sections: [section(11, "Conquistadores"), section(12, "Aventureros")] },
  { club_id: 2, name: "Club Cedros", sections: [section(21, "Conquistadores")] },
];

const cookie = (value: Record<string, string>) => encodeURIComponent(JSON.stringify(value));

describe("club context scope", () => {
  it("reads a key of the scope cookie, encoded or not", () => {
    expect(readScopeCookieValue(cookie({ club: "2" }), "club")).toBe("2");
    expect(readScopeCookieValue(JSON.stringify({ club: "2" }), "club")).toBe("2");
    expect(readScopeCookieValue("not json", "club")).toBeNull();
    expect(readScopeCookieValue(undefined, "club")).toBeNull();
  });

  it("prefers the URL over the cookie", () => {
    const { club, section: picked } = resolveClubContext({
      clubs: CLUBS,
      searchParams: { club: "1", section: "12" },
      cookie: cookie({ club: "2", section: "21" }),
    });
    expect(club?.club_id).toBe(1);
    expect(picked?.club_section_id).toBe(12);
  });

  it("falls back to the remembered club and its section", () => {
    const { club, section: picked } = resolveClubContext({
      clubs: CLUBS,
      searchParams: {},
      cookie: cookie({ club: "1", section: "11" }),
    });
    expect(club?.club_id).toBe(1);
    expect(picked?.club_section_id).toBe(11);
  });

  it("selects the single section of a club and ignores a section of another club", () => {
    expect(resolveClubContext({ clubs: CLUBS, searchParams: { club: "2" } }).section?.club_section_id).toBe(21);
    expect(resolveClubContext({ clubs: CLUBS, searchParams: { club: "1", section: "21" } }).section).toBeNull();
  });

  it("sends a club role straight to its only club, and leaves territory roles without one", () => {
    expect(resolveClubContext({ clubs: [CLUBS[1]!], searchParams: {} }).club?.club_id).toBe(2);
    expect(resolveClubContext({ clubs: CLUBS, searchParams: {} }).club).toBeNull();
    expect(resolveClubContext({ clubs: CLUBS, searchParams: { club: "99" } }).club).toBeNull();
  });

  it("builds options, with a whole-club entry only where it applies", () => {
    const ids = (allow: boolean) =>
      buildClubScopeOptions(CLUBS, { allowAllSections: allow, allSectionsLabel: "Todas" }).map((o) => o.id);
    expect(ids(false)).toEqual(["1:11", "1:12", "2:21"]);
    expect(ids(true)).toEqual(["1", "1:11", "1:12", "2:21"]);
  });

  it("round-trips scope ids", () => {
    expect(decodeScopeId(encodeScopeId(3, 7))).toEqual({ clubId: 3, sectionId: 7 });
    expect(decodeScopeId(encodeScopeId(3))).toEqual({ clubId: 3, sectionId: null });
    expect(decodeScopeId("x")).toBeNull();
  });
});
