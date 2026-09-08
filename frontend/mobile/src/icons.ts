import type { Schemas, TravelMode } from "@bumpinto/shared";
import {
  BankIcon,
  BarbellIcon,
  BeerSteinIcon,
  BicycleIcon,
  BowlingBallIcon,
  CarIcon,
  CoffeeIcon,
  CompassIcon,
  FilmSlateIcon,
  ForkKnifeIcon,
  GameControllerIcon,
  LightningIcon,
  MoonStarsIcon,
  MountainsIcon,
  PaletteIcon,
  PersonSimpleWalkIcon,
  SwimmingPoolIcon,
  TicketIcon,
  TrainIcon,
  type Icon,
} from "phosphor-react-native";

/**
 * Etkinlik ve ulaşım türü → Phosphor glifi eşlemesi (GUIDE "Ulaşım/Etkinlik ikonları").
 *
 * Not: `phosphor-react-native` 3'te eki olmayan adlar (`Coffee`) `@deprecated`;
 * kanonik adlar `*Icon` ekli olanlardır — glif aynıdır.
 */

type ActivityType = NonNullable<Schemas["SessionView"]["activityTypes"]>[number];

export const ACTIVITY_ICON: Record<ActivityType, Icon> = {
  COFFEE: CoffeeIcon,
  FOOD: ForkKnifeIcon,
  BAR: BeerSteinIcon,
  WALK: PersonSimpleWalkIcon,
  HIKE: MountainsIcon,
  SWIM: SwimmingPoolIcon,
  FITNESS: BarbellIcon,
  ADVENTURE: CompassIcon,
  CINEMA: FilmSlateIcon,
  MUSEUM: BankIcon,
  ART: PaletteIcon,
  ACTIVITY: BowlingBallIcon,
  GAMES: GameControllerIcon,
  THEME_PARK: TicketIcon,
  NIGHTLIFE: MoonStarsIcon,
};

/** EBIKE = Bicycle + Lightning(9px); çağıran sırayla basar (web `lib/travelMode.ts` ile aynı desen). */
export const MODE_ICON: Record<TravelMode, Icon[]> = {
  WALK: [PersonSimpleWalkIcon],
  BIKE: [BicycleIcon],
  EBIKE: [BicycleIcon, LightningIcon],
  TRANSIT: [TrainIcon],
  CAR: [CarIcon],
};
