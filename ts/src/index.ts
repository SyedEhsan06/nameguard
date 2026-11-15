import { createGuard } from "./guard.js";
import type { CheckResult, Explanation, Guard, Options } from "./types.js";

export { createGuard } from "./guard.js";
export type {
  BlockEntry,
  Category,
  CheckResult,
  Confidence,
  Explanation,
  Guard,
  Level,
  LevelMap,
  Match,
  MatchCategory,
  Mode,
  Options,
  ProfileName,
  Reason,
  WordEntry,
  WordList,
} from "./types.js";

const CACHE_LIMIT = 32;
const cache = new Map<string, Guard>();
let defaultGuard: Guard | undefined;

function guardFor(options?: Options): Guard {
  if (!options || Object.keys(options).length === 0) return (defaultGuard ??= createGuard());
  const key = JSON.stringify(options);
  let guard = cache.get(key);
  if (!guard) {
    if (cache.size >= CACHE_LIMIT) cache.clear();
    guard = createGuard(options);
    cache.set(key, guard);
  }
  return guard;
}

export function check(input: string, options?: Options): CheckResult {
  return guardFor(options).check(input);
}

export function isAllowed(input: string, options?: Options): boolean {
  return guardFor(options).isAllowed(input);
}

export function explain(input: string, options?: Options): Explanation {
  return guardFor(options).explain(input);
}
