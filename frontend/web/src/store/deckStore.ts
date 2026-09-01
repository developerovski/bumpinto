import { create } from "zustand";
import { api } from "../lib/api";

/** Deste etkileşimi — HTTP çağrıları burada, bileşenlerde değil (mimari kural). */
type DeckState = {
  slug: string;
  index: number;
  liked: Record<string, boolean>;
  listMode: boolean;
  sending: boolean;
  start: (slug: string, venueCount: number) => void;
  decide: (venueId: string, like: boolean) => Promise<void>;
  setLike: (venueId: string, like: boolean) => Promise<void>;
  undo: (venueId: string) => Promise<void>;
  setListMode: (on: boolean) => void;
  finish: () => Promise<void>;
};

export const useDeckStore = create<DeckState>((set, get) => ({
  slug: "",
  index: 0,
  liked: {},
  listMode: false,
  sending: false,

  start: (slug, venueCount) => {
    if (get().slug === slug) return; // yeniden mount'ta ilerlemeyi koru
    set({ slug, index: 0, liked: {}, listMode: venueCount < 6 }); // az sonuç → liste (spec §4)
  },

  decide: async (venueId, like) => {
    set((s) => ({ index: s.index + 1, liked: { ...s.liked, [venueId]: like } }));
    await api.swipe(get().slug, { venueId, liked: like });
  },

  setLike: async (venueId, like) => {
    set((s) => ({ liked: { ...s.liked, [venueId]: like } }));
    await api.swipe(get().slug, { venueId, liked: like });
  },

  undo: async (venueId) => {
    set((s) => {
      const liked = { ...s.liked };
      delete liked[venueId];
      return { index: Math.max(0, s.index - 1), liked };
    });
    await api.undoSwipe(get().slug, venueId);
  },

  setListMode: (on) => set({ listMode: on }),

  finish: async () => {
    set({ sending: true });
    try {
      await api.deckDone(get().slug);
    } finally {
      set({ sending: false });
    }
  },
}));
