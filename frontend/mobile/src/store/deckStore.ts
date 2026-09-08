import type { VenueDto } from "@bumpinto/shared";
import * as Haptics from "expo-haptics";
import { create } from "zustand";

import { api } from "../lib/api";

/**
 * Deste etkileşimi — HTTP çağrıları burada, bileşenlerde değil (mimari kural).
 *
 * Kaydırma GEOMETRİSİ burada YOK: eşik/dönme/karar `@bumpinto/shared/swipeMath`tan gelir
 * (plan42 bağlayıcı kuralı — ikinci eşik tanımı yasak). Burada yalnız "hangi kart, ne oldu,
 * sunucuya ne yazıldı" yaşar.
 *
 * Kaydırma İYİMSER: kart hemen gider, yazma arkada koşar. Ağ hatasında kullanıcıyı kartın
 * üstünde bekletmek akışı öldürür; `useSessionLive` bir sonraki turda gerçeği geri getirir.
 * `send` İSTİSNADIR — hata YUTULMAZ, ekran `deck.errSend` gösterip yeniden denesin diye
 * yukarı fırlar (çift gönderim `sent` ile kapanır).
 */
export const useDeckStore = create<{
  slug: string | null;
  venues: VenueDto[];
  index: number;
  liked: string[];
  history: { venueId: string; liked: boolean }[];
  listMode: boolean;
  sending: boolean;
  sent: boolean;
  start: (slug: string, venues: VenueDto[]) => void;
  decide: (dir: "left" | "right") => Promise<void>;
  setLike: (venueId: string, liked: boolean) => Promise<void>;
  undo: () => Promise<void>;
  setListMode: (on: boolean) => void;
  send: () => Promise<void>;
}>((set, get) => ({
  slug: null,
  venues: [],
  index: 0,
  liked: [],
  history: [],
  listMode: false,
  sending: false,
  sent: false,

  /* Koşulsuz sıfırlar. Çağıran (DeckScreen) bunu slug + mekan KİMLİKLERİNE bağlı bir efektten
     çağırır; 3 sn'lik canlı sorgu aynı desteyi geri getirdiğinde efekt yeniden koşmaz ve
     ilerleme korunur. Kapıyı store'a koymak testte iki koşuyu birbirine bulaştırırdı. */
  start: (slug, venues) =>
    set({
      slug,
      venues,
      index: 0,
      liked: [],
      history: [],
      // Az sonuç → kaydırma yerine liste (spec §4): 6 kartın altında deste gösterişten ibaret.
      listMode: venues.length < 6,
      sending: false,
      sent: false,
    }),

  async decide(dir) {
    const { slug, venues, index } = get();
    const venue = venues[index];
    if (!slug || !venue?.id) return;

    const liked = dir === "right";
    void Haptics.impactAsync(
      liked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    );
    set((s) => ({
      index: s.index + 1,
      liked: liked ? [...s.liked, venue.id!] : s.liked,
      history: [...s.history, { venueId: venue.id!, liked }],
    }));
    await api.swipe(slug, { venueId: venue.id, liked }).catch(() => undefined);
  },

  /* Liste kipi (P16): kart sırası İLERLEMEZ, yalnız beğeni işareti döner. */
  async setLike(venueId, liked) {
    const { slug } = get();
    if (!slug) return;
    set((s) => ({
      liked: liked ? [...new Set([...s.liked, venueId])] : s.liked.filter((id) => id !== venueId),
    }));
    await api.swipe(slug, { venueId, liked }).catch(() => undefined);
  },

  async undo() {
    const { slug, history } = get();
    const last = history[history.length - 1];
    if (!slug || !last) return;

    set((s) => ({
      index: Math.max(0, s.index - 1),
      history: s.history.slice(0, -1),
      liked: s.liked.filter((id) => id !== last.venueId),
    }));
    await api.undoSwipe(slug, last.venueId).catch(() => undefined);
  },

  setListMode: (listMode) => set({ listMode }),

  /* Başarıda `sent` — düğme bir daha basılamaz (karar dok. §1: çift gönderim bulgusu). */
  async send() {
    const { slug, sending, sent } = get();
    if (!slug || sending || sent) return;
    set({ sending: true });
    try {
      await api.deckDone(slug);
      set({ sent: true });
    } finally {
      set({ sending: false });
    }
  },
}));
