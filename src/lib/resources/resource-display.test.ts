import { describe, expect, it } from "vitest";
import {
  extractResourceSignedUrl,
  pickCategoryName,
  pickClubTypeIdValue,
  pickClubTypeLabel,
  pickResourceId,
  pickUploader,
} from "./resource-display";

const clubTypes = [
  { club_type_id: 1, name: "Aventureros" },
  { club_type_id: 2, name: "Conquistadores" },
  { club_type_id: 3, name: "Guías Mayores" },
];

describe("resource table display helpers", () => {
  it("uses UUID resource ids so row actions are enabled", () => {
    expect(pickResourceId({ resource_id: "9c7b0cf5-0b0b-4db8-b488-90f2fd2a4d3e" })).toBe(
      "9c7b0cf5-0b0b-4db8-b488-90f2fd2a4d3e",
    );
  });

  it("reads category and uploader from backend relation names", () => {
    const resource = {
      resource_categories: { name: "Materiales de clase" },
      users: { name: "Admin SACDIA", email: "admin@sacdia.com" },
    };

    expect(pickCategoryName(resource)).toBe("Materiales de clase");
    expect(pickUploader(resource)).toBe("Admin SACDIA");
  });

  it("displays the specific club type from relation or catalog id", () => {
    expect(
      pickClubTypeLabel({ club_type_id: 2, club_types: { name: "Conquistadores" } }, clubTypes),
    ).toBe("Conquistadores");
    expect(pickClubTypeLabel({ club_type_id: 3 }, clubTypes)).toBe("Guías Mayores");
    expect(pickClubTypeIdValue({ club_type_id: 2 })).toBe("2");
  });

  it("shows Todos only when the resource has no club type restriction", () => {
    expect(pickClubTypeLabel({ club_type_id: null }, clubTypes)).toBe("Todos");
  });

  it("extracts signed URLs from direct and standard API envelope payloads", () => {
    expect(extractResourceSignedUrl({ url: "https://r2.example/direct" })).toBe(
      "https://r2.example/direct",
    );
    expect(
      extractResourceSignedUrl({
        status: "success",
        data: { url: "https://r2.example/enveloped" },
      }),
    ).toBe("https://r2.example/enveloped");
  });
});
