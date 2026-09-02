import { Bank, Barbell, BeerStein, BowlingBall, Coffee, Compass, FilmSlate, ForkKnife, GameController, MoonStars, Mountains, Palette, PersonSimpleWalk, SwimmingPool, Ticket, type Icon } from "@phosphor-icons/react";

export type ActivityGroup = "FOOD_DRINK" | "ACTIVE" | "CULTURE" | "FUN";

export const ACTIVITY_GROUPS: Record<ActivityGroup, string[]> = {
  FOOD_DRINK: ["COFFEE", "FOOD", "BAR"],
  ACTIVE: ["WALK", "HIKE", "SWIM", "FITNESS", "ADVENTURE"],
  CULTURE: ["CINEMA", "MUSEUM", "ART"],
  FUN: ["ACTIVITY", "GAMES", "THEME_PARK", "NIGHTLIFE"],
};

export const ACTIVITY_ICONS: Record<string, Icon> = {
  COFFEE: Coffee, FOOD: ForkKnife, BAR: BeerStein, WALK: PersonSimpleWalk, HIKE: Mountains, SWIM: SwimmingPool, FITNESS: Barbell, ADVENTURE: Compass, CINEMA: FilmSlate, MUSEUM: Bank, ART: Palette, ACTIVITY: BowlingBall, GAMES: GameController, THEME_PARK: Ticket, NIGHTLIFE: MoonStars,
};

/** Fotoğrafsız kart gradyanı gruba göre: pA/pB/pC/pD (DS §08). */
export const GROUP_TINT: Record<ActivityGroup, 0 | 1 | 2 | 3> = { FOOD_DRINK: 0, ACTIVE: 1, CULTURE: 2, FUN: 3 };

export function groupOf(activity: string): ActivityGroup {
  return (Object.keys(ACTIVITY_GROUPS) as ActivityGroup[]).find((g) => ACTIVITY_GROUPS[g].includes(activity)) ?? "FOOD_DRINK";
}

/** SessionView.activityType — eksikse varsayılan COFFEE. */
export function sessionActivity(view: { activityType?: string }): string {
  return view.activityType ?? "COFFEE";
}
