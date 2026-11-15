const LEET: Record<string, string> = { "0": "o", "3": "e", "4": "a", "5": "s", "7": "t" };

export function leet(s: string, one: "i" | "l"): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    out += ch === "1" ? one : (LEET[ch] ?? ch);
  }
  return out;
}

export function hasLeetChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 48 || c === 49 || c === 51 || c === 52 || c === 53 || c === 55) return true;
  }
  return false;
}

export function stripTrailingDigits(s: string): string {
  let end = s.length;
  while (end > 0) {
    const c = s.charCodeAt(end - 1);
    if (c < 48 || c > 57) break;
    end--;
  }
  return s.slice(0, end);
}

export function collapse(s: string): string {
  let out = "";
  let prev = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== prev) out += ch;
    prev = ch;
  }
  return out;
}

export function forms(s: string, collapseRuns: boolean): string[] {
  const bases = [s];
  const stripped = stripTrailingDigits(s);
  if (stripped.length > 0 && stripped !== s) bases.push(stripped);

  const out: string[] = [];
  const push = (v: string) => {
    if (!out.includes(v)) out.push(v);
  };

  for (const base of bases) {
    push(base);
    if (!hasLeetChar(base)) continue;
    push(leet(base, "i"));
    if (base.includes("1")) push(leet(base, "l"));
  }

  if (collapseRuns) {
    const count = out.length;
    for (let i = 0; i < count; i++) push(collapse(out[i]));
  }
  return out;
}
