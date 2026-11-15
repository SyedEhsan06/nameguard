import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "data", "words.json");
const targets = [join(root, "ts", "src", "words.json"), join(root, "go", "words.json")].filter((t) =>
  existsSync(dirname(t)),
);
const check = process.argv.includes("--check");

let stale = false;
for (const target of targets) {
  if (!check) {
    copyFileSync(source, target);
    continue;
  }
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current !== readFileSync(source, "utf8")) {
    console.error(`out of sync: ${target}`);
    stale = true;
  }
}
if (stale) process.exit(1);
