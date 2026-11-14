import { describe, expect, it } from "vitest";
import { normaliseSheetId } from "./googleSheets";

const ID = "abcDEF123_-xyz";

describe("normaliseSheetId", () => {
  it("keeps a bare id", () => {
    expect(normaliseSheetId(ID)).toBe(ID);
    expect(normaliseSheetId(`  ${ID} `)).toBe(ID);
  });

  it("pulls the id out of a full Sheet URL", () => {
    expect(normaliseSheetId(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`)).toBe(ID);
    expect(normaliseSheetId(`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing`)).toBe(ID);
    expect(normaliseSheetId(`https://docs.google.com/spreadsheets/d/${ID}`)).toBe(ID);
  });

  it("treats blank as unset", () => {
    expect(normaliseSheetId("   ")).toBe("");
  });
});
