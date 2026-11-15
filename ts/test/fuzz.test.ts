import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createGuard, type Level } from "../src/index";
import list from "../src/words.json";

const levels: Level[] = ["exact", "normal", "strict", "paranoid"];
const guards = levels.map((level) => createGuard({ level }));
const blocking = list.words.filter((w) => w.c !== "safe").map((w) => w.w);
const slugChars = "abcdefghijklmnopqrstuvwxyz0123456789-".split("");
const slugLike = fc.array(fc.constantFrom(...slugChars), { maxLength: 80 }).map((a) => a.join(""));
const anything = fc.oneof(slugLike, fc.string({ maxLength: 120 }), fc.fullUnicodeString({ maxLength: 80 }));

describe("fuzz", () => {
  it("never throws and always returns a well formed result", () => {
    fc.assert(
      fc.property(anything, (input) => {
        for (const guard of guards) {
          const result = guard.check(input);
          expect(typeof result.ok).toBe("boolean");
          if (!result.ok) expect(typeof result.reason).toBe("string");
        }
      }),
      { numRuns: 3000 },
    );
  });

  it("is deterministic", () => {
    fc.assert(
      fc.property(anything, (input) => {
        for (const guard of guards) expect(guard.check(input)).toEqual(guard.check(input));
      }),
      { numRuns: 1000 },
    );
  });

  it("is case insensitive", () => {
    fc.assert(
      fc.property(slugLike, (input) => {
        for (const guard of guards) expect(guard.check(input.toUpperCase())).toEqual(guard.check(input));
      }),
      { numRuns: 1000 },
    );
  });

  it("only accepts input that matches the slug format", () => {
    const format = /^(?!-)(?!.*-$)[a-z0-9-]{3,63}$/;
    fc.assert(
      fc.property(anything, (input) => {
        const result = createGuard().check(input);
        if (result.ok) expect(format.test(input.toLowerCase())).toBe(true);
      }),
      { numRuns: 3000 },
    );
  });

  it("blocks any listed word with hyphens inserted anywhere", () => {
    fc.assert(
      fc.property(fc.constantFrom(...blocking), fc.array(fc.nat(40), { maxLength: 5 }), (word, cuts) => {
        let slug = word;
        for (const cut of cuts) {
          const at = 1 + (cut % Math.max(1, slug.replace(/-/g, "").length - 1));
          let seen = 0;
          let out = "";
          for (const ch of slug) {
            if (ch !== "-" && seen === at && !out.endsWith("-")) out += "-";
            if (ch !== "-") seen++;
            out += ch;
          }
          slug = out;
        }
        for (const guard of guards.slice(1)) expect(guard.check(slug).ok, slug).toBe(false);
      }),
      { numRuns: 2000 },
    );
  });

  it("never gets more permissive as the level rises", () => {
    fc.assert(
      fc.property(slugLike, (input) => {
        const normal = guards[1].check(input).ok;
        const strict = guards[2].check(input).ok;
        const paranoid = guards[3].check(input).ok;
        if (!normal) expect(strict).toBe(false);
        if (!strict) expect(paranoid).toBe(false);
      }),
      { numRuns: 3000 },
    );
  });
});
