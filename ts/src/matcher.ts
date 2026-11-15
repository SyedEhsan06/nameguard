import { AhoCorasick } from "./aho.js";
import { collapse } from "./forms.js";
import { FuzzyIndex, type FuzzyPolicy } from "./fuzzy.js";
import type { Subject } from "./profiles.js";
import type { Confidence, Level, MatchCategory, Mode } from "./types.js";

export interface Entry {
  word: string;
  category: MatchCategory;
  language: string;
  mode: Mode;
}

export interface Hit {
  entry: Entry;
  confidence: Confidence;
}

const FUZZY_POLICY: Partial<Record<Level, FuzzyPolicy>> = {
  strict: { oneEditMinLength: 6, twoEditMinLength: Infinity },
  paranoid: { oneEditMinLength: 5, twoEditMinLength: 8 },
};

const STRICT_FUZZY_CATEGORIES: ReadonlySet<MatchCategory> = new Set(["brand", "reserved"]);
const PROMOTE_MIN_LENGTH = 5;

function keysOf(word: string, withCollapsed: boolean): string[] {
  if (!withCollapsed) return [word];
  const collapsed = collapse(word);
  return collapsed === word ? [word] : [word, collapsed];
}

function fill(map: Map<string, Entry>, entry: Entry, withCollapsed: boolean): void {
  for (const key of keysOf(entry.word, withCollapsed)) {
    if (!map.has(key)) map.set(key, entry);
  }
}

export class Matcher {
  private readonly level: Level;
  private readonly collapseRuns: boolean;
  private readonly exactOnly = new Map<string, Entry>();
  private readonly whole = new Map<string, Entry>();
  private readonly part = new Map<string, Entry>();
  private readonly containsEntries: Entry[] = [];
  private readonly ahoMeta: number[] = [];
  private aho: AhoCorasick | null = null;
  private fuzzy: FuzzyIndex | null = null;
  private fuzzyEntries: Entry[] = [];

  constructor(entries: Entry[], safeWords: string[], level: Level) {
    this.level = level;
    this.collapseRuns = level === "strict" || level === "paranoid";

    if (level === "exact") {
      for (const entry of entries) if (!this.exactOnly.has(entry.word)) this.exactOnly.set(entry.word, entry);
      return;
    }

    const promote = level === "paranoid";
    const patterns: string[] = [];

    for (const entry of entries) {
      fill(this.whole, entry, this.collapseRuns);
      if (entry.mode === "part") fill(this.part, entry, this.collapseRuns);

      const asContains =
        entry.mode === "contains" ||
        (promote && entry.mode === "part" && entry.word.length >= PROMOTE_MIN_LENGTH);
      if (asContains) {
        const index = this.containsEntries.push(entry) - 1;
        for (const key of keysOf(entry.word, this.collapseRuns)) {
          patterns.push(key);
          this.ahoMeta.push(index);
        }
      }
    }

    if (this.containsEntries.length > 0) {
      for (const word of safeWords) {
        for (const key of keysOf(word, this.collapseRuns)) {
          patterns.push(key);
          this.ahoMeta.push(-1);
        }
      }
      this.aho = new AhoCorasick(patterns);
    }

    const policy = FUZZY_POLICY[level];
    if (policy) {
      this.fuzzyEntries = entries.filter(
        (e) => level === "paranoid" || STRICT_FUZZY_CATEGORIES.has(e.category),
      );
      const index = new FuzzyIndex(
        this.fuzzyEntries.map((e) => e.word),
        policy,
      );
      if (index.size > 0) this.fuzzy = index;
    }
  }

  find(subject: Subject): Hit | null {
    if (this.level === "exact") {
      const entry = this.exactOnly.get(subject.raw);
      return entry ? { entry, confidence: "exact" } : null;
    }

    const wholeForms = subject.wholeForms(this.collapseRuns);

    for (const form of wholeForms) {
      const entry = this.whole.get(form);
      if (entry) return { entry, confidence: form === subject.raw ? "exact" : "normalized" };
    }

    const tokenForms = subject.tokenForms(this.collapseRuns);

    if (this.part.size > 0) {
      for (let t = 0; t < tokenForms.length; t++) {
        for (const form of tokenForms[t]) {
          const entry = this.part.get(form);
          if (entry) return { entry, confidence: form === subject.tokens[t] ? "exact" : "normalized" };
        }
      }
    }

    if (this.aho) {
      for (const form of wholeForms) {
        const entry = this.findContained(form);
        if (entry) return { entry, confidence: form === subject.raw ? "exact" : "normalized" };
      }
    }

    if (this.fuzzy) {
      for (const form of wholeForms) {
        const index = this.fuzzy.lookup(form);
        if (index >= 0) return { entry: this.fuzzyEntries[index], confidence: "fuzzy" };
      }
      for (const forms of tokenForms) {
        for (const form of forms) {
          const index = this.fuzzy.lookup(form);
          if (index >= 0 && this.fuzzyEntries[index].mode !== "exact") {
            return { entry: this.fuzzyEntries[index], confidence: "fuzzy" };
          }
        }
      }
    }

    return null;
  }

  private findContained(form: string): Entry | null {
    const hits: Array<[number, number, number]> = [];
    const safes: Array<[number, number]> = [];
    this.aho!.search(form, (id, start, end) => {
      const meta = this.ahoMeta[id];
      if (meta < 0) safes.push([start, end]);
      else hits.push([meta, start, end]);
    });

    for (const [meta, start, end] of hits) {
      if (!safes.some(([s, e]) => s <= start && end <= e)) return this.containsEntries[meta];
    }
    return null;
  }
}
