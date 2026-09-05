import { PastSessionRow } from "@bumpinto/web";

/* Gerçek ebeveyni PastSessionList — kart köşesiz, tam kart genişliğinde bir satır.
   PastSessionList kendi `bg-card`/`rounded-card` çerçevesini veriyor; satırı burada
   aynı çerçeveye koyuyoruz ki gerçek bağlamındaki gibi görünsün. */
const CARD = {
  width: "27.75rem",
  background: "var(--color-card)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-sh1)",
  border: "1px solid var(--color-line)",
  padding: "0.125rem 0",
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

/* ÜRÜN KUSURU (bkz. learnings/W2.md — kaynak düzeltmesi gerekiyor, preview'dan çözülemez):
   PastSessionRow, VenueCard'ı `photoOnly` ile 48×48'lik bir `h-12 w-12` kutuya koyuyor ama
   VenueCard'ın kök `div`ine `h-full` geçmiyor. VenueCard'ın foto kutusu `height:100%` yazıyor;
   bu, tanımsız (auto) yükseklikli bir ataya karşı çözülemiyor ve 0'a çöküyor. `photoOnly` ayrıca
   monogramı da bastırıyor (yalnız `!photoOnly` dalında basılı). Sonuç: kutu, VenueCard'ın kendi
   yorumunun yasakladığı türden çıplak bir "çizgili kutu"ya (yalnız `border-line` çerçevesi)
   düşüyor. DOĞRULANDI: bu, `photoUrl` eksikliğinden değil — yerel `data:` URI ile GERÇEKTEN
   yüklenen bir foto verildiğinde bile `<img>` playwright'ta ölçülen 0px yükseklikte kalıyor
   (üstteki `relative` foto kutusu 0 yükseklikte, mutlak konumlu `<img>`'in `inset-0`'ı da onu
   miras alıyor). Yani PastSessionRow'un GERÇEK ÜRÜNDEKİ HER satırı — fotoğraflı olsa bile —
   bu boş rozetle render oluyor; kaynakta düzeltilmeden preview'dan atlatılamaz. */

const decided: SessionRow = {
  slug: "moda-sahil-yuruyusu",
  name: "Moda sahil yürüyüşü",
  activityTypes: ["WALK"],
  decidedVenueName: "Moda Sahil",
  createdAt: "2026-08-30T16:00:00Z",
  participantCount: 4,
};

const expired: SessionRow = {
  slug: "besiktas-bar-gecesi",
  name: "Beşiktaş bar gecesi",
  activityTypes: ["BAR"],
  createdAt: "2026-08-24T20:00:00Z",
  participantCount: 3,
};

/** W1 · karar çıkmış geçmiş buluşma — yeşil "Gidildi" rozeti, tam opak, mekan adı başlıkta. */
export function Decided() {
  return (
    <div style={CARD}>
      <PastSessionRow row={decided} index={0} />
    </div>
  );
}

/** W1 · kararsız kapanmış (süresi dolmuş) buluşma — nötr "Doldu" rozeti, satır soluklaşır
    (`opacity-65`), alt satırda "karar çıkmadı". */
export function Expired() {
  return (
    <div style={CARD}>
      <PastSessionRow row={expired} index={1} />
    </div>
  );
}
