import {
  canSubmit,
  emptyDraft,
  isActivityLocked,
  openPlanError,
  toCreateRequest,
  toggleActivity,
  type Activity,
  type DraftPoint,
  type NewSessionDraft,
  type OpenPlanDraft,
  type OpenPlanErrorKey,
  type Schemas,
  type SessionType,
  type TravelMode,
  type VenueMode,
} from "@bumpinto/shared";
import { create } from "zustand";

/**
 * "Yeni buluşma" taslağı (P3/P4) + açık plan alanları (M-11/M-12, Keşfet POC P3/P3a).
 *
 * K-M8: kuralların TAMAMI `@bumpinto/shared` `newSession.ts` / `openPlan.ts`'te saf
 * fonksiyondur; burada yalnız durum tutulur ve o fonksiyonlar bağlanır. Yeni bir doğrulama
 * gerekirse shared'a eklenir — bu dosyaya doğrulama yazılmaz. Setter'lardaki tek dallar ALAN
 * SIFIRLAMASIDIR (hangi alan birlikte düşer), kural değil.
 */
export { MAX_ACTIVITIES } from "@bumpinto/shared";

type NewSessionState = NewSessionDraft & {
  setSessionType: (t: SessionType) => void;
  setVenueMode: (m: VenueMode) => void;
  toggleActivity: (a: Activity) => void;
  /** Keşfet'ten "X planı aç" ile gelindi: seçim o tek türe iner. */
  selectActivity: (a: Activity) => void;
  isActivityLocked: (a: Activity) => boolean;
  setName: (n: string) => void;
  setOrigin: (p: DraftPoint | null) => void;
  setAnchor: (p: DraftPoint | null) => void;
  setTravelMode: (m: TravelMode) => void;
  setPlan: (patch: Partial<OpenPlanDraft>) => void;
  /** i18n hata anahtarı ya da null — o anki saatle (tarih ekran açıkken geçmişe düşebilir). */
  planError: () => OpenPlanErrorKey | null;
  canSubmit: () => boolean;
  /** Geçersiz planda FIRLATIR (`Error.message` = i18n anahtarı): bayat bir tarih sessizce gizli
      oturuma dönüşmesin. Çağıran yakalar ve anahtarı gösterir. */
  toRequest: (displayName: string) => Schemas["CreateSessionRequest"];
  /** Boş taslak. Depo globaldir: taze açılışta çağrılmazsa önceki Şimdi/OPEN/Herkes taslağı
      "Yeni buluşma" formuna taşınır. */
  reset: () => void;
};

export const useNewSessionStore = create<NewSessionState>((set, get) => ({
  ...emptyDraft(),

  /* SOLO'nun davet linki yok → açık plan olamaz. Değişmez SETTER'da: gövdede GROUP'a zorlamak
     (shared) Bireysel arayüzünü ekranda bırakırdı (web store ile aynı). */
  setSessionType: (sessionType) =>
    set((s) =>
      sessionType === "SOLO"
        ? { sessionType, plan: { ...s.plan, when: "UNSET", joinPolicy: null } }
        : { sessionType },
    ),
  /* Moddan çıkınca çapa DA düşer: ekranda görünmeyen bir çapanın istekte kalması
     "orta nokta seçtim ama Eindhoven geldi" demek olurdu (web ile aynı kural). */
  setVenueMode: (venueMode) =>
    set(venueMode === "MIDPOINT" ? { venueMode, anchor: null } : { venueMode }),
  setName: (name) => set({ name }),
  setOrigin: (origin) => set({ origin }),
  setAnchor: (anchor) => set({ anchor }),
  setTravelMode: (travelMode) => set({ travelMode }),

  toggleActivity: (a) => set((s) => ({ activityTypes: toggleActivity(s.activityTypes, a) })),
  selectActivity: (a) => set({ activityTypes: [a] }),
  isActivityLocked: (a) => isActivityLocked(get().activityTypes, a),

  /* Mod değişince joinPolicy null'a çekilir: varsayılan (NOW→OPEN, DATE→APPROVAL,
     `effectiveJoinPolicy`) yeniden devreye girer; host aynı patch'te politika verdiyse o kalır.
     Plan modu tür olarak GROUP'u getirir (SOLO değişmezinin öbür yüzü). */
  setPlan: (patch) =>
    set((s) => ({
      plan: {
        ...s.plan,
        ...("when" in patch && patch.when !== s.plan.when ? { joinPolicy: null } : {}),
        ...patch,
      },
      ...(patch.when && patch.when !== "UNSET" ? { sessionType: "GROUP" as const } : {}),
    })),
  planError: () => openPlanError(get().plan, new Date()),

  canSubmit: () => canSubmit(get(), new Date()),
  toRequest: (displayName) => toCreateRequest(get(), displayName, new Date()),
  reset: () => set(emptyDraft()),
}));
