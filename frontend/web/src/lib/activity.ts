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

/** Deste 20 mekân taşır; 4 ilgi alanı her birine 5 kart bırakır — uzlaşma için çok ince. */
export const MAX_ACTIVITIES = 3;

/** SessionView.activityTypes — alan yoksa BOŞ dizi. Eski tekil yardımcı eksikte `COFFEE`
    varsayıyordu; çoklu seçimde bu uydurma bir rozet çizerdi. */
export function sessionActivities(view: { activityTypes?: string[] }): string[] {
  return view.activityTypes ?? [];
}

/** Cümle içine giren alan adları: `Intl.ListFormat` bağlacı locale'den alır (tr "ve",
    nl "en", en Oxford). Elle birleştirme üç dilden ikisinde yanlış olurdu. */
export function activityListLabel(
  activities: string[],
  t: (key: string) => string,
  locale: string,
): string {
  const labels = activities.map((a) => t(`activity.${a}`));
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(labels);
}

/* Karar dokümanı §4.6 — "uyum satırı" için aktivite başına beklenen sağlayıcı kategorileri.
   Küçük harfe indirgenmiş, kısmi eşleşme (includes) ile bakılır: sağlayıcı taksonomileri
   ("Coffee Shop", "Café", "Espresso Bar") tam eşleşmez. Küme YOKSA uyarı basılmaz. */
const EXPECTED_CATEGORIES: Partial<Record<string, string[]>> = {
  COFFEE: ["coffee", "café", "cafe", "espresso", "koffie", "kahve", "tea", "roaster"],
  FOOD: ["restaurant", "eetcafé", "bistro", "diner", "eatery", "lokanta", "pizzeria", "steakhouse"],
  BAR: ["bar", "pub", "brewery", "wine", "cocktail", "brouwerij", "meyhane"],
  WALK: ["park", "trail", "garden", "promenade", "forest", "bos", "natuur"],
  HIKE: ["trail", "nature", "forest", "hill", "reserve", "natuur"],
  SWIM: ["pool", "swim", "beach", "zwembad", "strand"],
  FITNESS: ["gym", "fitness", "sport", "climbing", "yoga"],
  ADVENTURE: ["adventure", "climbing", "karting", "paintball", "escape"],
  CINEMA: ["cinema", "movie", "theater", "bioscoop"],
  MUSEUM: ["museum", "gallery", "exhibition"],
  ART: ["gallery", "art", "atelier", "kunst"],
  ACTIVITY: ["bowling", "billiard", "arcade", "mini golf", "pool hall"],
  GAMES: ["board game", "arcade", "game", "spellen"],
  THEME_PARK: ["theme park", "amusement", "attractiepark", "pretpark"],
  NIGHTLIFE: ["club", "nightclub", "live music", "discotheek"],
};

/** Kategori aktivitenin beklenen kümesinde mi? Küme tanımsızsa "bilinmiyor" = true (uyarı yok).
    Düz `toLowerCase()` — locale duyarlı büyük/küçük harf dönüşümü sabit "tr" ile çağrılırsa
    "I" harfini "ı"ya çevirir (İ/ı tuzağı); sağlayıcı kategorileri çoğunlukla İngilizce/Hollandaca,
    anahtar kelime kümesi ASCII küçük harf — eşleşme yalnız locale-bağımsız küçük harfle güvenilir. */
export function fitsActivity(activity: string, category: string | undefined): boolean {
  const set = EXPECTED_CATEGORIES[activity];
  if (!set || !category) return true;
  const c = category.toLowerCase();
  return set.some((k) => c.includes(k));
}
