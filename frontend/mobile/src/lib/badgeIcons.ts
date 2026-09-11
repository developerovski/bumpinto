import type { BadgeId } from "@bumpinto/shared";
import { ConfettiIcon, FireIcon, HandWavingIcon, MedalIcon, type Icon } from "phosphor-react-native";

/* Rozet → glif (Keşfet POC P6/P5b). Web `lib/badgeIcons.ts` ile AYNI eşleme; phosphor web ve RN
   paketleri ayrı bileşen döndüğü için her istemcide ayrı yaşar (`icons.ts` ile aynı kural). */
export const BADGE_ICON: Record<BadgeId, Icon> = {
  first_met: HandWavingIcon,
  met_3: ConfettiIcon,
  met_10: MedalIcon,
  streak_3: FireIcon,
};
