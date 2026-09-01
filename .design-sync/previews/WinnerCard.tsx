import type { ReactNode } from "react";
import { WinnerCard } from "@bumpinto/web";

/* W4 sayfa kabuğu: Page variant="result" — 27.75rem içerik, 14px kolon boşluğu.
   Üstteki boşluk çıkartmanın karttan taşan payı (-14px) içindir. Çerçeve satır içi
   stille: `.design-sync/previews` sınıfları hızlı döngüde compile olmuyor. */
const RESULT_COL = {
  display: "flex",
  flexDirection: "column",
  gap: "0.875rem",
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1.5rem 1rem 1rem",
} as const;

function ResultCol({ children }: { children: ReactNode }) {
  return <div style={RESULT_COL}>{children}</div>;
}

const SELF = "5b0e2a4c-3f77-4a19-9d21-0f6c8a1e5d33";
const ELIF = "c41d9b6e-2a08-4f5b-8e72-1b93d4a7c610";
const DENIZ = "a72f3c15-9d4e-4b60-b1a8-7e05f2c9d844";

/** W4 · karar bloğu: "Ortak nokta" üst başlığı, son sözcüğü vurgulu ad,
    "Karar verildi!" çıkartmalı eğik kart ve yol tarifi bağlantısı.
    Metinlerin tamamı i18n'den (`result.*`) gelir; props yalnız veri taşır. */
export function Winner() {
  return (
    <ResultCol>
      <WinnerCard
        venue={{
          id: "1f0a7c22-5b64-4d18-9a3e-8c2f61d70b45",
          name: "Moda Sahil",
          lat: 40.9793,
          lng: 29.0264,
          rating: 4.6,
          priceLevel: 2,
          mapsUrl: "https://maps.google.com/?q=Moda+Sahil",
          deckOrder: 0,
          travelMinutes: { [SELF]: 28, [ELIF]: 34 },
        }}
        travelLabels={{ [SELF]: "Sana", [ELIF]: "Elif" }}
      />
    </ResultCol>
  );
}

/** Üç kişilik buluşma — yol süresi rozetleri satıra sığmayıp alt satıra sarıyor;
    farklı `deckOrder` kartın ambient gradyanını da değiştirir. */
export function ThreeFriends() {
  return (
    <ResultCol>
      <WinnerCard
        venue={{
          id: "72c9d3f8-1e45-4a90-b6c1-3d08e5f24a77",
          name: "Karaköy Lokantası",
          lat: 41.0234,
          lng: 28.9773,
          rating: 4.8,
          priceLevel: 3,
          mapsUrl: "https://maps.google.com/?q=Karak%C3%B6y+Lokantas%C4%B1",
          deckOrder: 1,
          travelMinutes: { [SELF]: 19, [ELIF]: 22, [DENIZ]: 37 },
        }}
        travelLabels={{ [SELF]: "Sana", [ELIF]: "Elif", [DENIZ]: "Deniz" }}
      />
    </ResultCol>
  );
}
