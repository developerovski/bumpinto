import {
  canSubmit,
  emptyDraft,
  isActivityLocked,
  toCreateRequest,
  toggleActivity,
  type Activity,
  type DraftPoint,
  type NewSessionDraft,
  type Schemas,
  type SessionType,
  type TravelMode,
  type VenueMode,
} from "@bumpinto/shared";
import { create } from "zustand";

/**
 * "Yeni buluşma" taslağı (P3/P4).
 *
 * K-M8: kuralların TAMAMI `@bumpinto/shared` `newSession.ts`'te saf fonksiyondur; burada
 * yalnız durum tutulur ve o fonksiyonlar bağlanır. Yeni bir doğrulama gerekirse shared'a
 * eklenir — bu dosyaya `if` yazılmaz.
 */
export { MAX_ACTIVITIES } from "@bumpinto/shared";

type NewSessionState = NewSessionDraft & {
  setSessionType: (t: SessionType) => void;
  setVenueMode: (m: VenueMode) => void;
  toggleActivity: (a: Activity) => void;
  isActivityLocked: (a: Activity) => boolean;
  setName: (n: string) => void;
  setOrigin: (p: DraftPoint | null) => void;
  setAnchor: (p: DraftPoint | null) => void;
  setTravelMode: (m: TravelMode) => void;
  canSubmit: () => boolean;
  toRequest: (displayName: string) => Schemas["CreateSessionRequest"];
};

export const useNewSessionStore = create<NewSessionState>((set, get) => ({
  ...emptyDraft(),

  setSessionType: (sessionType) => set({ sessionType }),
  /* Moddan çıkınca çapa DA düşer: ekranda görünmeyen bir çapanın istekte kalması
     "orta nokta seçtim ama Eindhoven geldi" demek olurdu (web ile aynı kural). */
  setVenueMode: (venueMode) =>
    set(venueMode === "MIDPOINT" ? { venueMode, anchor: null } : { venueMode }),
  setName: (name) => set({ name }),
  setOrigin: (origin) => set({ origin }),
  setAnchor: (anchor) => set({ anchor }),
  setTravelMode: (travelMode) => set({ travelMode }),

  toggleActivity: (a) => set((s) => ({ activityTypes: toggleActivity(s.activityTypes, a) })),
  isActivityLocked: (a) => isActivityLocked(get().activityTypes, a),
  canSubmit: () => canSubmit(get()),
  toRequest: (displayName) => toCreateRequest(get(), displayName),
}));
