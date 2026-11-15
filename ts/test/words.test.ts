import { describe, expect, it } from "vitest";
import { check, createGuard, type WordEntry } from "../src/index";
import list from "../src/words.json";

const words = list.words as WordEntry[];
const blocking = words.filter((w) => w.c !== "safe");
const safe = words.filter((w) => w.c === "safe");
const reasonOf = { reserved: "reserved", brand: "brand", scam: "scam", abuse: "abusive" } as const;

describe("words.json", () => {
  it("has a calver version", () => {
    expect(list.version).toMatch(/^\d{4}\.\d{1,2}\.\d+$/);
  });

  it("has well formed entries", () => {
    for (const w of words) {
      expect(w.w).toMatch(/^[a-z0-9]+$/);
      expect(w.w.length).toBeGreaterThanOrEqual(3);
      expect(["reserved", "brand", "scam", "abuse", "safe"]).toContain(w.c);
      expect(["any", "en", "hi-latn"]).toContain(w.l);
      if (w.c !== "safe") expect(["exact", "part", "contains"]).toContain(w.m);
      if (w.m === "contains") expect(w.w.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("has no duplicate word within a category", () => {
    const keys = words.map((w) => `${w.c}:${w.w}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never lists a word as both blocking and safe", () => {
    const safeSet = new Set(safe.map((w) => w.w));
    for (const w of blocking) expect(safeSet.has(w.w)).toBe(false);
  });

  it("never lists one word in two blocking categories", () => {
    const seen = new Map<string, string>();
    for (const w of blocking) {
      expect(seen.get(w.w), w.w).toBeUndefined();
      seen.set(w.w, w.c);
    }
  });
});

describe("every listed word", () => {
  it.each(blocking.map((w) => [w.w, w] as const))("blocks %s", (_n, w) => {
    expect(check(w.w)).toEqual({ ok: false, reason: reasonOf[w.c as keyof typeof reasonOf] });
  });

  it("still blocks when hyphenated at every position", () => {
    for (const w of blocking) {
      for (let i = 1; i < w.w.length; i++) {
        const slug = `${w.w.slice(0, i)}-${w.w.slice(i)}`;
        expect(check(slug).ok, slug).toBe(false);
      }
    }
  });

  it("still blocks when leet encoded", () => {
    const encode = (s: string) => s.replace(/o/g, "0").replace(/e/g, "3").replace(/a/g, "4").replace(/s/g, "5").replace(/t/g, "7");
    for (const w of blocking.filter((x) => !/\d/.test(x.w))) {
      const slug = encode(w.w);
      expect(check(slug).ok, slug).toBe(false);
    }
  });

  it("lets every safe word through", () => {
    for (const w of safe) expect(check(w.w), w.w).toEqual({ ok: true });
  });

  it("lets every safe word through at strict level", () => {
    const guard = createGuard({ level: "strict" });
    for (const w of safe) expect(guard.check(w.w), w.w).toEqual({ ok: true });
  });
});
