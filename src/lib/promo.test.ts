import { describe, expect, it } from "vitest";
import { parsePromoUrl } from "./promo";

describe("parsePromoUrl", () => {
  it("treats a blank string as the empty plate", () => {
    expect(parsePromoUrl("")).toEqual({ kind: "empty" });
    expect(parsePromoUrl("   ")).toEqual({ kind: "empty" });
  });

  it("embeds a watch URL as youtube-nocookie", () => {
    const parsed = parsePromoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(parsed.kind).toBe("youtube");
    if (parsed.kind === "youtube") {
      expect(parsed.src).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    }
  });

  it("accepts youtu.be and shorts", () => {
    expect(parsePromoUrl("https://youtu.be/dQw4w9WgXcQ").kind).toBe("youtube");
    expect(parsePromoUrl("https://youtube.com/shorts/dQw4w9WgXcQ").kind).toBe(
      "youtube",
    );
  });

  it("strips share-tag query from a Shorts URL", () => {
    const parsed = parsePromoUrl(
      "https://youtube.com/shorts/JgC2FOk8s7k?is=AYfndMcns0w91J7l",
    );
    expect(parsed.kind).toBe("youtube");
    if (parsed.kind === "youtube") {
      expect(parsed.src).toContain("youtube-nocookie.com/embed/JgC2FOk8s7k");
    }
  });

  it("accepts a direct mp4", () => {
    const parsed = parsePromoUrl("https://cdn.example.com/briefing.mp4");
    expect(parsed).toEqual({
      kind: "file",
      src: "https://cdn.example.com/briefing.mp4",
    });
  });

  it("rejects junk", () => {
    expect(parsePromoUrl("not a url").kind).toBe("invalid");
    expect(parsePromoUrl("https://example.com/page").kind).toBe("invalid");
  });
});
