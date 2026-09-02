import type { ParticipantDto, Schemas, SessionPreview, SessionView } from "@bumpinto/shared";
import { AxiosError } from "axios";
import { create } from "zustand";
import { api } from "../lib/api";

/** Sunucunun "sen kimsin" yanıtı — SessionView.viewer.participantId ile eşleşen katılımcı. */
export function viewerOf(view: SessionView | null): ParticipantDto | null {
  const id = view?.viewer?.participantId;
  if (!id) return null;
  return view?.participants?.find((p) => p.id === id) ?? null;
}

type SessionState = {
  slug: string;
  view: SessionView | null;
  needsJoin: boolean;
  /** i18n anahtarı (ör. "session.notFound") — metne SessionPage'de çevrilir. */
  error: string | null;
  /** Katılmadan önce herkese açık özet (id/koordinat yok) — Katıl ekranının sağ kartı. */
  preview: SessionPreview | null;
  bind: (slug: string) => void;
  refresh: () => Promise<void>;
  loadPreview: () => Promise<void>;
  join: (body: Schemas["JoinRequest"]) => Promise<void>;
  updateLocation: (body: Schemas["LocationRequest"]) => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  slug: "",
  view: null,
  needsJoin: false,
  error: null,
  preview: null,

  bind: (slug) => set({ slug, view: null, needsJoin: false, error: null, preview: null }),

  loadPreview: async () => {
    const { slug } = get();
    if (!slug) return;
    try {
      const preview = await api.preview(slug);
      set({ preview });
    } catch {
      // önizleme olmadan da katılım formu çalışır — sessiz düş
    }
  },

  refresh: async () => {
    const { slug } = get();
    if (!slug) return;
    try {
      const view = await api.getSession(slug);
      set({ view, needsJoin: false, error: null });
    } catch (e) {
      const status = e instanceof AxiosError ? e.response?.status : undefined;
      if (status === 401) {
        set({ needsJoin: true, view: null });
        if (!get().preview) void get().loadPreview();
      } else if (status === 404) set({ error: "session.notFound" });
      // diğer hatalar: mevcut görünümü koru, polling tekrar dener
    }
  },

  join: async (body) => {
    const { slug } = get();
    await api.join(slug, body);
    await get().refresh();
  },

  updateLocation: async (body) => {
    const { slug } = get();
    await api.updateLocation(slug, body);
    await get().refresh();
  },
}));
