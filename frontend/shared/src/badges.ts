/* Rozetler İSTEMCİDE türer (spec karar 7): sunucu yalnız sayar. Sıra kazanım sırasıdır. */
export type BadgeId = "first_met" | "met_3" | "met_10" | "streak_3";
export type BadgeStats = { plansMet?: number; metStreakWeeks?: number };
type Stats = BadgeStats | undefined | null;

export type BadgeDef = {
  id: BadgeId;
  /** İlerleme sayacı: `of === "met"` → `plansMet`, `"streak"` → `metStreakWeeks`. */
  goal: number;
  of: "met" | "streak";
  earned: (s: BadgeStats) => boolean;
};

export const BADGES: readonly BadgeDef[] = [
  { id: "first_met", goal: 1, of: "met", earned: (s) => (s.plansMet ?? 0) >= 1 },
  { id: "met_3", goal: 3, of: "met", earned: (s) => (s.plansMet ?? 0) >= 3 },
  { id: "met_10", goal: 10, of: "met", earned: (s) => (s.plansMet ?? 0) >= 10 },
  { id: "streak_3", goal: 3, of: "streak", earned: (s) => (s.metStreakWeeks ?? 0) >= 3 },
];

export function badgesFor(stats: Stats): BadgeId[] {
  if (!stats) return [];
  return BADGES.filter((b) => b.earned(stats)).map((b) => b.id);
}

export function newBadges(before: readonly BadgeId[], after: readonly BadgeId[]): BadgeId[] {
  return after.filter((id) => !before.includes(id));
}
