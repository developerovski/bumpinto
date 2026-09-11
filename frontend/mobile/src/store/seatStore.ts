import type { Schemas } from "@bumpinto/shared";
import { create } from "zustand";

import { api, rememberParticipantToken } from "../lib/api";
import { apiErrorCode, statusOf } from "../lib/apiError";

/** `closed` = plan kapandı (süresi doldu / karar verildi) — istek artık atılamaz. */
export type Seat = "loading" | "none" | "PENDING" | "APPROVED" | "DECLINED" | "closed";

type State = {
  /** Durumun AİT OLDUĞU plan: başka planın "onaylı"sı bu planda yönlendirme yapmasın. */
  slug: string | null;
  seat: Seat;
  busy: boolean;
  /** i18n ANAHTARI. */
  error: string | null;
  check: (slug: string) => Promise<void>;
  request: (slug: string, body: Schemas["SeatRequestInput"]) => Promise<void>;
  reset: () => void;
};

const initial = {
  slug: null as string | null,
  seat: "loading" as Seat,
  busy: false,
  error: null as string | null,
};

/**
 * Açık plana koltuk isteği (M-11 M3, K-B37: açık planda koltuk YALNIZ buradan).
 *
 * Kimlik HESAP jetonudur; çağıran anonimde bu uçlara GİTMEZ (401 → yenileme kesicisi → çıkış).
 * Katılımcı jetonu: onaylı koltukta `mine` yanıtının gövdesinde gelir (mobilde çerez yok) ve
 * `join`deki gibi saklamak ÇAĞIRANIN işidir — burada saklanır. Gelmezse oturum ekranının
 * onarımı (K-M39) hesap koltuğundan alır.
 */
export const useSeatStore = create<State>((set, get) => {
  const bind = (slug: string) => {
    if (get().slug !== slug) set({ ...initial, slug });
  };
  const current = (slug: string) => get().slug === slug;

  async function rememberToken(slug: string) {
    try {
      const r = await api.mySeat(slug);
      if (r.participantToken) rememberParticipantToken(slug, r.participantToken);
    } catch {
      // jeton yoksa oturum ekranının onarımı hesap koltuğundan alır
    }
  }

  return {
    ...initial,

    check: async (slug) => {
      bind(slug);
      try {
        const r = await api.mySeat(slug);
        if (!current(slug)) return;
        if (r.status === "APPROVED" && r.participantToken) {
          rememberParticipantToken(slug, r.participantToken);
        }
        set({ seat: r.status ?? "none" });
      } catch (e) {
        if (!current(slug)) return;
        const code = statusOf(e);
        // 404 = henüz istek yok; 409 = plan kapandı. Diğer hatalar (ağ, 5xx) DURUMU DEĞİŞTİRMEZ:
        // bekleyen istek "yok" sayılsaydı yoklama durur ve onay hiç fark edilmezdi (WS bekleyene kapalı).
        set((s) => ({
          seat: code === 404 ? "none" : code === 409 ? "closed" : s.seat === "loading" ? "none" : s.seat,
        }));
      }
    },

    request: async (slug, body) => {
      bind(slug);
      if (get().busy) return;
      set({ busy: true, error: null });
      try {
        const r = await api.requestSeat(slug, body);
        if (!current(slug)) return;
        if (r.status === "APPROVED") {
          // OPEN plan koltuğu anında verir ama bu yanıt jeton TAŞIMAZ — `mine` gövdesinden alınır.
          await rememberToken(slug);
          if (current(slug)) set({ seat: "APPROVED" });
        } else {
          set({ seat: r.status === "DECLINED" ? "DECLINED" : "PENDING" });
        }
      } catch (e) {
        if (!current(slug)) return;
        // 409 gövdeleri DÜZ METİN (`SeatRequests`); yalnız "plan full" dolu demektir.
        const code = apiErrorCode(e);
        if (code === "already requested") await get().check(slug);
        else if (code === "plan is closed") set({ seat: "closed" });
        // Host kendi planını açtı: koltuğu zaten var — oturum ekranı onu hesabından tanır.
        else if (code === "host cannot request own plan") set({ seat: "APPROVED" });
        else set({ error: code === "plan full" ? "seat.errFull" : "seat.errRequest" });
      } finally {
        if (current(slug)) set({ busy: false });
      }
    },

    reset: () => set(initial),
  };
});
