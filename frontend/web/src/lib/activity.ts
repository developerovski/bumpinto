import { Bank, Barbell, BeerStein, BowlingBall, Coffee, Compass, FilmSlate, ForkKnife, GameController, MoonStars, Mountains, Palette, PersonSimpleWalk, SwimmingPool, Ticket, type Icon } from "@phosphor-icons/react";

/* Shim: grup verisi, ton eşlemesi, uyum kuralı ve alan listesi `@bumpinto/shared`'ta (mobil de
   AYNI kaynağı okur — M-7'de taşındı). Burada yalnız web'e özgü ikon eşlemesi kalır:
   `@phosphor-icons/react` bileşenleri RN'de yüklenemez. */
export {
  ACTIVITY_GROUPS,
  ACTIVITY_GROUP_ORDER,
  GROUP_TINT,
  /** Deste 20 mekân taşır; 4 ilgi alanı her birine 5 kart bırakır — uzlaşma için çok ince. */
  MAX_ACTIVITIES,
  fitsActivity,
  groupOf,
  sessionActivities,
  type ActivityGroup,
} from "@bumpinto/shared";

/** Cümle içine giren alan adları: `Intl.ListFormat` bağlacı locale'den alır (tr "ve",
    nl "en", en Oxford). Elle birleştirme üç dilden ikisinde yanlış olurdu. */
export { activityListLabel } from "@bumpinto/shared";

export const ACTIVITY_ICONS: Record<string, Icon> = {
  COFFEE: Coffee, FOOD: ForkKnife, BAR: BeerStein, WALK: PersonSimpleWalk, HIKE: Mountains, SWIM: SwimmingPool, FITNESS: Barbell, ADVENTURE: Compass, CINEMA: FilmSlate, MUSEUM: Bank, ART: Palette, ACTIVITY: BowlingBall, GAMES: GameController, THEME_PARK: Ticket, NIGHTLIFE: MoonStars,
};
