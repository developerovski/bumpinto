import type { SessionView } from "@bumpinto/shared";
import { AxiosError } from "axios";
import { create } from "zustand";
import { api } from "../lib/api";

/** Katılan kişinin kendi bilgisi — SessionView'de "ben" alanı yok.
    Yalnız bellekte: sayfa yenilenince kaybolur (W2 onay kartı alt satırsız kalır). */
export type Self = { id?: string; name: string; locationLabel: string | null };

type SessionState = {
  slug: string;
  view: SessionView | null;
  needsJoin: boolean;
  error: string | null;
  self: Self | null;
  bind: (slug: string) => void;
  setSelf: (self: Self) => void;
  refresh: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  slug: "",
  view: null,
  needsJoin: false,
  error: null,
  self: null,

  bind: (slug) => set({ slug, view: null, needsJoin: false, error: null, self: null }),

  setSelf: (self) => set({ self }),

  refresh: async () => {
    const { slug } = get();
    if (!slug) return;
    try {
      const view = await api.getSession(slug);
      set({ view, needsJoin: false, error: null });
    } catch (e) {
      const status = e instanceof AxiosError ? e.response?.status : undefined;
      if (status === 401) set({ needsJoin: true, view: null });
      else if (status === 404) set({ error: "Bu oturum bulunamadı — link doğru mu?" });
      // diğer hatalar: mevcut görünümü koru, polling tekrar dener
    }
  },
}));
