import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createGuard, type Options } from "../src/index";

interface Case {
  id: string;
  input: string;
  profile?: "slug" | "username";
  options?: Options;
  ok: boolean;
  reason?: string;
}

const { cases } = JSON.parse(
  readFileSync(new URL("../../data/testcases.json", import.meta.url), "utf8"),
) as { cases: Case[] };

describe("shared testcases", () => {
  it.each(cases.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    const guard = createGuard({ ...c.options, profile: c.profile });
    const result = guard.check(c.input);
    expect(result.ok).toBe(c.ok);
    if (!c.ok) expect(result).toEqual({ ok: false, reason: c.reason });
  });
});
