/* Etkinlik alanlarının SAF verisi ve kuralları — web `lib/activity.ts` ve mobil `icons.ts`
   ikisi de buradan okur. İkon eşlemesi burada YOKTUR: web `@phosphor-icons/react`,
   mobil `phosphor-react-native` kullanır; glif adları aynı ama modüller farklı. */

export type ActivityGroup = "FOOD_DRINK" | "ACTIVE" | "CULTURE" | "FUN";

/** Artboard P3 sırası — "Yeme-içme · Hareket · Kültür · Eğlence". SIRA ANLAMLIDIR. */
export const ACTIVITY_GROUPS: Record<ActivityGroup, readonly string[]> = {
  FOOD_DRINK: ["COFFEE", "FOOD", "BAR"],
  ACTIVE: ["WALK", "HIKE", "SWIM", "FITNESS", "ADVENTURE"],
  CULTURE: ["CINEMA", "MUSEUM", "ART"],
  FUN: ["ACTIVITY", "GAMES", "THEME_PARK", "NIGHTLIFE"],
};

export const ACTIVITY_GROUP_ORDER = Object.keys(ACTIVITY_GROUPS) as ActivityGroup[];

/** Fotoğrafsız kart gradyanı gruba göre: pA/pB/pC/pD (DS §08). */
export const GROUP_TINT: Record<ActivityGroup, 0 | 1 | 2 | 3> = {
  FOOD_DRINK: 0,
  ACTIVE: 1,
  CULTURE: 2,
  FUN: 3,
};

export function groupOf(activity: string): ActivityGroup {
  return ACTIVITY_GROUP_ORDER.find((g) => ACTIVITY_GROUPS[g].includes(activity)) ?? "FOOD_DRINK";
}

/** SessionView.activityTypes — alan yoksa BOŞ dizi. Tekil yardımcı eksikte `COFFEE`
    varsayardı; çoklu seçimde bu uydurma bir rozet çizerdi. */
export function sessionActivities(view: { activityTypes?: string[] }): string[] {
  return view.activityTypes ?? [];
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
    Düz `toLowerCase()` — locale duyarlı dönüşüm sabit "tr" ile çağrılırsa "I" harfini "ı"ya
    çevirir (İ/ı tuzağı); sağlayıcı kategorileri çoğunlukla İngilizce/Hollandaca, anahtar
    kelime kümesi ASCII küçük harf — eşleşme yalnız locale-bağımsız küçük harfle güvenilir. */
export function fitsActivity(activity: string, category: string | undefined): boolean {
  const set = EXPECTED_CATEGORIES[activity];
  if (!set || !category) return true;
  const c = category.toLowerCase();
  return set.some((k) => c.includes(k));
}
