/* "Yeni buluşma" formunun KURALLARI — K-M8: store'un kendisi taşınmaz, içindeki doğrulama ve
   türetme mantığı saf fonksiyon olarak burada yaşar; zustand sarmalayıcı ince kalır.

   Sözleşme (`CreateSessionRequest`) tek yerden doldurulur: iki istemci de aynı gövdeyi üretir,
   alan adı ya da bayrak semantiği ayrışamaz. */
import type { Schemas } from "./api";
import { DEFAULT_TRAVEL_MODE, type TravelMode } from "./travelMode";

export type Activity = Schemas["CreateSessionRequest"]["activityTypes"][number];
export type SessionType = NonNullable<Schemas["CreateSessionRequest"]["sessionType"]>;
export type VenueMode = "MIDPOINT" | "ANCHOR";

/** Kurulum sırasında tutulan nokta — sunucuya gitmeden önce etiketiyle birlikte. */
export type DraftPoint = { lat: number; lng: number; label?: string };

/** Deste 20 mekan taşır; 4 ilgi alanı her birine 5 kart bırakır — uzlaşma için çok ince. */
export const MAX_ACTIVITIES = 3;

export type NewSessionDraft = {
  sessionType: SessionType;
  venueMode: VenueMode;
  activityTypes: Activity[];
  name: string;
  /** Kuranın kendi konumu. Çapalı oturumda OPSİYONEL (P4: "İstersen; çapalı buluşmada zorunlu değil"). */
  origin: DraftPoint | null;
  /** Sabit buluşma yeri — yalnız `venueMode === "ANCHOR"` iken anlamlı. */
  anchor: DraftPoint | null;
  travelMode: TravelMode;
};

export function emptyDraft(): NewSessionDraft {
  return {
    sessionType: "GROUP",
    venueMode: "MIDPOINT",
    activityTypes: [],
    name: "",
    origin: null,
    anchor: null,
    travelMode: DEFAULT_TRAVEL_MODE,
  };
}

/** Seçili alanı kapatır, değilse sınır dolmadıysa ekler. Sınır TEK yerde: chip `disabled`
    olsa bile son sözü bu fonksiyon söyler. */
export function toggleActivity(list: readonly Activity[], activity: Activity): Activity[] {
  if (list.includes(activity)) return list.filter((a) => a !== activity);
  return list.length >= MAX_ACTIVITIES ? [...list] : [...list, activity];
}

/** Seçili DEĞİL ve sınır dolu — chip'in `disabled` görüneceği durum. */
export function isActivityLocked(list: readonly Activity[], activity: Activity): boolean {
  return !list.includes(activity) && list.length >= MAX_ACTIVITIES;
}

/**
 * Kurulabilir mi? En az bir etkinlik ŞART; konum şartı moda göre değişir:
 * çapalıda çapa, orta noktalıda kuranın kendi konumu (merkez ondan türer).
 */
export function canSubmit(draft: NewSessionDraft): boolean {
  if (draft.activityTypes.length === 0) return false;
  return draft.venueMode === "ANCHOR" ? draft.anchor != null : draft.origin != null;
}

/**
 * Sözleşme gövdesi. `originPresent` kuranın konum VERİP VERMEDİĞİNİ söyler — çapalı oturumda
 * `lat`/`lng` boş gelebilir ve sunucunun bunu "eksik veri" ile karıştırmaması gerekir.
 * `locationWhole`: kuran tam koordinat gönderdi (istemci yuvarlaması yapılmadı).
 */
export function toCreateRequest(
  draft: NewSessionDraft,
  displayName: string,
): Schemas["CreateSessionRequest"] {
  const anchored = draft.venueMode === "ANCHOR" && draft.anchor != null;
  return {
    displayName,
    activityTypes: [...draft.activityTypes],
    name: draft.name.trim() || undefined,
    sessionType: draft.sessionType,
    travelMode: draft.travelMode,
    lat: draft.origin?.lat,
    lng: draft.origin?.lng,
    locationLabel: draft.origin?.label,
    anchor: anchored
      ? { lat: draft.anchor!.lat, lng: draft.anchor!.lng, label: draft.anchor!.label }
      : undefined,
    originPresent: draft.origin != null,
    locationWhole: true,
  };
}
