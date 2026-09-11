import type { BadgeId } from "@bumpinto/shared";
import { Confetti, Fire, HandWaving, Medal, type Icon } from "@phosphor-icons/react";

/* Rozet → glif (Keşfet POC P6/P5b). Web'e özgü: phosphor web ve RN paketleri ayrı bileşen döner,
   eşleme her istemcide ayrı yaşar (travelMode ikonlarıyla aynı kural). */
export const BADGE_ICONS: Record<BadgeId, Icon> = {
  first_met: HandWaving,
  met_3: Confetti,
  met_10: Medal,
  streak_3: Fire,
};
