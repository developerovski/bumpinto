import type { SeatRequestListResponse } from "@bumpinto/shared";
import { create } from "zustand";
import { api } from "../lib/api";
import { apiErrorCode } from "../lib/apiError";
import { useToastStore } from "./toastStore";

type State = {
  /** Listenin AİT OLDUĞU plan — başka planın isteyenleri (ad, not) bu planda basılmaz. */
  slug: string | null;
  list: SeatRequestListResponse | null;
  /** İşlenen isteğin id'si — çift tıklamayı kilitler. */
  busy: string | null;
  /** Planı kesinleştiren (yeter sayıyı geçiren) onayın id'si — "kesinleşti!" damgası YALNIZ o satırda. */
  confirmedBy: string | null;
  load: (slug: string) => Promise<void>;
  approve: (slug: string, requestId: string) => Promise<void>;
  decline: (slug: string, requestId: string) => Promise<void>;
  reset: () => void;
};

export const useSeatRequestsStore = create<State>((set, get) => {
  /** Onay/ret yanıtı TAM listeyi döner — ikinci GET yok. 409 gövdeleri düz metin (sunucu sözleşmesi). */
  async function decide(slug: string, requestId: string, call: () => Promise<SeatRequestListResponse>) {
    if (get().busy) return;
    set({ busy: requestId });
    const wasConfirmed = get().list?.confirmed === true;
    try {
      const list = await call();
      if (get().slug !== slug) return; // yanıt gelene dek başka plana geçildi
      set({ list, ...(!wasConfirmed && list.confirmed ? { confirmedBy: requestId } : {}) });
    } catch (e) {
      const code = apiErrorCode(e);
      if (code === "already decided") void get().load(slug);
      else useToastStore.getState().push(code === "plan full" ? "seat.errFull" : "seat.errRequest", undefined, "flame");
    } finally {
      set({ busy: null });
    }
  }

  return {
    slug: null,
    list: null,
    busy: null,
    confirmedBy: null,
    load: async (slug) => {
      if (get().slug !== slug) set({ slug, list: null, busy: null, confirmedBy: null });
      try {
        const list = await api.seatRequests(slug);
        if (get().slug === slug) set({ list });
      } catch {
        // host değil / plan kapandı / ağ: mevcut listeyi koru — WS zili ya da yeniden mount tazeler
      }
    },
    approve: (slug, requestId) => decide(slug, requestId, () => api.approveSeat(slug, requestId)),
    decline: (slug, requestId) => decide(slug, requestId, () => api.declineSeat(slug, requestId)),
    reset: () => set({ slug: null, list: null, busy: null, confirmedBy: null }),
  };
});
