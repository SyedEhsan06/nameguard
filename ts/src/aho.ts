const ALPHABET = 36;

function code(c: number): number {
  if (c >= 97 && c <= 122) return c - 97;
  if (c >= 48 && c <= 57) return c - 48 + 26;
  return -1;
}

export class AhoCorasick {
  private readonly edges = new Map<number, number>();
  private readonly terminal: Array<number[] | undefined> = [undefined];
  private readonly fail: number[] = [0];
  private readonly dict: number[] = [-1];
  private readonly lengths: number[];

  constructor(patterns: string[]) {
    this.lengths = patterns.map((p) => p.length);
    const first: number[] = [-1];
    const sibling: number[] = [-1];
    const symbol: number[] = [0];

    patterns.forEach((pattern, id) => {
      let node = 0;
      for (let i = 0; i < pattern.length; i++) {
        const c = code(pattern.charCodeAt(i));
        const key = node * ALPHABET + c;
        let child = this.edges.get(key);
        if (child === undefined) {
          child = this.terminal.length;
          this.terminal.push(undefined);
          this.fail.push(0);
          this.dict.push(-1);
          first.push(-1);
          sibling.push(first[node]);
          symbol.push(c);
          first[node] = child;
          this.edges.set(key, child);
        }
        node = child;
      }
      (this.terminal[node] ??= []).push(id);
    });

    const queue: number[] = [];
    for (let v = first[0]; v !== -1; v = sibling[v]) queue.push(v);
    for (let head = 0; head < queue.length; head++) {
      const u = queue[head];
      for (let v = first[u]; v !== -1; v = sibling[v]) {
        const c = symbol[v];
        let f = this.fail[u];
        let target = this.edges.get(f * ALPHABET + c);
        while (target === undefined && f !== 0) {
          f = this.fail[f];
          target = this.edges.get(f * ALPHABET + c);
        }
        this.fail[v] = target ?? 0;
        this.dict[v] = this.terminal[this.fail[v]] ? this.fail[v] : this.dict[this.fail[v]];
        queue.push(v);
      }
    }
  }

  search(text: string, onMatch: (id: number, start: number, end: number) => void): void {
    let state = 0;
    for (let i = 0; i < text.length; i++) {
      const c = code(text.charCodeAt(i));
      if (c < 0) {
        state = 0;
        continue;
      }
      let next = this.edges.get(state * ALPHABET + c);
      while (next === undefined && state !== 0) {
        state = this.fail[state];
        next = this.edges.get(state * ALPHABET + c);
      }
      state = next ?? 0;

      let node = this.terminal[state] ? state : this.dict[state];
      while (node > 0) {
        for (const id of this.terminal[node]!) onMatch(id, i + 1 - this.lengths[id], i + 1);
        node = this.dict[node];
      }
    }
  }
}
