import { useEffect, useRef } from "react";
import { ProfilePrefs } from "@bumpinto/web";

/* `@bumpinto/shared` preview bundle'ında çözülmüyor (yalnız frontend/web/node_modules'te) —
   MeResponse'un ihtiyacımız olan alanları burada yerelde yeniden yazıldı
   (bkz. _fixtures.ts'teki aynı gerekçe / PastSessionRow.tsx aynı desen). */
type ActivityType = "COFFEE" | "FOOD" | "BAR" | "WALK" | "ACTIVITY" | "SWIM" | "HIKE" | "FITNESS" | "CINEMA" | "MUSEUM" | "ART" | "NIGHTLIFE" | "THEME_PARK" | "ADVENTURE" | "GAMES";
type TravelModeType = "WALK" | "BIKE" | "EBIKE" | "TRANSIT" | "CAR";
type MeResponse = {
  id?: string;
  email?: string;
  displayName?: string;
  defaultLocation?: { lat: number; lng: number; label?: string };
  defaultActivity?: ActivityType;
  language?: string;
  defaultTravelMode?: TravelModeType;
  stats?: { sessionsHosted?: number; friendsMet?: number };
};

const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

const NOOP = {
  onLanguage: async () => {},
  onLocation: async () => {},
  onActivity: async () => {},
  onTravelMode: async () => {},
};

/** Dört tercihi de doldurulmuş profil — Profil sayfasının gerçek `me` şekli. */
const ME_FULL: MeResponse = {
  id: "5b0e2a4c-3f77-4a19-9d21-0f6c8a1e5d33",
  email: "mehmet@gmail.com",
  displayName: "Mehmet",
  defaultLocation: { lat: 40.9793, lng: 29.0264, label: "Moda" },
  defaultActivity: "COFFEE",
  defaultTravelMode: "TRANSIT",
  language: "tr",
  stats: { sessionsHosted: 6, friendsMet: 14 },
};

/** Yeni hesap — hiçbir varsayılan ayarlanmamış; dört satır da "Seçilmedi"e düşer
    (dil hariç, o her zaman i18n'in geçerli diline döner). */
const ME_EMPTY: MeResponse = {
  id: "c41d9b6e-2a08-4f5b-8e72-1b93d4a7c610",
  email: "elif@gmail.com",
  displayName: "Elif",
  stats: { sessionsHosted: 0, friendsMet: 0 },
};

/** `open` PrefRow'un içinde yerel `useState` — dışarıdan prop değil. Gerçek paneli göstermek
    için sahte markup çizmek yerine satırın kendi `onToggle` düğmesine GERÇEKTEN tıklıyoruz
    (mount sonrası tek `useEffect`); bileşenin kendi state akışı çalışır, taklit yok. */
function ClickRow({ index }: { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelectorAll<HTMLButtonElement>("button[aria-expanded]")[index]?.click();
  }, [index]);
  return (
    <div ref={ref} style={COL}>
      <ProfilePrefs me={ME_FULL} {...NOOP} />
    </div>
  );
}

/** Varsayılan (kapalı) hâl — dört satır: konum, etkinlik (rozetli), ulaşım (rozetli), dil. */
export function Collapsed() {
  return (
    <div style={COL}>
      <ProfilePrefs me={ME_FULL} {...NOOP} />
    </div>
  );
}

/** Konum satırı açık — `LocationField` "granted" dalı + "Kaydet" butonu, panel gerçek
    tıklamayla açıldı. */
export function LocationPanelOpen() {
  return <ClickRow index={0} />;
}

/** Etkinlik satırı açık — `ActivityPicker` tekil seçim (max=1), Kahve zaten işaretli. */
export function ActivityPanelOpen() {
  return <ClickRow index={1} />;
}

/** Hiç tercih ayarlanmamış hesap — konum/etkinlik/ulaşım satırları "Seçilmedi"e düşer, rozet
    çıkmaz; dil satırı yalnız kaydedilmiş bir dil olmadığında bile i18n'in geçerli diline
    (Türkçe) döner, hiçbir zaman boş kalmaz. */
export function EmptyDefaults() {
  return (
    <div style={COL}>
      <ProfilePrefs me={ME_EMPTY} {...NOOP} />
    </div>
  );
}
