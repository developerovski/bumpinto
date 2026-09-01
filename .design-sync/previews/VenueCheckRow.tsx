import type { ReactNode } from "react";
import { VenueCheckRow } from "@bumpinto/web";

/* Ürün kolonu: Page `max-w-[30rem]` + 1.125rem yatay boşluk → 27.75rem içerik.
   Çerçeve satır içi stille — önizleme sınıfları hızlı döngüde compile olmuyor. */
const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

function Col({ children }: { children: ReactNode }) {
  return <div style={COL}>{children}</div>;
}

const SELF = "5b0e2a4c-3f77-4a19-9d21-0f6c8a1e5d33";
const ELIF = "c41d9b6e-2a08-4f5b-8e72-1b93d4a7c610";
const LABELS = { [SELF]: "Sana", [ELIF]: "Elif" };

const MODA = {
  id: "1f0a7c22-5b64-4d18-9a3e-8c2f61d70b45",
  name: "Moda Sahil",
  rating: 4.6,
  priceLevel: 2,
  deckOrder: 0,
  travelMinutes: { [SELF]: 28, [ELIF]: 34 },
};

const KARAKOY = {
  id: "72c9d3f8-1e45-4a90-b6c1-3d08e5f24a77",
  name: "Karaköy Lokantası",
  rating: 4.8,
  priceLevel: 3,
  deckOrder: 1,
  travelMinutes: { [SELF]: 19, [ELIF]: 22 },
};

const BEBEK = {
  id: "9d4b1e07-8f23-4c56-a0d9-45e7b2c31f68",
  name: "Bebek Kahve",
  rating: 4.4,
  priceLevel: 2,
  deckOrder: 2,
  travelMinutes: { [SELF]: 41, [ELIF]: 26 },
};

const BALAT = {
  id: "3a86f5b1-0c79-4e2d-8b41-6f9a07d5c2e3",
  name: "Balat Kahvesi",
  rating: 4.5,
  priceLevel: 1,
  deckOrder: 3,
  travelMinutes: { [SELF]: 33, [ELIF]: 24 },
};

/** W3 liste modu · beğenilmemiş satır — kutu boş, kart 120px fotoğraf yüksekliğinde. */
export function Unchecked() {
  return (
    <Col>
      <VenueCheckRow venue={BEBEK} checked={false} onChange={() => {}} travelLabels={LABELS} />
    </Col>
  );
}

/** Beğenilmiş satır — kutu `accent-flame-deep` ile marka kırmızısında işaretli. */
export function Checked() {
  return (
    <Col>
      <VenueCheckRow venue={MODA} checked onChange={() => {}} travelLabels={LABELS} />
    </Col>
  );
}

/** "Hangisi olsun?" listesi — DeckScreen'in `listMode` gövdesi: satırlar Page'in
    15px kolon boşluğuyla art arda, işaretli ve işaretsiz karışık. */
export function ListMode() {
  return (
    <Col>
      <div className="flex flex-col gap-[0.9375rem]">
        <VenueCheckRow venue={KARAKOY} checked onChange={() => {}} travelLabels={LABELS} />
        <VenueCheckRow venue={BALAT} checked={false} onChange={() => {}} travelLabels={LABELS} />
      </div>
    </Col>
  );
}
