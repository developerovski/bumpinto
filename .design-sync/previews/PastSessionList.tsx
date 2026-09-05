import { PastSessionList } from "@bumpinto/web";

/* Ürün kolonu: Page `max-w-[30rem]` + 1.125rem yatay boşluk → 27.75rem içerik.
   SessionsPage'de TwoZone sağ bölgede, `Overline`'ın altında tam bu genişlikte. */
const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

/* `@bumpinto/shared` preview bundle'ında çözülmüyor (yalnız frontend/web/node_modules'te) —
   SessionSummaryDto'nun ihtiyacımız olan alanları burada yerelde yeniden yazıldı
   (bkz. _fixtures.ts'teki aynı gerekçe). */
type ActivityType = "COFFEE" | "FOOD" | "BAR" | "WALK" | "ACTIVITY" | "SWIM" | "HIKE" | "FITNESS" | "CINEMA" | "MUSEUM" | "ART" | "NIGHTLIFE" | "THEME_PARK" | "ADVENTURE" | "GAMES";
type SessionRow = {
  slug?: string;
  name?: string;
  activityTypes?: ActivityType[];
  createdAt?: string;
  participantCount?: number;
  decidedVenueName?: string;
  decidedVenuePhotoUrl?: string;
};

/** Dört satır: iki karar çıkmış (farklı tarih/mekan), iki süresi dolmuş kararsız —
    gerçek `SessionsPage` "Geçmiş buluşmalar" listesinin karışık hâli. */
const rows: SessionRow[] = [
  {
    slug: "moda-sahil-yuruyusu",
    name: "Moda sahil yürüyüşü",
    activityTypes: ["WALK"],
    decidedVenueName: "Moda Sahil",
    createdAt: "2026-08-30T16:00:00Z",
    participantCount: 4,
  },
  {
    slug: "karakoy-lokantasi-aksam",
    name: "Karaköy akşam yemeği",
    activityTypes: ["FOOD"],
    decidedVenueName: "Karaköy Lokantası",
    createdAt: "2026-08-22T19:00:00Z",
    participantCount: 6,
  },
  {
    slug: "besiktas-bar-gecesi",
    name: "Beşiktaş bar gecesi",
    activityTypes: ["BAR"],
    createdAt: "2026-08-24T20:00:00Z",
    participantCount: 3,
  },
  {
    slug: "bebek-kahve-molasi",
    name: "Bebek kahve molası",
    activityTypes: ["COFFEE"],
    createdAt: "2026-08-11T10:00:00Z",
    participantCount: 2,
  },
];

/** W1 · geçmiş buluşmalar kartı — satırlar arası ince ayraç, karar çıkmış (yeşil "Gidildi")
    ve kararsız kapanmış (nötr "Doldu", soluk) satırlar bir arada, tarihe göre yeni-eski. */
export function Mixed() {
  return (
    <div style={COL}>
      <PastSessionList rows={rows} />
    </div>
  );
}

/** W1 · yalnız bir geçmiş buluşma — `i > 0` ayraç koşulu düşer, kart tek satırla kapanır. */
export function SingleRow() {
  return (
    <div style={COL}>
      <PastSessionList rows={[rows[0]]} />
    </div>
  );
}
