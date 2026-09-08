/* Ortak preview verisi — 67 bileşenin hepsi buradan besleniyor ki kartlar arasında
   aynı insanlar, aynı mekânlar, aynı UUID'ler görünsün.

   NEDEN AYRI DOSYA: `travel[]`in her bacağındaki `participantId` ve TravelInfo.labels
   AYNI anahtarları kullanmak zorunda; ikisi ayrı ayrı yazıldığında satır etiketi/nokta harfi
   sessizce `t("travel.friend")` ("Arkadaşın") fallback'ine düşüyordu (ilk senkron dersi, NOTES).

   DİKKAT: converter preview'ı YALNIZ `previews/<BileşenAdı>.tsx` olarak arar
   (lib/emit.mjs:443), bu yüzden bu dosya bir bileşen sanılmaz. Ama `sourceKeyFor`
   da yalnız `<Name>.tsx`'i hash'ler — bu dosyayı değiştirmek NOT karta bağlı grade'leri
   düşürmez. Burada veri değiştirirsen ilgili bileşenleri elle yeniden çek/derecelendir. */

/** `@bumpinto/shared` preview bundle'ında çözülmüyor (yalnız frontend/web/node_modules'te);
    union'lar bu yüzden yerelde yeniden yazıldı — tek kullanıcıları bu fixture'lar. */
type Mode = "WALK" | "BIKE" | "EBIKE" | "TRANSIT" | "CAR";

export const SELF = "5b0e2a4c-3f77-4a19-9d21-0f6c8a1e5d33";
export const ELIF = "c41d9b6e-2a08-4f5b-8e72-1b93d4a7c610";
export const DENIZ = "a72f3c15-9d4e-4b60-b1a8-7e05f2c9d844";
export const SELIN = "e08b41d7-6c2a-4f39-95b0-72da8e1c4b06";

/* ---- katılımcılar ---------------------------------------------------- */

/** Buluşmayı kuran; rozet önceliği "Kuran"da. */
export const MEHMET = {
  id: SELF,
  displayName: "Mehmet",
  host: true,
  hasLocation: true,
  locationLabel: "Moda",
  travelMode: "TRANSIT" as Mode,
  midpointMinutes: 18,
  online: true,
};

/** Konumunu atmış, hazır. */
export const ELIF_P = {
  id: ELIF,
  displayName: "Elif",
  host: false,
  hasLocation: true,
  locationLabel: "Beşiktaş",
  travelMode: "CAR" as Mode,
  midpointMinutes: 12,
  online: true,
};

/** Henüz konum göndermemiş — soluk avatar + amber "Bekliyor". */
export const DENIZ_P = {
  id: DENIZ,
  displayName: "Deniz",
  host: false,
  hasLocation: false,
  online: true,
};

/** Çevrimdışı: satır soluklaşır, alt satıra tek kelime eklenir (rozet DEĞİŞMEZ). */
export const SELIN_P = {
  id: SELIN,
  displayName: "Selin",
  host: false,
  hasLocation: true,
  locationLabel: "Kadıköy",
  travelMode: "EBIKE" as Mode,
  midpointMinutes: 9,
  online: false,
};

export const ROSTER = [MEHMET, ELIF_P, DENIZ_P, SELIN_P];

/* ---- yol süreleri ---------------------------------------------------- */

/** TravelInfo — labels + selfId TEK nesne (lib/useTravelLabels.ts). */
export const TRAVEL = {
  labels: { [SELF]: "Sana", [ELIF]: "Elif", [DENIZ]: "Deniz" },
  selfId: SELF,
};

/** Çapalı oturum: `fairnessLine`in baş cümlesi (`RangeBar`/`TravelBars`'ın `.rg-g` satırı)
    çizilmez, olgu (aralık + fark) kalır — mekânları kıyaslamak anlamsız. */
export const TRAVEL_ANCHORED = { ...TRAVEL, anchored: true };

/* ---- mekânlar -------------------------------------------------------- */
/* photoUrl bilerek boş: repoda yerel görsel yok, dış URL sandbox'ta yüklenmez —
   kartlar ambient gradyan + monogram dalını gösterir (ilk senkron dersi). */

export const MODA = {
  id: "1f0a7c22-5b64-4d18-9a3e-8c2f61d70b45",
  name: "Moda Sahil",
  lat: 40.9793,
  lng: 29.0264,
  rating: 4.6,
  ratingCount: 1240,
  priceLevel: 2,
  mapsUrl: "https://maps.google.com/?q=Moda+Sahil",
  deckOrder: 0,
  category: "Sahil",
  locality: "Kadıköy",
  activityType: "WALK" as const,
  hoursToday: "08:00 – 18:00",
  travel: [
    { participantId: SELF, minutes: 28 },
    { participantId: ELIF, minutes: 34 },
    { participantId: DENIZ, minutes: 21 },
  ],
};

export const KARAKOY = {
  id: "72c9d3f8-1e45-4a90-b6c1-3d08e5f24a77",
  name: "Karaköy Lokantası",
  lat: 41.0234,
  lng: 28.9773,
  rating: 4.8,
  ratingCount: 3180,
  priceLevel: 3,
  mapsUrl: "https://maps.google.com/?q=Karak%C3%B6y+Lokantas%C4%B1",
  deckOrder: 1,
  category: "Lokanta",
  locality: "Karaköy",
  hoursToday: "12:00 – 23:00",
  activityType: "FOOD" as const,
  tagline: "Sakin, oturmalı, iyi filtre kahve",
  travel: [
    { participantId: SELF, minutes: 19 },
    { participantId: ELIF, minutes: 22 },
    { participantId: DENIZ, minutes: 26 },
  ],
};

export const BEBEK = {
  id: "9d4b1e07-8f23-4c56-a0d9-45e7b2c31f68",
  name: "Bebek Kahve",
  lat: 41.0776,
  lng: 29.0435,
  rating: 4.4,
  ratingCount: 860,
  priceLevel: 2,
  deckOrder: 2,
  category: "Kahveci",
  locality: "Bebek",
  activityType: "COFFEE" as const,
  travel: [
    { participantId: SELF, minutes: 41 },
    { participantId: ELIF, minutes: 26 },
    { participantId: DENIZ, minutes: 33 },
  ],
};

export const BALAT = {
  id: "3a5e8c91-7b26-4d03-9f14-6c82a0e5b7d9",
  name: "Balat Kahvesi",
  lat: 41.0297,
  lng: 28.9486,
  rating: 4.2,
  ratingCount: 410,
  priceLevel: 1,
  deckOrder: 3,
  category: "Kahveci",
  locality: "Balat",
  activityType: "COFFEE" as const,
  travel: [
    { participantId: SELF, minutes: 35 },
    { participantId: ELIF, minutes: 31 },
    { participantId: DENIZ, minutes: 17 },
  ],
};

export const DECK = [MODA, KARAKOY, BEBEK, BALAT];

/* ---- oturum ---------------------------------------------------------- */

/** Tek ilgi alanı — rozet şeridi tek öğe basar. */
export const ACTIVITIES_ONE = ["COFFEE"];
/** Karışık deste — kartlar kendi kategori rozetlerini basar (`mixedDeck`). */
export const ACTIVITIES_MIX = ["COFFEE", "FOOD", "WALK"];
