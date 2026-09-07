import { Coffee, ForkKnife } from "@phosphor-icons/react";
import { Badge } from "@bumpinto/web";

/** Beş ton — üründe anlam taşırlar: grass = hazır, amber = bekliyor,
    flame = etkinlik türü (`ActivityBadge`), violet = ortak nokta, neutral = rol etiketi.
    Yol süresi artık `Badge` değil `RangeBar`/`TravelBars` basıyor — eski yol çipi bileşeni
    silindi (v3 notları). */
export function Tones() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="grass">Hazır</Badge>
      <Badge tone="amber">Bekliyor</Badge>
      <Badge tone="flame">
        <Coffee size={14} aria-hidden />
        Kahve
      </Badge>
      <Badge tone="violet">Ortak nokta</Badge>
      <Badge tone="neutral">Kuran</Badge>
    </div>
  );
}

/** W2 · katılımcı satırının sağ ucu — kuran rozeti + konum durumu. */
export function WaitingRow() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge tone="neutral">Kuran</Badge>
      <Badge tone="grass">Hazır</Badge>
      <Badge tone="amber">Bekliyor</Badge>
    </div>
  );
}

/** Karışık deste — mekan kartı kendi etkinlik rozetini basar (`ActivityBadge`: ikon + çevrilmiş
    etiket, tone="flame"). `molecules/ActivityBadge.tsx` barrel'da olmadığı için burada aynı
    deseni (ikon + `Badge`) elle kuruyoruz. */
export function ActivityCell() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge tone="flame">
        <ForkKnife size={14} aria-hidden />
        Yemek
      </Badge>
      <Badge tone="flame">
        <Coffee size={14} aria-hidden />
        Kahve
      </Badge>
    </div>
  );
}
