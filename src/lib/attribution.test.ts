import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_STORAGE_KEY,
  captureFirstTouchAttribution,
} from "./attribution";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const now = new Date("2026-09-10T14:03:22.000Z");

describe("captureFirstTouchAttribution", () => {
  it("captures campaign parameters from the landing URL", () => {
    const storage = new MemoryStorage();
    const result = captureFirstTouchAttribution(
      "?src=ig&med=reel&camp=lite-q4&cnt=2026-09-10-discipline-01",
      storage,
      now,
    );

    expect(result).toEqual({
      src: "ig",
      med: "reel",
      camp: "lite-q4",
      cnt: "2026-09-10-discipline-01",
      firstTouchAt: now.toISOString(),
    });
    expect(storage.getItem(ATTRIBUTION_STORAGE_KEY)).not.toBeNull();
  });

  it("keeps the first touch for 30 days", () => {
    const storage = new MemoryStorage();
    captureFirstTouchAttribution("?src=ig&med=story&camp=lite-q4&cnt=first", storage, now);

    const second = captureFirstTouchAttribution(
      "?src=tt&med=post&camp=lite-q4&cnt=second",
      storage,
      new Date("2026-09-20T14:03:22.000Z"),
    );

    expect(second.src).toBe("ig");
    expect(second.med).toBe("story");
    expect(second.cnt).toBe("first");
  });

  it("replaces an expired first touch", () => {
    const storage = new MemoryStorage();
    captureFirstTouchAttribution("?src=ig&med=story&camp=lite-q4&cnt=old", storage, now);

    const replacement = captureFirstTouchAttribution(
      "?src=fb&med=post&camp=lite-q4&cnt=new",
      storage,
      new Date("2026-10-11T14:03:22.000Z"),
    );

    expect(replacement.src).toBe("fb");
    expect(replacement.cnt).toBe("new");
  });

  it("uses explicit direct defaults when no campaign exists", () => {
    const result = captureFirstTouchAttribution("", new MemoryStorage(), now);
    expect(result).toEqual({
      src: "direct",
      med: "none",
      camp: "none",
      cnt: "none",
      firstTouchAt: now.toISOString(),
    });
  });

  it("normalizes campaign values before storing them locally", () => {
    const storage = new MemoryStorage();
    const result = captureFirstTouchAttribution(
      `?src=%20IG%20&med=%3CReel%3E&camp=&cnt=${"x".repeat(120)}`,
      storage,
      now,
    );

    expect(result.src).toBe("ig");
    expect(result.med).toBe("reel");
    expect(result.camp).toBe("none");
    expect(result.cnt).toHaveLength(80);
    expect(storage.getItem(ATTRIBUTION_STORAGE_KEY)).toBe(JSON.stringify(result));
  });
});
