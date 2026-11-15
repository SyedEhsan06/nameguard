import { bench, describe } from "vitest";
import { createGuard, type WordList } from "../src/index";

const inputs = ["demostore", "assam-silk", "mail-order-store", "adm1n", "a-d-m-i-n", "paytm-support", "my-awesome-fashion-boutique-2024"];

function bigList(size: number): WordList {
  const words: WordList["words"] = [];
  let seed = 12345;
  const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
  const letters = "abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < size; i++) {
    let w = "";
    const len = 5 + (next() % 8);
    for (let j = 0; j < len; j++) w += letters[next() % 26];
    words.push({ w, c: i % 2 ? "abuse" : "brand", l: "any", m: i % 3 === 0 ? "contains" : "part" });
  }
  return { version: "bench", words };
}

for (const level of ["normal", "strict", "paranoid"] as const) {
  const guard = createGuard({ level });
  describe(`built-in list, ${level}`, () => {
    bench("check mixed inputs", () => {
      for (const input of inputs) guard.check(input);
    });
  });
}

const large = createGuard({ words: bigList(100_000) });
describe("100k word list, normal", () => {
  bench("check mixed inputs", () => {
    for (const input of inputs) large.check(input);
  });
});

describe("build time", () => {
  bench("default guard", () => {
    createGuard();
  });
});
