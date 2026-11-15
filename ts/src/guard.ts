import { Matcher, type Entry } from "./matcher.js";
import { PROFILES, parse } from "./profiles.js";
import type {
  Category,
  CheckResult,
  Explanation,
  Guard,
  Level,
  MatchCategory,
  Options,
  Reason,
  WordList,
} from "./types.js";
import defaultList from "./words.json";

const PRIORITY: MatchCategory[] = ["custom", "reserved", "brand", "scam", "abuse"];
const CATEGORIES: ReadonlySet<string> = new Set(["reserved", "brand", "scam", "abuse"]);
const LEVELS: ReadonlySet<string> = new Set(["exact", "normal", "strict", "paranoid"]);
const MODES: ReadonlySet<string> = new Set(["exact", "part", "contains"]);
const WORD = /^[a-z0-9]+$/;
const MIN_WORD_LENGTH = 3;

const REASONS: Record<MatchCategory, Reason> = {
  custom: "blocked",
  reserved: "reserved",
  brand: "brand",
  scam: "scam",
  abuse: "abusive",
};

function asciiLower(s: string): string {
  return s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
}

function alnum(s: string): string {
  return asciiLower(s).replace(/[^a-z0-9]/g, "");
}

function resolveLevel(options: Options, category: MatchCategory): Level {
  const spec = options.level;
  const level = typeof spec === "string" ? spec : (spec?.[category] ?? spec?.default ?? "normal");
  if (!LEVELS.has(level)) throw new RangeError(`nameguard: unknown level "${level}"`);
  return level;
}

function resolveCategories(options: Options): Set<Category> {
  const spec = options.categories ?? "all";
  if (spec === "all") return new Set(CATEGORIES as ReadonlySet<Category>);
  for (const c of spec) {
    if (!CATEGORIES.has(c)) throw new RangeError(`nameguard: unknown category "${c}"`);
  }
  return new Set(spec);
}

function customEntries(options: Options): Entry[] {
  return (options.block ?? []).map((item) => {
    const spec = typeof item === "string" ? { word: item } : item;
    const word = asciiLower(spec.word);
    if (!WORD.test(word) || word.length < MIN_WORD_LENGTH) {
      throw new RangeError(`nameguard: invalid block word "${spec.word}"`);
    }
    const mode = spec.mode ?? "part";
    if (!MODES.has(mode)) throw new RangeError(`nameguard: unknown mode "${mode}"`);
    return { word, category: "custom", language: "any", mode };
  });
}

function build(options: Options, list: WordList) {
  const profile = PROFILES[options.profile ?? "slug"];
  if (!profile) throw new RangeError(`nameguard: unknown profile "${options.profile}"`);

  const categories = resolveCategories(options);
  const languages = options.languages ?? "all";
  const wanted = (language: string) =>
    languages === "all" || language === "any" || languages.includes(language);

  const allowRaw = new Set((options.allow ?? []).map(asciiLower));
  const allowWords = new Set([...allowRaw].map(alnum));
  const custom = customEntries(options);
  for (const entry of custom) {
    if (allowWords.has(entry.word)) {
      throw new RangeError(`nameguard: "${entry.word}" is in both allow and block`);
    }
  }

  const byCategory = new Map<MatchCategory, Entry[]>();
  const safeWords: string[] = [];
  for (const row of list.words) {
    if (row.c === "safe") {
      safeWords.push(row.w);
      continue;
    }
    if (!categories.has(row.c) || !wanted(row.l) || allowWords.has(row.w)) continue;
    const entries = byCategory.get(row.c) ?? [];
    entries.push({ word: row.w, category: row.c, language: row.l, mode: row.m ?? "part" });
    byCategory.set(row.c, entries);
  }
  if (custom.length > 0) byCategory.set("custom", custom);

  for (const word of allowWords) if (word.length >= MIN_WORD_LENGTH) safeWords.push(word);

  const matchers: Array<[MatchCategory, Matcher]> = [];
  for (const category of PRIORITY) {
    const entries = byCategory.get(category);
    if (entries && entries.length > 0) {
      matchers.push([category, new Matcher(entries, safeWords, resolveLevel(options, category))]);
    }
  }
  return { profile, allowRaw, matchers };
}

export function createGuard(options: Options = {}): Guard {
  const { profile, allowRaw, matchers } = build(options, options.words ?? (defaultList as WordList));
  const listVersion = (options.words ?? (defaultList as WordList)).version;

  const explain = (input: string): Explanation => {
    const parsed = parse(input, profile);
    if (!parsed.ok) return { ok: false, reason: parsed.reason };
    const subject = parsed.subject;
    if (allowRaw.has(subject.raw)) return { ok: true };
    for (const [category, matcher] of matchers) {
      const hit = matcher.find(subject);
      if (hit) {
        return {
          ok: false,
          reason: REASONS[category],
          match: {
            word: hit.entry.word,
            category,
            language: hit.entry.language,
            confidence: hit.confidence,
          },
        };
      }
    }
    return { ok: true };
  };

  const check = (input: string): CheckResult => {
    const parsed = parse(input, profile);
    if (!parsed.ok) return { ok: false, reason: parsed.reason };
    const subject = parsed.subject;
    if (allowRaw.has(subject.raw)) return { ok: true };
    for (const [category, matcher] of matchers) {
      if (matcher.find(subject)) return { ok: false, reason: REASONS[category] };
    }
    return { ok: true };
  };

  return {
    listVersion,
    check,
    isAllowed: (input) => check(input).ok,
    explain,
  };
}
