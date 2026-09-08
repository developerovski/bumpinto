import { describe, expect, it } from "vitest";

import type { SessionView } from "./api";
import { backupOf } from "./backupPlan";

const venue = (id: string) => ({ id, name: id });

describe("backupOf", () => {
  it("runoff ikincisini seçer, eşitlikte id sırasıyla kararlı", () => {
    const view = {
      venues: [venue("a"), venue("b"), venue("c")],
      voteTally: { a: 3, b: 1, c: 1 },
    } as unknown as SessionView;
    expect(backupOf(view, "a")?.id).toBe("b");
  });

  it("oy yoksa ≥2 beğeni ve ≥3 oy veren şartını arar", () => {
    const view = {
      venues: [venue("a"), venue("b")],
      likeCounts: { a: 3, b: 2 },
      participants: [],
    } as unknown as SessionView;
    expect(backupOf(view, "a")).toBeNull();
  });
});
