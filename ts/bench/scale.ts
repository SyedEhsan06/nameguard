import { createGuard, type WordList } from "../src/index";

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

for (const size of [1_000, 10_000, 100_000]) {
  const words = bigList(size);
  const t0 = performance.now();
  const guard = createGuard({ words });
  const build = performance.now() - t0;
  const inputs = ["demostore", "assam-silk", "mail-order-store", "my-awesome-fashion-boutique-2024"];
  const n = 200_000;
  const t1 = performance.now();
  for (let i = 0; i < n; i++) guard.check(inputs[i % inputs.length]);
  const per = ((performance.now() - t1) * 1000) / n;
  console.log(`${String(size).padStart(7)} words  build ${build.toFixed(0).padStart(5)} ms  check ${per.toFixed(2)} µs`);
}
