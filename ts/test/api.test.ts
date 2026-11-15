import { describe, expect, it } from "vitest";
import { check, createGuard, explain, isAllowed } from "../src/index";

describe("api", () => {
  it("check works with zero configuration", () => {
    expect(check("adm1n")).toEqual({ ok: false, reason: "reserved" });
    expect(check("assam-silk")).toEqual({ ok: true });
  });

  it("check accepts options and caches the guard", () => {
    expect(check("paytm", { categories: ["abuse"] })).toEqual({ ok: true });
    expect(check("paytm", { categories: ["abuse"] })).toEqual({ ok: true });
    expect(check("paytm", { categories: ["brand"] })).toEqual({ ok: false, reason: "brand" });
  });

  it("isAllowed mirrors check", () => {
    expect(isAllowed("demostore")).toBe(true);
    expect(isAllowed("admin")).toBe(false);
  });

  it("never leaks the matched word through check", () => {
    const result = check("f-u-c-k");
    expect(JSON.stringify(result)).not.toContain("fuck");
  });

  it("explain exposes the match for server side logging", () => {
    const e = explain("a-d-m-i-n");
    expect(e.ok).toBe(false);
    expect(e.reason).toBe("reserved");
    expect(e.match).toMatchObject({ word: "admin", category: "reserved", confidence: "normalized" });
  });

  it("explain reports exact, normalized and fuzzy confidence", () => {
    expect(explain("admin").match?.confidence).toBe("exact");
    expect(explain("adm1n").match?.confidence).toBe("normalized");
    expect(explain("razorpai", { level: "strict" }).match?.confidence).toBe("fuzzy");
  });

  it("exposes the list version", () => {
    expect(createGuard().listVersion).toMatch(/^\d{4}\.\d+\.\d+$/);
  });

  it("rejects non string input without throwing", () => {
    const guard = createGuard();
    expect(guard.check(undefined as unknown as string)).toEqual({ ok: false, reason: "invalid_format" });
    expect(guard.check(42 as unknown as string)).toEqual({ ok: false, reason: "invalid_format" });
    expect(guard.check(null as unknown as string)).toEqual({ ok: false, reason: "invalid_format" });
  });

  it("is case insensitive", () => {
    expect(check("ADMIN")).toEqual(check("admin"));
    expect(check("PayTM-Store")).toEqual(check("paytm-store"));
  });
});

describe("options validation", () => {
  it("rejects unknown categories, levels, profiles and modes", () => {
    expect(() => createGuard({ categories: ["nope" as never] })).toThrow(RangeError);
    expect(() => createGuard({ level: "wild" as never })).toThrow(RangeError);
    expect(() => createGuard({ profile: "domain" as never })).toThrow(RangeError);
    expect(() => createGuard({ block: [{ word: "abcd", mode: "fuzzy" as never }] })).toThrow(RangeError);
  });

  it("rejects invalid block words", () => {
    expect(() => createGuard({ block: ["a-b-c"] })).toThrow(RangeError);
    expect(() => createGuard({ block: ["ab"] })).toThrow(RangeError);
  });

  it("rejects a word that is both allowed and blocked", () => {
    expect(() => createGuard({ allow: ["merchantly"], block: ["merchantly"] })).toThrow(RangeError);
  });
});

describe("custom word lists", () => {
  const words = {
    version: "1.0.0",
    words: [
      { w: "forbidden", c: "reserved" as const, l: "any", m: "exact" as const },
      { w: "harmless", c: "safe" as const, l: "any" },
    ],
  };

  it("replaces the built in list", () => {
    const guard = createGuard({ words });
    expect(guard.check("forbidden")).toEqual({ ok: false, reason: "reserved" });
    expect(guard.check("admin")).toEqual({ ok: true });
    expect(guard.listVersion).toBe("1.0.0");
  });
});

describe("allow list", () => {
  it("lets an allowed word suppress contains matches inside longer names", () => {
    const guard = createGuard({ allow: ["paytmlabs"] });
    expect(guard.check("paytmlabs-store")).toEqual({ ok: true });
    expect(guard.check("paytm-store")).toEqual({ ok: false, reason: "brand" });
  });
});
