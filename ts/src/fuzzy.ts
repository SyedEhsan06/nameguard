export interface FuzzyPolicy {
  oneEditMinLength: number;
  twoEditMinLength: number;
}

export function deletes(s: string, depth: number): string[] {
  const seen = new Set<string>([s]);
  const out = [s];
  let layer = [s];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const item of layer) {
      for (let i = 0; i < item.length; i++) {
        const v = item.slice(0, i) + item.slice(i + 1);
        if (!seen.has(v)) {
          seen.add(v);
          out.push(v);
          next.push(v);
        }
      }
    }
    layer = next;
  }
  return out;
}

export function distance(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  let prev2: number[] = new Array(m + 1).fill(0);
  let prev: number[] = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= m; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur.push(v);
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[m];
}

export class FuzzyIndex {
  private readonly buckets = new Map<string, number[]>();
  private readonly allowedEdits: number[];
  private readonly maxEdits: number;
  private readonly minLength: number;
  private readonly maxLength: number;

  constructor(
    private readonly words: string[],
    private readonly policy: FuzzyPolicy,
  ) {
    this.allowedEdits = words.map((w) => this.allowed(w.length));
    let maxEdits = 0;
    let minLength = Infinity;
    let maxLength = 0;
    words.forEach((word, index) => {
      const edits = this.allowedEdits[index];
      if (edits === 0) return;
      maxEdits = Math.max(maxEdits, edits);
      minLength = Math.min(minLength, word.length);
      maxLength = Math.max(maxLength, word.length);
      for (const key of deletes(word, edits)) {
        const bucket = this.buckets.get(key);
        if (bucket) bucket.push(index);
        else this.buckets.set(key, [index]);
      }
    });
    this.maxEdits = maxEdits;
    this.minLength = minLength;
    this.maxLength = maxLength;
  }

  get size(): number {
    return this.buckets.size;
  }

  private allowed(length: number): number {
    if (length >= this.policy.twoEditMinLength) return 2;
    if (length >= this.policy.oneEditMinLength) return 1;
    return 0;
  }

  lookup(query: string): number {
    if (this.maxEdits === 0) return -1;
    if (query.length < this.minLength - this.maxEdits || query.length > this.maxLength + this.maxEdits) return -1;
    const seen = new Set<number>();
    for (const key of deletes(query, this.maxEdits)) {
      const bucket = this.buckets.get(key);
      if (!bucket) continue;
      for (const index of bucket) {
        if (seen.has(index)) continue;
        seen.add(index);
        const d = distance(query, this.words[index]);
        if (d > 0 && d <= this.allowedEdits[index]) return index;
      }
    }
    return -1;
  }
}
