import type { SeatRequestListResponse } from "@bumpinto/shared";
import * as Haptics from "expo-haptics";
import { create } from "zustand";

import { api } from "../lib/api";
import { apiErrorCode } from "../lib/apiError";
import { onSessionEvent } from "./liveEvents";
import { useToastStore } from "./toastStore";

type State = {
  /** Listenin AİT OLDUĞU plan — başka planın isteyenleri (ad, not) bu planda basılmaz. */
  slug: string | null;
  list: SeatRequestListResponse | null;
  /** İşlenen isteğin id'si — çift dokunuşu kilitler. */
  busy: string | null;
  /** Planı kesinleştiren (yeter sayıyı geçiren) onayın id'si — "kesinleşti!" damgası YALNIZ o satırda. */
  confirmedBy: string | null;
  load: (slug: string) => Promise<void>;
  approve: (slug: string, requestId: string) => Promise<void>;
  decline: (slug: string, requestId: string) => Promise<void>;
  /**
   * `seat_requests_changed` zili (B-17, gövdesiz — kimlik sızmaz) oturumun TÜM koltuklu abonelerine
   * gider; liste ucu ise host'a özel ve HESAP kimliği ister (üye 403, hesapsız host 401 → çıkış
   * kesicisi). Kapıyı çağıran verir (`canFetch`): depo oturum/giriş depolarını içe aktarmaz.
   */
  listen: (slug: string, canFetch: () => boolean) => () => void;
  /** Hesaba bağlı: çıkışta sıfırlanır (`authStore`). */
  reset: () => void;
};

const empty = { slug: null, list: null, busy: null, confirmedBy: null };

/** Host'un katılım istekleri (M-11 M4, Keşfet POC P4) — web `seatRequestsStore` ile aynı şekil. */
export const useSeatRequestsStore = create<State>((set, get) => {
  /** Onay/ret yanıtı TAM listeyi döner — ikinci GET yok. 409 gövdeleri düz metin (`SeatRequests`). */
  async function decide(
    slug: string,
    requestId: string,
    call: () => Promise<SeatRequestListResponse>,
    approving: boolean,
  ) {
    if (get().busy) return;
    set({ busy: requestId });
    const wasConfirmed = get().list?.confirmed === true;
    try {
      const list = await call();
      if (get().slug !== slug) return; // yanıt gelene dek başka plana geçildi
      set({ list, ...(!wasConfirmed && list.confirmed ? { confirmedBy: requestId } : {}) });
      if (approving) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const code = apiErrorCode(e);
      // Başka cihazdan karar verilmiş: hata değil, liste bayat — sessizce tazelenir.
      if (code === "already decided") void get().load(slug);
      else {
        useToastStore
          .getState()
          .push(code === "plan full" ? "seat.errFull" : "seat.errRequest", undefined, "flame");
      }
    } finally {
      set({ busy: null });
    }
  }

  return {
    ...empty,

    load: async (slug) => {
      if (get().slug !== slug) set({ ...empty, slug });
      try {
        const list = await api.seatRequests(slug);
        if (get().slug === slug) set({ list });
      } catch {
        // host değil / plan kapandı / ağ: mevcut listeyi koru — zil ya da yeniden açılış tazeler
      }
    },

    approve: (slug, requestId) => decide(slug, requestId, () => api.approveSeat(slug, requestId), true),
    decline: (slug, requestId) => decide(slug, requestId, () => api.declineSeat(slug, requestId), false),

    listen: (slug, canFetch) =>
      onSessionEvent((event) => {
        if (event.type !== "seat_requests_changed" || !canFetch()) return;
        void get().load(slug);
      }),

    reset: () => set(empty),
  };
});
