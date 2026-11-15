export type Category = "reserved" | "brand" | "scam" | "abuse";
export type MatchCategory = Category | "custom";
export type Level = "exact" | "normal" | "strict" | "paranoid";
export type Mode = "exact" | "part" | "contains";
export type ProfileName = "slug" | "username";
export type Confidence = "exact" | "normalized" | "fuzzy";

export type Reason =
  | "invalid_format"
  | "too_short"
  | "too_long"
  | "reserved"
  | "brand"
  | "scam"
  | "abusive"
  | "blocked";

export type LevelMap = Partial<Record<MatchCategory | "default", Level>>;

export interface BlockEntry {
  word: string;
  mode?: Mode;
}

export interface Options {
  profile?: ProfileName;
  categories?: "all" | Category[];
  languages?: "all" | string[];
  level?: Level | LevelMap;
  allow?: string[];
  block?: Array<string | BlockEntry>;
  words?: WordList;
}

export type CheckResult = { ok: true } | { ok: false; reason: Reason };

export interface Match {
  word: string;
  category: MatchCategory;
  language: string;
  confidence: Confidence;
}

export interface Explanation {
  ok: boolean;
  reason?: Reason;
  match?: Match;
}

export interface Guard {
  readonly listVersion: string;
  check(input: string): CheckResult;
  isAllowed(input: string): boolean;
  explain(input: string): Explanation;
}

export interface WordEntry {
  w: string;
  c: Category | "safe";
  l: string;
  m?: Mode;
}

export interface WordList {
  version: string;
  words: WordEntry[];
}
