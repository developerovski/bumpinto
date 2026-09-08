import type { DraftPoint } from "@bumpinto/shared";
import * as Location from "expo-location";
import { create } from "zustand";

import { api } from "../lib/api";
import { requestLocationWhenInUse } from "../lib/permissions";

/**
 * Kullanıcının KENDİ konumu — "Neredesin?" alanının tek kaynağı (Yeni buluşma ve Katıl).
 *
 * AÇILIŞTA HİÇBİR ŞEY İSTEMEZ. Sistem diyaloğu ya O3 ön-ekranındaki "Devam et"ten
 * (`app/(sheets)/location-consent.tsx` → `adopt`) ya da O6 kurtarmasındaki "Tekrar dene"den
 * (`request`) çıkar. İzin isteme kuralının kendisi `lib/permissions.ts`'te — `canAskAgain`
 * ön elemesi orada bilerek YAPILMIYOR (K-M22).
 *
 * Fazlar:
 * - `idle`    henüz sorulmadı
 * - `asking`  sistem diyaloğu ya da konum okuması sürüyor
 * - `granted` izin var ve nokta alındı
 * - `denied`  reddedildi ama tekrar sorulabilir → O6: Ayarlar + Tekrar dene
 * - `blocked` sistem BİR DAHA SORMAZ → O6: yalnız Ayarlar
 * - `manual`  kullanıcı adres yazmayı seçti (ya da yazdı) — izin hiç istenmedi
 * - `failed`  izin var ama konum okunamadı (kapalı GPS, iç mekân) — "izin yok" DEĞİL
 */
export type LocationPhase =
  | "idle"
  | "asking"
  | "granted"
  | "denied"
  | "blocked"
  | "manual"
  | "failed";

/** Ön-ekranın (O3) rota parametresiyle döndürdüğü sonuç. */
export type PrimerOutcome = "granted" | "denied" | "blocked" | "manual";

type LocationState = {
  phase: LocationPhase;
  point: DraftPoint | null;
  /** İzin İSTER, sonra konumu okur. O6 "Tekrar dene" ve ön-ekransız çağrılar için. */
  request: () => Promise<DraftPoint | null>;
  /** Ön-ekranın verdiği sonucu benimser — ikinci bir sistem diyaloğu AÇMAZ. */
  adopt: (outcome: PrimerOutcome) => Promise<DraftPoint | null>;
  /** Yazılan adresi backend geocode'uyla noktaya çevirir. Bulunamazsa null. */
  fromAddress: (query: string) => Promise<DraftPoint | null>;
  clear: () => void;
};

/** İzin verildikten SONRA konumu oku + etiketini al. Ters geocode BACKEND üzerinden
    (OSMF mobil trafik politikası — gereksinim dok. §3); başarısızsa nokta etiketsiz kalır,
    çünkü koordinat zaten yeterli ve kullanıcıyı akıştan atmak gerekmiyor. */
async function locate(): Promise<DraftPoint | null> {
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const label = (
      await api
        .reverseGeocode({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        .catch(() => null)
    )?.label;
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, label: label ?? undefined };
  } catch {
    return null;
  }
}

export const useLocationStore = create<LocationState>((set, get) => ({
  phase: "idle",
  point: null,

  async adopt(outcome) {
    if (outcome !== "granted") {
      set({ phase: outcome, point: null });
      return null;
    }
    set({ phase: "asking" });
    const point = await locate();
    // İzin verildi ama konum gelmedi: bu bir İZİN sorunu değil, ekran da öyle demeli.
    set(point ? { phase: "granted", point } : { phase: "failed", point: null });
    return point;
  },

  async request(): Promise<DraftPoint | null> {
    set({ phase: "asking" });
    return get().adopt(await requestLocationWhenInUse());
  },

  async fromAddress(query) {
    const q = query.trim();
    if (!q) return null;
    try {
      const found = await api.geocode({ query: q });
      const point = { lat: found.lat, lng: found.lng, label: found.label };
      set({ phase: "manual", point });
      return point;
    } catch {
      // Adres bulunamadı: faz DEĞİŞMEZ (kullanıcı hâlâ adres modunda), ekran hatayı yazar.
      return null;
    }
  },

  clear: () => set({ phase: "idle", point: null }),
}));
