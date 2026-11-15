import { forms } from "./forms.js";
import type { ProfileName, Reason } from "./types.js";

export interface Profile {
  min: number;
  max: number;
  separators: string;
}

export const PROFILES: Record<ProfileName, Profile> = {
  slug: { min: 3, max: 63, separators: "-" },
  username: { min: 3, max: 30, separators: "._-" },
};

export class Subject {
  private whole: [string[] | null, string[] | null] = [null, null];
  private perToken: [string[][] | null, string[][] | null] = [null, null];

  constructor(
    readonly raw: string,
    readonly tokens: string[],
    readonly joined: string,
  ) {}

  wholeForms(collapseRuns: boolean): string[] {
    const i = collapseRuns ? 1 : 0;
    return (this.whole[i] ??= forms(this.joined, collapseRuns));
  }

  tokenForms(collapseRuns: boolean): string[][] {
    const i = collapseRuns ? 1 : 0;
    return (this.perToken[i] ??= this.tokens.map((t) => forms(t, collapseRuns)));
  }
}

export type Parsed = { ok: true; subject: Subject } | { ok: false; reason: Reason };

function codePointLength(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) i++;
    }
    n++;
  }
  return n;
}

export function parse(input: unknown, profile: Profile): Parsed {
  if (typeof input !== "string") return { ok: false, reason: "invalid_format" };
  if (input.length > profile.max * 2) return { ok: false, reason: "too_long" };

  const length = codePointLength(input);
  if (length < profile.min) return { ok: false, reason: "too_short" };
  if (length > profile.max) return { ok: false, reason: "too_long" };

  let raw = "";
  const tokens: string[] = [];
  let token = "";
  let joined = "";
  for (let i = 0; i < input.length; i++) {
    let c = input.charCodeAt(i);
    if (c >= 65 && c <= 90) c += 32;
    const ch = String.fromCharCode(c);
    if ((c >= 97 && c <= 122) || (c >= 48 && c <= 57)) {
      token += ch;
      joined += ch;
    } else if (c < 128 && profile.separators.includes(ch)) {
      if (i === 0 || i === input.length - 1) return { ok: false, reason: "invalid_format" };
      if (token) tokens.push(token);
      token = "";
    } else {
      return { ok: false, reason: "invalid_format" };
    }
    raw += ch;
  }
  if (token) tokens.push(token);
  return { ok: true, subject: new Subject(raw, tokens, joined) };
}
