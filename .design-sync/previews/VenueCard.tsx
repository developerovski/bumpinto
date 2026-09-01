import type { ReactNode } from "react";
import { VenueCard } from "@bumpinto/web";

/* Ürün kolonu: Page `max-w-[30rem]` + 1.125rem yatay boşluk → 27.75rem içerik.
   Önizleme çerçevesi satır içi stille yazılır: `.design-sync/previews` sınıfları
   yalnız tam derlemede compile olur, hızlı döngüde (preview-rebuild) olmaz. */
const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

function Col({ children }: { children: ReactNode }) {
  return <div style={COL}>{children}</div>;
}

// travelMinutes katılımcı UUID'siyle anahtarlı; etiketler DeckScreen'deki eşlemenin aynısı.
const SELF = "5b0e2a4c-3f77-4a19-9d21-0f6c8a1e5d33";
const ELIF = "c41d9b6e-2a08-4f5b-8e72-1b93d4a7c610";
const LABELS = { [SELF]: "Sana", [ELIF]: "Elif" };

const MODA = {
  id: "1f0a7c22-5b64-4d18-9a3e-8c2f61d70b45",
  name: "Moda Sahil",
  lat: 40.9793,
  lng: 29.0264,
  rating: 4.6,
  priceLevel: 2,
  mapsUrl: "https://maps.google.com/?q=Moda+Sahil",
  deckOrder: 0,
  travelMinutes: { [SELF]: 28, [ELIF]: 34 },
};

const KARAKOY = {
  id: "72c9d3f8-1e45-4a90-b6c1-3d08e5f24a77",
  name: "Karaköy Lokantası",
  lat: 41.0234,
  lng: 28.9773,
  rating: 4.8,
  priceLevel: 3,
  mapsUrl: "https://maps.google.com/?q=Karak%C3%B6y+Lokantas%C4%B1",
  deckOrder: 1,
  travelMinutes: { [SELF]: 19, [ELIF]: 22 },
};

const BEBEK = {
  id: "9d4b1e07-8f23-4c56-a0d9-45e7b2c31f68",
  name: "Bebek Kahve",
  lat: 41.0776,
  lng: 29.0435,
  rating: 4.4,
  priceLevel: 2,
  deckOrder: 2,
  travelMinutes: { [SELF]: 41, [ELIF]: 26 },
};

/** W3 · destenin ön kartı: fotoğraf yoksa ambient gradyan + monogram,
    altında ★ / € satırı ve katılımcı başına yol süresi rozetleri. */
export function Polaroid() {
  return (
    <Col>
      <VenueCard venue={MODA} travelLabels={LABELS} />
    </Col>
  );
}

/** W4 · kazanan kartı çerçevesi: 150px fotoğraf, başlık sayfanın h1'inde
    olduğu için `hideTitle`, gövde boşluğu `md`. */
export function ResultCard() {
  return (
    <Col>
      <VenueCard
        venue={KARAKOY}
        photoHeight={150}
        hideTitle
        bodyGap="md"
        travelLabels={LABELS}
        className="transform-[rotate(-1.4deg)] shadow-sh2"
      />
    </Col>
  );
}

/** 07 Runoff · `variant="row"` — 74px eğik görsel, tek satır meta, seçim dairesi boş. */
export function RunoffRow() {
  return (
    <Col>
      <VenueCard venue={MODA} variant="row" travelLabels={LABELS} />
    </Col>
  );
}

/** 07 Runoff · seçili finalist: flame kenarlık + sh2 + gradyan dolgulu tikli daire.
    Ters eğim (`deckOrder` tek) ikinci kartın artboard'daki duruşu. */
export function RunoffRowSelected() {
  return (
    <Col>
      <VenueCard venue={KARAKOY} variant="row" selected travelLabels={LABELS} />
    </Col>
  );
}

/** W3 · deste yığını — sıradaki iki kart `photoOnly` (yalnız ambient gradyan alanı,
    metin yok), ön kart tam gövdeli. Konumlandırma ve eğimler VenueDeck'in
    `.a-deck > .a-pol` kuralının aynısı; `deckOrder` her karta ayrı gradyan verir. */
export function DeckStack() {
  return (
    <Col>
      <div className="relative h-[27.5rem] [&>*]:!absolute [&>*]:inset-x-0 [&>*]:mx-auto">
        <VenueCard
          venue={KARAKOY}
          photoOnly
          className="z-0 h-[24.375rem] opacity-45 transform-[rotate(-5deg)_translateY(1.25rem)_scale(0.94)]"
        />
        <VenueCard
          venue={BEBEK}
          photoOnly
          className="z-1 h-[25rem] opacity-75 shadow-sh1 transform-[rotate(2.6deg)_translateY(0.625rem)_scale(0.97)]"
        />
        <VenueCard
          venue={MODA}
          travelLabels={LABELS}
          className="z-2 transform-[rotate(-1.6deg)] shadow-sh2"
        />
      </div>
    </Col>
  );
}
